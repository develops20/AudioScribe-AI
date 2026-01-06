import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const CHUNK_SIZE_MB = 15;
const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024;

/**
 * Uploads a single file/blob to Gemini and waits for it to be active.
 */
const uploadToGemini = async (fileOrBlob: File | Blob, displayName: string, mimeType: string, logCallback?: (msg: string) => void): Promise<{ mimeType: string; fileUri: string; name: string }> => {
  // Convert Blob to File if necessary (for the SDK)
  const fileToUpload = fileOrBlob instanceof File 
    ? fileOrBlob 
    : new File([fileOrBlob], displayName, { type: mimeType });

  const uploadResponse = await ai.files.upload({
    file: fileToUpload,
    config: { mimeType: mimeType, displayName: displayName }
  });

  const uploadedFile = (uploadResponse as any).file ?? uploadResponse;

  if (!uploadedFile || !uploadedFile.uri) {
    throw new Error(`Upload failed for ${displayName}`);
  }

  if (logCallback) logCallback(`Upload complete for ${displayName}. URI: ${uploadedFile.uri}`);

  // Polling
  let fileState = uploadedFile.state;
  let attempts = 0;
  while (fileState === 'PROCESSING' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const freshFile = await ai.files.get({ name: uploadedFile.name });
    const fileData = (freshFile as any).file ?? freshFile;
    fileState = fileData.state;
    attempts++;
  }

  if (fileState === 'FAILED') {
    throw new Error(`Processing failed for ${displayName} on Gemini servers.`);
  }

  return { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri, name: uploadedFile.name };
};

/**
 * Transcribes a single part of the media.
 */
const transcribeChunk = async (fileUri: string, mimeType: string, partIndex: number, totalParts: number, logCallback?: (msg: string) => void): Promise<string> => {
  const modelId = 'gemini-2.0-flash';
  
  if (logCallback) logCallback(`Transcribing part ${partIndex + 1} of ${totalParts}...`);

  const prompt = `
    You are a professional video transcriber. 
    This is part ${partIndex + 1} of ${totalParts} of a single audio file.
    Please generate a highly accurate transcript of the audio in this file.
    
    Format requirements:
    - Provide a clean, readable transcript.
    - Include timestamps like [MM:SS] relative to the start of THIS chunk.
    - Identify speakers (e.g., Speaker 1, Speaker 2) if discernible.
    - Do not include any introductory or concluding conversational filler. Just the transcript.
    - If the audio is silent or unintelligible, state that clearly.
    - Do NOT stop abruptly; if a sentence is cut off at the end, transcribe as much as you hear.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        { fileData: { mimeType: mimeType, fileUri: fileUri } },
        { text: prompt },
      ],
    },
    config: {
      temperature: 0.2,
    }
  });

  if (response.text) {
    if (logCallback) logCallback(`Transcription part ${partIndex + 1} done.`);
    return response.text;
  }
  
  throw new Error(`No transcript generated for part ${partIndex + 1}`);
};

/**
 * Main entry point for transcription.
 * Handles splitting large files and aggregating results.
 */
export const transcribeMedia = async (file: File, logCallback?: (msg: string) => void): Promise<string> => {
  try {
    const sizeMB = file.size / (1024 * 1024);
    const mimeType = file.type || 'audio/mp3';
    
    // Check if we need to chunk
    if (sizeMB > CHUNK_SIZE_MB) {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      if (logCallback) logCallback(`File is ${sizeMB.toFixed(2)}MB. Splitting into ${totalChunks} parts of ~${CHUNK_SIZE_MB}MB each.`);
      
      let fullTranscript = "";
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkName = `${file.name}_part_${i+1}`;
        
        if (logCallback) logCallback(`Processing part ${i + 1} of ${totalChunks}...`);
        
        // Upload
        const uploadResult = await uploadToGemini(chunkBlob, chunkName, mimeType, logCallback);
        
        // Transcribe
        const chunkTranscript = await transcribeChunk(uploadResult.fileUri, uploadResult.mimeType, i, totalChunks, logCallback);
        
        // Append with a separator if needed, or just newlines
        fullTranscript += (i > 0 ? "\n\n" : "") + `--- Part ${i + 1} ---\n` + chunkTranscript;
        
        // Cleanup (optional, but good for keeping storage clean if using many chunks)
        // await ai.files.delete({ name: uploadResult.name }); 
      }
      
      if (logCallback) logCallback("Transcript complete.");
      return fullTranscript;
      
    } else {
      // Small file, process as single
      if (logCallback) logCallback(`File is ${sizeMB.toFixed(2)}MB. Uploading single file...`);
      const uploadResult = await uploadToGemini(file, file.name, mimeType, logCallback);
      
      if (logCallback) logCallback("Transcribing single file...");
      const transcript = await transcribeChunk(uploadResult.fileUri, uploadResult.mimeType, 0, 1, logCallback);
      
      if (logCallback) logCallback("Transcript complete.");
      return transcript;
    }

  } catch (error: any) {
    console.error("Gemini Transcription Error:", error);
    if (error.message?.includes('404')) {
        throw new Error("API Error (404). Model not found or API endpoint issue.");
    }
    throw error;
  }
};