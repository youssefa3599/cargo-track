// src/lib/services/indexer.ts
import { getIndex, VectorMetadata } from './vectordb';
import { generateEmbedding } from './embedding';
import Shipment from '@/models/Shipment';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Invoice from '@/models/Invoice';

/**
 * Convert a shipment to searchable text
 */
function shipmentToText(shipment: any): string {
  const parts = [
    `Shipment ${shipment.shipmentId}`,
    `Status: ${shipment.status}`,
    `From ${shipment.origin} to ${shipment.destination}`,
    `Customer: ${shipment.customerName || 'Unknown'}`,
    `Supplier: ${shipment.supplierName || 'Unknown'}`,
    `Shipping date: ${new Date(shipment.shippingDate).toLocaleDateString()}`,
    `Products: ${shipment.products?.map((p: any) => p.productName).join(', ')}`,
    shipment.notes ? `Notes: ${shipment.notes}` : '',
    shipment.trackingNumber ? `Tracking: ${shipment.trackingNumber}` : '',
  ];
  
  return parts.filter(Boolean).join('. ');
}

/**
 * Index a single shipment
 */
export async function indexShipment(shipment: any) {
  const index = getIndex();
  
  const text = shipmentToText(shipment);
  const embedding = await generateEmbedding(text);
  
  // Build metadata with only defined values (Pinecone doesn't accept undefined)
  const metadata: Record<string, string | number | boolean | string[]> = {
    type: 'shipment',
    id: shipment._id.toString(),
    text,
    createdAt: shipment.createdAt instanceof Date ? shipment.createdAt.toISOString() : shipment.createdAt,
  };
  
  // Only add optional fields if they have values
  if (shipment.shipmentId) metadata.shipmentId = shipment.shipmentId;
  if (shipment.status) metadata.status = shipment.status;
  if (shipment.origin) metadata.origin = shipment.origin;
  if (shipment.destination) metadata.destination = shipment.destination;
  if (shipment.customerName) metadata.customerName = shipment.customerName;
  if (shipment.supplierName) metadata.supplierName = shipment.supplierName;
  if (shipment.updatedAt) {
    metadata.updatedAt = shipment.updatedAt instanceof Date ? shipment.updatedAt.toISOString() : shipment.updatedAt;
  }
  
  // FIXED: Correct format for Pinecone v3
  await index.upsert([{
    id: `shipment-${shipment._id}`,
    values: embedding,
    metadata
  }]);
  
  console.log(`✅ Indexed shipment: ${shipment.shipmentId}`);
}

/**
 * Index a single customer
 */
export async function indexCustomer(customer: any) {
  const index = getIndex();
  
  const text = `Customer ${customer.name}. Email: ${customer.email}. Phone: ${customer.phone}. Country: ${customer.country || 'Unknown'}. Address: ${customer.address}. ${customer.notes ? 'Notes: ' + customer.notes : ''}`;
  
  const embedding = await generateEmbedding(text);
  
  // Build metadata with only defined values
  const metadata: Record<string, string | number | boolean | string[]> = {
    type: 'customer',
    id: customer._id.toString(),
    text,
    customerName: customer.name,
    customerEmail: customer.email,
    createdAt: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : customer.createdAt,
  };
  
  if (customer.country) metadata.customerCountry = customer.country;
  
  // FIXED: Correct format for Pinecone v3
  await index.upsert([{
    id: `customer-${customer._id}`,
    values: embedding,
    metadata
  }]);
  
  console.log(`✅ Indexed customer: ${customer.name}`);
}

/**
 * Index a single supplier
 */
export async function indexSupplier(supplier: any) {
  const index = getIndex();
  
  const text = `Supplier ${supplier.name}. Contact: ${supplier.contactPerson}. Email: ${supplier.email}. Phone: ${supplier.phone}. Country: ${supplier.country || 'Unknown'}. ${supplier.paymentTerms ? 'Payment terms: ' + supplier.paymentTerms : ''}`;
  
  const embedding = await generateEmbedding(text);
  
  // Build metadata with only defined values
  const metadata: Record<string, string | number | boolean | string[]> = {
    type: 'supplier',
    id: supplier._id.toString(),
    text,
    supplierName: supplier.name,
    customerEmail: supplier.email, // Reusing field
    createdAt: supplier.createdAt instanceof Date ? supplier.createdAt.toISOString() : supplier.createdAt,
  };
  
  if (supplier.country) metadata.customerCountry = supplier.country;
  
  await index.upsert([{
    id: `supplier-${supplier._id}`,
    values: embedding,
    metadata
  }]);
  
  console.log(`✅ Indexed supplier: ${supplier.name}`);
}

/**
 * Index a single invoice
 */
export async function indexInvoice(invoice: any) {
  const index = getIndex();
  
  const text = `Invoice ${invoice.invoiceNumber}. Customer: ${invoice.customerName}. Status: ${invoice.status}. Amount: ${invoice.totalAmount} ${invoice.currency}. Due: ${new Date(invoice.dueDate).toLocaleDateString()}. ${invoice.notes ? 'Notes: ' + invoice.notes : ''}`;
  
  const embedding = await generateEmbedding(text);
  
  // Build metadata with only defined values
  const metadata: Record<string, string | number | boolean | string[]> = {
    type: 'invoice',
    id: invoice._id.toString(),
    text,
    invoiceNumber: invoice.invoiceNumber,
    invoiceStatus: invoice.status,
    customerName: invoice.customerName,
    amount: invoice.totalAmount,
    createdAt: invoice.issueDate instanceof Date ? invoice.issueDate.toISOString() : invoice.issueDate,
  };
  
  await index.upsert([{
    id: `invoice-${invoice._id}`,
    values: embedding,
    metadata
  }]);
  
  console.log(`✅ Indexed invoice: ${invoice.invoiceNumber}`);
}

/**
 * Bulk index all existing data (run once)
 */
export async function bulkIndexAllData() {
  console.log('🚀 Starting bulk indexing...');
  
  try {
    // Index shipments
    const shipments = await Shipment.find({}).lean();
    console.log(`📦 Indexing ${shipments.length} shipments...`);
    for (const shipment of shipments) {
      await indexShipment(shipment);
    }
    
    // Index customers
    const customers = await Customer.find({}).lean();
    console.log(`👥 Indexing ${customers.length} customers...`);
    for (const customer of customers) {
      await indexCustomer(customer);
    }
    
    // Index suppliers
    const suppliers = await Supplier.find({}).lean();
    console.log(`🏭 Indexing ${suppliers.length} suppliers...`);
    for (const supplier of suppliers) {
      await indexSupplier(supplier);
    }
    
    // Index invoices
    const invoices = await Invoice.find({}).lean();
    console.log(`🧾 Indexing ${invoices.length} invoices...`);
    for (const invoice of invoices) {
      await indexInvoice(invoice);
    }
    
    console.log('✅ Bulk indexing complete!');
  } catch (error) {
    console.error('❌ Bulk indexing failed:', error);
    throw error;
  }
}

/**
 * Delete a vector by ID
 */
export async function deleteVector(type: string, id: string) {
  const index = getIndex();
  await index.deleteOne(`${type}-${id}`);
  console.log(`🗑️ Deleted vector: ${type}-${id}`);
}

/**
 * Index knowledge base entries
 */
export async function indexKnowledgeBase(knowledgeData: any[]) {
  const index = getIndex();
  
  console.log(`📚 Indexing ${knowledgeData.length} knowledge base entries...`);
  
  for (const entry of knowledgeData) {
    const text = `${entry.question} ${entry.answer}`;
    const embedding = await generateEmbedding(text);
    
    // Build metadata with only defined values
    const metadata: Record<string, string | number | boolean | string[]> = {
      type: 'knowledge',
      id: entry.id,
      text,
      category: entry.category,
      tags: entry.tags || [],
      createdAt: new Date().toISOString()
    };
    
    await index.upsert([{
      id: `kb-${entry.id}`,
      values: embedding,
      metadata
    }]);
  }
  
  console.log('✅ Knowledge base indexed!');
}