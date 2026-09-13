import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse, SupportedFormat, TranscodeJobPayload } from '@optiqueue/shared';
import { mediaQueue } from '../queues/media.queue';
import { getJobById } from '../services/db.service';

export const handleMediaUpload = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or file rejected by validator.' });
    return;
  }

  const targetFormat = (req.body.targetFormat as SupportedFormat) || 'webp';
  const jobId = uuidv4();

  const payload: TranscodeJobPayload = {
    jobId,
    originalFileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    inputPath: req.file.path,
    targetFormat
  };

  try {
    await mediaQueue.add('transcode', payload, { jobId });

    const response: UploadResponse = {
      jobId,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      status: 'QUEUED',
      createdAt: new Date().toISOString()
    };

    res.status(202).json({
      message: 'File accepted and queued for processing.',
      data: response
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to enqueue processing job.' });
  }
};

export const getJobStatus = async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  try {
    const jobRecord = await getJobById(jobId);
    const queueJob = await mediaQueue.getJob(jobId);
    const progress = queueJob ? await queueJob.progress : 0;

    if (!jobRecord) {
      if (queueJob) {
        res.status(200).json({
          id: jobId,
          status: 'QUEUED',
          progress: typeof progress === 'number' ? progress : 0
        });
        return;
      }
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.status(200).json({
      ...jobRecord,
      progress: jobRecord.status === 'COMPLETED' ? 100 : (typeof progress === 'number' ? progress : 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching status' });
  }
};