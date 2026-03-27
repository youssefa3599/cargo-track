// src/lib/services/vectordb.ts
import { Pinecone } from '@pinecone-database/pinecone';

let pineconeInstance: Pinecone | null = null;

/**
 * Singleton Pinecone client
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeInstance) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }
    
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeInstance;
}

/**
 * Get the main index
 */
export function getIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'cargotrack-prod';
  return client.index(indexName);
}

// Types for vector operations
// Pinecone metadata type - all values must be: string, number, boolean, or string[]
// We use Record instead of interface to avoid optional property conflicts
export type VectorMetadata = Record<string, string | number | boolean | string[]>;

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: VectorMetadata;
}