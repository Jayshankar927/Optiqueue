export const QUEUE_NAME = 'media-transcode-queue';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4'
] as const;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;