// src/lib/services/search.ts
import { getIndex } from './vectordb';
import { generateEmbedding } from './embedding';

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: any;
}

/**
 * Semantic search across all vectors
 */
export async function semanticSearch(
  query: string, 
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { 
    topK = 5, 
    filter = {}, 
    includeMetadata = true 
  } = options;
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Query Pinecone
    const index = getIndex();
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      filter,
      includeMetadata,
    });
    
    // Transform results
    return results.matches?.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
    })) || [];
    
  } catch (error) {
    console.error('Semantic search failed:', error);
    throw new Error('Search failed');
  }
}

/**
 * Search shipments specifically
 */
export async function searchShipments(
  query: string, 
  status?: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const filter: any = { type: 'shipment' };
  if (status) {
    filter.status = status;
  }
  
  return semanticSearch(query, { topK, filter });
}

/**
 * Search customers specifically
 */
export async function searchCustomers(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  return semanticSearch(query, { 
    topK, 
    filter: { type: 'customer' } 
  });
}

/**
 * Search invoices specifically
 */
export async function searchInvoices(
  query: string,
  status?: string,
  topK: number = 5
): Promise<SearchResult[]> {
  const filter: any = { type: 'invoice' };
  if (status) {
    filter.invoiceStatus = status;
  }
  
  return semanticSearch(query, { topK, filter });
}

/**
 * Hybrid search - semantic + keyword filtering
 */
export async function hybridSearch(
  query: string,
  filters: {
    type?: string;
    status?: string;
    customerName?: string;
    dateFrom?: string;
    dateTo?: string;
  },
  topK: number = 10
): Promise<SearchResult[]> {
  const filter: any = {};
  
  if (filters.type) filter.type = filters.type;
  if (filters.status) filter.status = filters.status;
  if (filters.customerName) filter.customerName = { $eq: filters.customerName };
  
  return semanticSearch(query, { topK, filter });
}