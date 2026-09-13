import { Pool } from 'pg';
import { ENV } from '../config/env';

const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export const getJobById = async (id: string) => {
  const query = `
    SELECT id, original_name, source_size, optimized_size, status, storage_url, created_at, updated_at
    FROM jobs
    WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};