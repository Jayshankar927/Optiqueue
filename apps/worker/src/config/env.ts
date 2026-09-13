import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DATABASE_URL: process.env.DATABASE_URL || '',
  SUPABASE_S3_ENDPOINT: process.env.SUPABASE_S3_ENDPOINT || '',
  SUPABASE_S3_REGION: process.env.SUPABASE_S3_REGION || 'us-east-1',
  SUPABASE_S3_ACCESS_KEY_ID: process.env.SUPABASE_S3_ACCESS_KEY_ID || '',
  SUPABASE_S3_SECRET_ACCESS_KEY: process.env.SUPABASE_S3_SECRET_ACCESS_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'optiqueue-media',
  SUPABASE_PUBLIC_URL_PREFIX: process.env.SUPABASE_PUBLIC_URL_PREFIX || ''
};