import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse, SupportedFormat } from '@optiqueue/shared';
import { transcodeMedia } from '@optiqueue/worker';

export const handleMediaUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or file rejected by validator.' });
    return;
  }

  const targetFormat = (req.body.targetFormat as SupportedFormat) || 'webp';
  const jobId = uuidv4();

  try{
    const result = await transcodeMedia(req.file.path, targetFormat);

    const response: UploadResponse = {
      jobId,
      originalFileName: req.file.originalname,
      fileSize: result.originalSize,
      status: 'QUEUED',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      message: 'File uploaded and transcoded successfully.',
      data: response,
      transcode : {
        outputPath: result.outputPath,
        transcodedSize: result.transcodedSize
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Transcode failed.' });
  }
};