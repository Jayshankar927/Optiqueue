import { Pool } from 'pg';
import { ENV } from '../config/env';

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
});

export const db = {
  createJob: async (id: string, originalName: string, sourceSize: number) => {
    const query = `
      INSERT INTO jobs (id, original_name, source_size, status)
      VALUES ($1, $2, $3, 'QUEUED')
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(query, [id, originalName, sourceSize]);
  },

  updateJobProcessing: async (id: string) => {
    const query = `
      UPDATE jobs
      SET status = 'PROCESSING', updated_at = NOW()
      WHERE id = $1;
    `;
    await pool.query(query, [id]);
  },

  updateJobCompleted: async (id: string, optimizedSize: number, storageUrl: string) => {
    const query = `
      UPDATE jobs
      SET status = 'COMPLETED', optimized_size = $2, storage_url = $3, updated_at = NOW()
      WHERE id = $1;
    `;
    await pool.query(query, [id, optimizedSize, storageUrl]);
  },

  updateJobFailed: async (id: string) => {
    const query = `
      UPDATE jobs
      SET status = 'FAILED', updated_at = NOW()
      WHERE id = $1;
    `;
    await pool.query(query, [id]);
  },

  close: async () => {
    await pool.end();
  }
};