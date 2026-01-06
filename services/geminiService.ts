import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string suitable for the Gemini API.
 */
const fileToInlineData = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      if (!base64Data) {
          reject(new Error("Failed to read file data"));
          return;
      }
      // Remove the data URL prefix (e.g., "data:audio/mp3;base64,")
      const base64Content = base64Data.split(',')[1];
      resolve({
        mimeType: file.type,
        data: base64Content,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Transcribes audio/video file using Gemini.
 * Automatically switches between Inline Data (fast, <20MB) and File API (slower, large files).
 */
export const transcribeMedia = async (file: File, logCallback?: (msg: string) => void): Promise<string> => {
  try {
    // Model Selection: gemini-2.0-flash is robust for audio/video tasks
    const modelId = 'gemini-2.0-flash'; 
    let contentPart: any;

    // Check file size (20MB limit for inline)
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB < 20) {
      if (logCallback) logCallback(`File is ${sizeMB.toFixed(2)}MB. Using fast inline processing.`);
      const inlineData = await fileToInlineData(file);
      contentPart = { inlineData: inlineData };
    } else {
      if (logCallback) logCallback(`File is ${sizeMB.toFixed(2)}MB (>20MB limit). Uploading to Gemini Storage...`);
      
      const mimeType = file.type || 'audio/mp3'; // Fallback if browser doesn't detect type

      // Upload using the File API
      const uploadResponse = await ai.files.upload({
        file: file,
        config: { mimeType: mimeType, displayName: file.name }
      });
      
      // Handle response structure variations (SDK version dependent)
      // Some versions return { file: ... }, others return the file object directly.
      const uploadedFile = (uploadResponse as any).file ?? uploadResponse;

      if (!uploadedFile || !uploadedFile.uri) {
        console.error("Upload Response Unexpected:", uploadResponse);
        throw new Error(`Upload to Gemini failed. Unexpected response structure: ${JSON.stringify(uploadResponse)}`);
      }

      if (logCallback) logCallback(`Upload complete. URI: ${uploadedFile.uri}`);
      
      // Polling for Active State
      let fileState = uploadedFile.state;
      let fileUri = uploadedFile.uri;
      const fileName = uploadedFile.name; // This is the ID, e.g. "files/..."
      
      let attempts = 0;
      while (fileState === 'PROCESSING' && attempts < 30) {
          if (logCallback) logCallback(`Processing file on server... State: ${fileState}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
             // Refresh file state
             const freshFile = await ai.files.get({ name: fileName });
             // Handle potential wrapping in get response too
             const fileData = (freshFile as any).file ?? freshFile;
             fileState = fileData.state;
          } catch (e) {
             console.warn("Polling error (ignoring transient):", e);
          }
          attempts++;
      }

      if (fileState === 'FAILED') {
          throw new Error("File processing failed on Gemini servers.");
      }
      
      if (logCallback) logCallback("File ready for processing.");

      contentPart = { 
        fileData: { 
          mimeType: uploadedFile.mimeType, 
          fileUri: fileUri 
        } 
      };
    }

    if (logCallback) logCallback("Sending request to Gemini 2.0 Flash...");

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          contentPart,
          {
            text: `
            You are a professional video transcriber. 
            Please generate a highly accurate transcript of the audio in this file.
            
            Format requirements:
            - Provide a clean, readable transcript.
            - Include timestamps like [MM:SS] at the start of every significant sentence or speaker change.
            - Identify speakers (e.g., Speaker 1, Speaker 2) if discernible.
            - Do not include any introductory or concluding conversational filler (like "Here is the transcript"). Just the transcript.
            - If the audio is silent or unintelligible, state that clearly.
            `
          },
        ],
      },
      config: {
        temperature: 0.2, // Low temperature for factual transcription
      }
    });

    if (response.text) {
        return response.text;
    }

    // Diagnostics if no text is returned
    let errorMsg = "No transcript generated.";
    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
             errorMsg += ` Finish Reason: ${candidate.finishReason}`;
        }
    }
    
    // Check if it was blocked
    if (response.promptFeedback && response.promptFeedback.blockReason) {
        errorMsg += ` Block Reason: ${response.promptFeedback.blockReason}`;
    }

    throw new Error(errorMsg);

  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    // Enhance error message for common issues
    if (error.message?.includes('404')) {
        throw new Error("API Error (404). Model not found or API endpoint issue. Trying switching models.");
    }
    throw error;
  }
};