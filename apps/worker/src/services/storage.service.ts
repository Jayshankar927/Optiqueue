import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

const s3Client = new S3Client({
  forcePathStyle: true,
  region: ENV.SUPABASE_S3_REGION,
  endpoint: ENV.SUPABASE_S3_ENDPOINT,
  credentials: {
    accessKeyId: ENV.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: ENV.SUPABASE_S3_SECRET_ACCESS_KEY
  }
});

const getMimeType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
};

export const uploadToStorage = async (
  filePath: string,
  destinationKey: string
): Promise<string> => {
  const fileStream = fs.createReadStream(filePath);
  const contentType = getMimeType(filePath);

  const command = new PutObjectCommand({
    Bucket: ENV.SUPABASE_STORAGE_BUCKET,
    Key: destinationKey,
    Body: fileStream,
    ContentType: contentType
  });

  await s3Client.send(command);

  return `${ENV.SUPABASE_PUBLIC_URL_PREFIX}/${destinationKey}`;
};