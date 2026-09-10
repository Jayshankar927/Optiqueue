import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse, SupportedFormat } from '@optiqueue/shared';

export const handleMediaUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or file rejected by validator.' });
    return;
  }

  const targetFormat = (req.body.targetFormat as SupportedFormat) || 'webp';
  const jobId = uuidv4();

  const response: UploadResponse = {
    jobId,
    originalFileName: req.file.originalname,
    fileSize: req.file.size,
    status: 'QUEUED',
    createdAt: new Date().toISOString()
  };

  res.status(202).json({
    message: 'File accepted and queued for processing.',
    data: response,
    internalPath: req.file.path,
    targetFormat
  });
};