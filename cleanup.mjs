import pkg from 'pg';
const { Pool } = pkg;
import Redis from 'ioredis';

async function cleanup() {
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
        console.error('Missing DATABASE_URL or REDIS_URL in .env.local');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const redis = new Redis(process.env.REDIS_URL);

    try {
        console.log('Cleaning Postgres database...');
        // Drop all data from these tables, CASCADE ensures we clear dependent data
        // RESTART IDENTITY resets the auto-increment counters (BIGSERIAL/SERIAL)
        await pool.query('TRUNCATE TABLE markets, bets, price_snapshots, users, claims RESTART IDENTITY CASCADE;');
        console.log('Postgres tables truncated successfully.');

        console.log('Cleaning Redis cache...');
        await redis.flushall();
        console.log('Redis cache flushed successfully.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await pool.end();
        redis.disconnect();
    }
}

cleanup();
