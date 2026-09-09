import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import mediaRoutes from './routes/media.routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/media', mediaRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message || 'Internal Server Error' });
});

app.listen(ENV.PORT, () => {
  console.log(`OptiQueue API listening on http://localhost:${ENV.PORT}`);
});