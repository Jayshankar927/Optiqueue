export type SupportedFormat = 'webp' | 'mp4';

export type JobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface TranscodeJobPayload {
  jobId: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  inputPath: string;
  targetFormat: SupportedFormat;
}

export interface UploadResponse {
  jobId: string;
  originalFileName: string;
  fileSize: number;
  status: JobStatus;
  createdAt: string;
}