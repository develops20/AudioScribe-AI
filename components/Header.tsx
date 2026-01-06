import React from 'react';
import { Youtube, FileAudio, Globe } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between py-6 border-b border-gray-800 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-600 rounded-lg shadow-lg shadow-red-900/20">
          <Youtube className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AudioScribe AI</h1>
          <p className="text-sm text-gray-400">Video / Audio to Text Converter</p>
        </div>
      </div>
      <div className="flex gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          <span>Web & Local Support</span>
        </div>
        <div className="flex items-center gap-2">
          <FileAudio className="w-4 h-4" />
          <span>Powered by Gemini 3.0</span>
        </div>
      </div>
    </header>
  );
};

export default Header;