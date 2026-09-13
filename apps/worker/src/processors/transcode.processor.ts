import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { SupportedFormat } from '@optiqueue/shared';

export interface TranscodeResult {
  outputPath: string;
  originalSize: number;
  transcodedSize: number;
}

export const transcodeMedia = (
  inputPath: string,
  targetFormat: SupportedFormat,
  onProgress?: (progress: number) => void
): Promise<TranscodeResult> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Source file does not exist: ${inputPath}`));
    }

    const outputDir = path.dirname(inputPath);
    const fileBaseName = path.basename(inputPath, path.extname(inputPath));
    const outputPath = path.join(outputDir, `${fileBaseName}.${targetFormat}`);

    const command = ffmpeg(inputPath);

    if (targetFormat === 'webp') {
      command
        .outputOptions([
          '-c:v libwebp',
          '-quality 80'
        ]);
    } else if (targetFormat === 'mp4') {
      command
        .outputOptions([
          '-c:v libx264',
          '-crf 28',
          '-preset veryfast',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ]);
    }

    command
      .output(outputPath)
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.round(progress.percent));
        }
      })
      .on('end', () => {
        const originalSize = fs.statSync(inputPath).size;
        const transcodedSize = fs.statSync(outputPath).size;
        resolve({
          outputPath,
          originalSize,
          transcodedSize
        });
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
};