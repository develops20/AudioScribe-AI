import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Upload, 
  AlertCircle, 
  FileVideo, 
  ArrowRight, 
  Youtube,
  RefreshCw,
  Music
} from 'lucide-react';

import Header from './components/Header';
import ProgressBar from './components/ProgressBar';
import TranscriptViewer from './components/TranscriptViewer';
import { transcribeMedia } from './services/geminiService';
import { AppState, VideoMetadata } from './types';

// Mock Subtitle Fetcher
const checkSubtitles = async (videoId: string): Promise<string | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // For demo purposes: random chance of finding subtitles or if ID contains 'sub'
  const randomChance = Math.random() > 0.7; 
  if (videoId.includes('sub') || randomChance) {
    return `[00:00] Speaker 1: This is a pre-existing subtitle track found for the video.
[00:05] Speaker 2: Since we found this, we don't need to use AI generation.
[00:10] Speaker 1: This saves resources and is instant.
[00:15] Speaker 2: However, if this were missing, we would proceed to the fallback method.`;
  }
  return null;
};

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [url, setUrl] = useState('');
  const [videoMeta, setVideoMeta] = useState<VideoMetadata | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Handle URL Submission
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = getYoutubeId(url);
    if (!id) {
      alert("Please enter a valid YouTube URL");
      return;
    }

    setAppState(AppState.CHECKING_SUBS);
    setStatusMessage("Scanning video metadata...");
    setLogs([]); // Clear logs on new search
    addLog(`Searching for video ID: ${id}`);
    setProgress(20);

    // Set basic metadata
    setVideoMeta({
      id,
      url,
      title: "YouTube Video " + id,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      hasSubtitles: false
    });

    try {
      addLog("Checking for official subtitles...");
      setStatusMessage("Checking for existing subtitles...");
      setProgress(40);
      const existingSubs = await checkSubtitles(id);

      if (existingSubs) {
        addLog("Official subtitles found.");
        setTranscript(existingSubs);
        setAppState(AppState.SUBS_FOUND);
        setProgress(100);
        setStatusMessage("Subtitles found!");
      } else {
        addLog("No official subtitles found.");
        setAppState(AppState.NO_SUBS);
        setStatusMessage("No subtitles found.");
        setProgress(50);
      }
    } catch (err) {
      console.error(err);
      addLog(`Error checking subtitles: ${err}`);
      setAppState(AppState.ERROR);
    }
  };

  // Handle File Upload (Fallback flow)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      addLog(`File selected: ${e.target.files[0].name} (${(e.target.files[0].size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  // Handle Direct File Upload (Main page flow)
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setLogs([]);
      addLog(`Direct file upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Set generic metadata for local file
      setVideoMeta({
        id: 'local-file',
        url: '',
        title: file.name,
        thumbnail: 'https://placehold.co/600x400/1f2937/4b5563?text=Audio+File', // Placeholder for local file
        hasSubtitles: false
      });
      
      setAppState(AppState.FILE_READY);
    }
  };

  // Start AI Processing
  const startAiProcessing = async () => {
    if (!uploadedFile) return;

    setAppState(AppState.PROCESSING_AUDIO);
    setStatusMessage("Preparing media for analysis...");
    setProgress(10);
    addLog("Starting extraction process...");

    // Simulate "Converting" phase 
    const conversionSteps = 3;
    for (let i = 1; i <= conversionSteps; i++) {
      await new Promise(r => setTimeout(r, 400));
      setProgress(10 + (i * 10)); 
      setStatusMessage("Analyzing file structure...");
    }
    
    setAppState(AppState.TRANSCRIBING);
    setStatusMessage("Gemini AI is generating transcript...");
    setProgress(40);
    addLog("Initiating Gemini AI processing...");

    // Artificial Progress Ticker for long waits
    const progressInterval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 95) return prev;
            return prev + 1;
        });
    }, 2000);

    try {
      // Pass addLog as a callback to receive real-time updates from the service
      const result = await transcribeMedia(uploadedFile, addLog);
      clearInterval(progressInterval);
      
      addLog("Response received from Gemini.");
      setTranscript(result);
      setAppState(AppState.COMPLETED);
      setProgress(100);
      setStatusMessage("Transcription complete!");
      addLog("Transcript generated successfully.");
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error(error);
      addLog(`ERROR: ${error.message || "Unknown error"}`);
      setAppState(AppState.ERROR);
      setStatusMessage("Error during transcription.");
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setTranscript('');
    setUrl('');
    setUploadedFile(null);
    setVideoMeta(null);
    setProgress(0);
    setLogs([]);
  };

  // Helper to determine filename for download
  const getDownloadFileName = () => {
    if (!videoMeta) return 'transcript';
    // If it's a local file, use the title (which contains the filename)
    if (videoMeta.id === 'local-file') return videoMeta.title;
    // If it's a YouTube video, use the ID
    return videoMeta.id;
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 selection:bg-red-900 selection:text-white pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />

        {/* --- IDLE STATE: URL INPUT --- */}
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-6 text-center">
              Get transcripts from any video.
            </h2>
            <p className="text-gray-400 mb-10 max-w-lg text-center text-lg">
              We check for official subtitles first. If none exist, we use Gemini AI to generate them for you.
            </p>
            
            <form onSubmit={handleUrlSubmit} className="w-full max-w-2xl relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none transition-all shadow-2xl text-lg placeholder:text-gray-600"
              />
              <button 
                type="submit"
                disabled={!url}
                className="absolute right-2 top-2 bottom-2 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transcribe
              </button>
            </form>

            {/* Direct Upload Option */}
            <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-md animate-in fade-in duration-1000 delay-200">
               <div className="flex items-center gap-3 w-full">
                  <div className="h-px bg-gray-800 flex-1"></div>
                  <span className="text-xs text-gray-500 uppercase font-medium tracking-wider">OR</span>
                  <div className="h-px bg-gray-800 flex-1"></div>
               </div>
               
               <input 
                  type="file" 
                  ref={directFileInputRef}
                  onChange={handleDirectFileUpload}
                  accept="video/*,audio/*"
                  className="hidden" 
               />
               <button 
                onClick={() => directFileInputRef.current?.click()}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group px-4 py-2 rounded-lg hover:bg-gray-900"
               >
                 <Upload className="w-4 h-4 group-hover:text-red-500 transition-colors" />
                 <span className="text-sm">Click here to upload your audio/video file directly</span>
               </button>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center w-full max-w-4xl">
              {[
                { icon: Search, title: "Smart Detection", desc: "Auto-detects existing captions" },
                { icon: FileVideo, title: "Video to Audio", desc: "Extracts audio stream instantly" },
                { icon: RefreshCw, title: "AI Generation", desc: "Gemini 2.0 creates missing subs" },
              ].map((item, i) => (
                <div key={i} className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800/50 hover:bg-gray-900 transition-colors">
                  <item.icon className="w-8 h-8 mx-auto mb-4 text-red-500" />
                  <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PROGRESS STATES (Checking / Found / Processing) --- */}
        {(appState === AppState.CHECKING_SUBS || appState === AppState.SUBS_FOUND || appState === AppState.COMPLETED || appState === AppState.ERROR || appState === AppState.FILE_READY || appState === AppState.PROCESSING_AUDIO || appState === AppState.TRANSCRIBING) && (
          <div className="animate-in fade-in duration-500">
            {videoMeta && (
              <div className="flex items-center gap-6 mb-8 p-4 bg-gray-900/30 rounded-xl border border-gray-800/50">
                <img 
                  src={videoMeta.thumbnail} 
                  alt="Thumbnail" 
                  className="w-32 h-24 object-cover rounded-lg shadow-md bg-gray-800"
                />
                <div>
                  <h3 className="text-lg font-medium text-white line-clamp-2">{videoMeta.title}</h3>
                  {videoMeta.url ? (
                    <a href={videoMeta.url} target="_blank" rel="noreferrer" className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 mt-1">
                      <Youtube className="w-3 h-3" /> Watch on YouTube
                    </a>
                  ) : (
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Music className="w-3 h-3" /> Local File
                    </div>
                  )}
                </div>
                <div className="ml-auto">
                   <button onClick={resetApp} className="text-sm text-gray-500 hover:text-white underline">Start Over</button>
                </div>
              </div>
            )}

            {/* ERROR STATE DISPLAY */}
             {appState === AppState.ERROR && (
                <div className="w-full max-w-2xl mx-auto mb-8 bg-red-950/30 border border-red-900/50 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <h3 className="font-semibold text-red-200">Transcription Failed</h3>
                    </div>
                    <p className="text-red-300/80 text-sm mb-4">
                        An error occurred during the process. Please check the logs below for details.
                    </p>
                    <button 
                        onClick={resetApp}
                        className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 text-sm rounded-lg border border-red-800 transition-colors"
                    >
                        Try Another Video
                    </button>
                </div>
            )}
            
            {/* FILE READY FOR DIRECT UPLOAD STATE */}
            {appState === AppState.FILE_READY && uploadedFile && (
               <div className="w-full max-w-2xl mx-auto mb-8 animate-in slide-in-from-bottom-4 fade-in">
                   <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
                             <FileVideo className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">Ready to Transcribe</h3>
                        <p className="text-gray-400 mb-6">
                            File selected: <span className="text-white font-mono bg-gray-800 px-2 py-1 rounded">{uploadedFile.name}</span>
                        </p>
                        <p className="text-xs text-gray-500 mb-8 max-w-sm mx-auto">
                            We will extract the audio from this file and use Gemini AI to generate a transcript. This may take a moment depending on file size.
                        </p>
                        <button 
                            onClick={startAiProcessing}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                            Start AI Transcription <ArrowRight className="w-5 h-5" />
                        </button>
                   </div>
               </div>
            )}

            {/* Show ProgressBar if checking, processing, OR if there was an error (so we can see logs) */}
            {(appState === AppState.CHECKING_SUBS || appState === AppState.PROCESSING_AUDIO || appState === AppState.TRANSCRIBING || appState === AppState.ERROR) && (
              <ProgressBar progress={progress} status={statusMessage} isComplete={false} logs={logs} />
            )}

            {(appState === AppState.SUBS_FOUND || appState === AppState.COMPLETED) && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="font-medium">Transcript Ready</span>
                  </div>
                </div>
                <TranscriptViewer transcript={transcript} fileName={getDownloadFileName()} />
              </>
            )}
          </div>
        )}


        {/* --- NO SUBS FOUND (FALLBACK TO UPLOAD) --- */}
        {(appState === AppState.NO_SUBS) && (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Only show upload UI if we are strictly in NO_SUBS state (waiting for user input) */}
              <>
                <div className="flex items-center gap-4 mb-8 opacity-75">
                    <img src={videoMeta?.thumbnail} alt="Thumb" className="w-16 h-12 object-cover rounded blur-[1px]" />
                    <span className="text-gray-400">Target Video: {videoMeta?.title}</span>
                </div>

                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 mb-8 flex gap-4">
                    <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                    <h3 className="font-semibold text-red-200 mb-1">No Subtitles Found</h3>
                    <p className="text-sm text-red-300/70 mb-4">
                        This video doesn't have open captions available via public API. 
                        To transcribe it, we need to process the file directly.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                        Note: Due to browser security restrictions, we cannot download YouTube videos automatically. 
                        Please use a tool like 4K Video Downloader or `yt-dlp`, then upload the file below.
                    </p>
                    </div>
                </div>

                <div className="bg-gray-900 border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center hover:border-gray-600 transition-colors group">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">Upload Video or Audio File</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Drag and drop your file here, or click to browse. Supports MP4, MP3, WAV, WebM.
                    </p>
                    
                    <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="video/*,audio/*"
                    className="hidden" 
                    />
                    
                    <div className="flex flex-col items-center gap-4">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                    >
                        Select File
                    </button>
                    {uploadedFile && (
                        <div className="flex items-center gap-3 bg-blue-900/20 text-blue-200 px-4 py-2 rounded-lg border border-blue-900/50 animate-in fade-in zoom-in duration-300">
                        <FileVideo className="w-4 h-4" />
                        <span className="text-sm font-medium">{uploadedFile.name}</span>
                        <span className="text-xs opacity-70">({(uploadedFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                    )}
                    </div>

                    {uploadedFile && (
                    <div className="mt-8 pt-8 border-t border-gray-800">
                        <button 
                        onClick={startAiProcessing}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                        >
                        Start AI Transcription <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                    )}
                </div>
              </>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;