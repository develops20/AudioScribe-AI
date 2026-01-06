import React, { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, Terminal } from 'lucide-react';

interface ProgressBarProps {
  progress: number;
  status: string;
  isComplete: boolean;
  logs?: string[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status, isComplete, logs = [] }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
      <div className="flex justify-between items-end mb-2">
        <span className="text-sm font-medium text-blue-400 flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {status}
        </span>
        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
      </div>
      
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mb-6">
        <div 
          className={`h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-500 ease-out ${isComplete ? 'w-full' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Log Console */}
      <div className="bg-black/50 rounded-lg border border-gray-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-800">
            <Terminal className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-mono text-gray-400">System Logs</span>
        </div>
        <div className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 && <span className="text-gray-600 italic">Waiting for processes...</span>}
            {logs.map((log, i) => (
                <div key={i} className="flex gap-2 text-gray-300 border-l-2 border-transparent hover:border-blue-500 pl-2 transition-colors">
                    <span className="text-blue-500/50 select-none">&gt;</span>
                    <span className={log.toLowerCase().includes('error') || log.toLowerCase().includes('fail') ? 'text-red-400' : ''}>
                        {log}
                    </span>
                </div>
            ))}
            <div ref={logsEndRef} />
        </div>
      </div>
      
      <p className="mt-4 text-xs text-center text-gray-500">
        {isComplete 
          ? "Process completed successfully" 
          : "Please keep this tab open while we process your video"}
      </p>
    </div>
  );
};

export default ProgressBar;