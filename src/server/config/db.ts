import { Pool } from 'pg';
import { env } from './env';

// Use a global variable to prevent multiple pool instances in dev (HMR)
const globalForDb = globalThis as unknown as { db: Pool | undefined };

export const db = globalForDb.db ?? new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
});

if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = db;
}

db.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
    const start = Date.now();
    const res = await db.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 80));
    }
    return res;
}
