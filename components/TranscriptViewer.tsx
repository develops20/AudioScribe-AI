import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: string;
  title?: string;
  fileName?: string;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ 
  transcript, 
  title = "Transcript", 
  fileName = "transcript" 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Remove timestamps (e.g., [00:00] or [00:00:00])
    const cleanTranscript = transcript.replace(/\[\d{1,2}:\d{2}(:\d{2})?\]\s*/g, '');
    
    const element = document.createElement("a");
    const file = new Blob([cleanTranscript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    
    // Ensure filename ends in .txt
    const safeFileName = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    element.download = safeFileName;
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col h-[600px] shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800/50 border-b border-gray-800">
        <h3 className="font-semibold text-white">{title}</h3>
        <div className="flex gap-2">
           <button 
            onClick={handleDownload}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Download .txt"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy Text"}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap">
        {transcript}
      </div>
    </div>
  );
};

export default TranscriptViewer;