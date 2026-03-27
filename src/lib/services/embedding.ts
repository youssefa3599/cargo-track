// src/lib/services/embedding.ts

import { GoogleGenAI } from '@google/genai';

// Lazy client — created on first use so the API key is already loaded by then
let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return _ai;
}

/**
 * Generate a 1024-dimensional embedding using gemini-embedding-001.
 * outputDimensionality: 1024 matches the Pinecone index exactly.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await getAI().models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { outputDimensionality: 1024 },
    });

    const values = result.embeddings?.[0]?.values;
    if (!values || values.length === 0) throw new Error('Gemini returned empty embedding');

    return values;
  } catch (error: any) {
    console.error('Embedding generation failed:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Embed multiple texts in parallel.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(generateEmbedding));
}

/**
 * Embed in batches to avoid rate limiting.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 5,
  delayMs: number = 500
): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    console.log(`Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
    const batchResults = await Promise.all(texts.slice(i, i + batchSize).map(generateEmbedding));
    results.push(...batchResults);
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}