import { Indexer } from './indexer';

// Use global to persist across HMR in development
const globalForIndexer = globalThis as unknown as { indexer: Indexer | undefined };

export function initIndexer(): Indexer {
    if (!globalForIndexer.indexer) {
        globalForIndexer.indexer = new Indexer();
    }
    return globalForIndexer.indexer;
}

export function getIndexer(): Indexer {
    if (!globalForIndexer.indexer) {
        globalForIndexer.indexer = new Indexer();
    }
    return globalForIndexer.indexer;
}
