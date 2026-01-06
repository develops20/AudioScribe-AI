export enum AppState {
  IDLE = 'IDLE',
  CHECKING_SUBS = 'CHECKING_SUBS',
  SUBS_FOUND = 'SUBS_FOUND',
  NO_SUBS = 'NO_SUBS',
  FILE_READY = 'FILE_READY',
  PROCESSING_AUDIO = 'PROCESSING_AUDIO',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface TranscriptSegment {
  timestamp: string;
  text: string;
  speaker?: string;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  hasSubtitles: boolean;
}

export interface ProcessStatus {
  step: string;
  progress: number; // 0 to 100
}