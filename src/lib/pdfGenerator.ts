// src/lib/pdfGenerator.ts
import { jsPDF } from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  companyName: string;
  generatedAt: Date;
  dueDate: Date;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  shippingCost?: number;
  discount?: number;
  totalAmount: number;
  currency: string;
  terms?: string;
}

export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  console.log('🎨 Starting PDF generation with jsPDF...');
  
  try {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set up colors
    const primaryColor: [number, number, number] = [41, 128, 185]; // Blue
    const darkGray: [number, number, number] = [52, 73, 94];
    const lightGray: [number, number, number] = [189, 195, 199];
    
    let y = 20;
    const margin = 20;
    const pageWidth = 210; // A4 width in mm
    const contentWidth = pageWidth - (2 * margin);

    // Header - Company Name
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.companyName, margin, y);
    
    y += 15;

    // Invoice Title
    doc.setFontSize(32);
    doc.setTextColor(...darkGray);
    doc.text('INVOICE', margin, y);
    
    // Invoice Number (right aligned)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const invoiceNumText = `#${invoiceData.invoiceNumber}`;
    const invoiceNumWidth = doc.getTextWidth(invoiceNumText);
    doc.text(invoiceNumText, pageWidth - margin - invoiceNumWidth, y);
    
    y += 15;

    // Divider line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    
    y += 10;

    // Bill To Section
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(invoiceData.customerName, margin, y);
    
    y += 5;
    doc.text(invoiceData.customerEmail, margin, y);
    
    // Invoice Details (right side)
    const rightColX = pageWidth - margin - 60;
    let detailY = y - 11;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', rightColX, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoiceData.generatedAt).toLocaleDateString(), rightColX + 30, detailY);
    
    detailY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Due Date:', rightColX, detailY);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(invoiceData.dueDate).toLocaleDateString(), rightColX + 30, detailY);
    
    y += 20;

    // Line Items Table
    const tableTop = y;
    const colWidths = {
      description: contentWidth * 0.5,
      quantity: contentWidth * 0.15,
      unitPrice: contentWidth * 0.175,
      total: contentWidth * 0.175
    };

    // Header background
    doc.setFillColor(...primaryColor);
    doc.rect(margin, tableTop, contentWidth, 8, 'F');
    
    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    
    let currentX = margin + 2;
    doc.text('DESCRIPTION', currentX, tableTop + 5.5);
    currentX += colWidths.description;
    doc.text('QTY', currentX, tableTop + 5.5);
    currentX += colWidths.quantity;
    doc.text('UNIT PRICE', currentX, tableTop + 5.5);
    currentX += colWidths.unitPrice;
    doc.text('AMOUNT', currentX, tableTop + 5.5);
    
    y = tableTop + 8;

    // Line Items
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    
    invoiceData.lineItems.forEach((item, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }
      
      currentX = margin + 2;
      doc.text(item.description, currentX, y + 5);
      currentX += colWidths.description;
      doc.text(item.quantity.toString(), currentX, y + 5);
      currentX += colWidths.quantity;
      doc.text(`${invoiceData.currency} ${item.unitPrice.toFixed(2)}`, currentX, y + 5);
      currentX += colWidths.unitPrice;
      doc.text(`${invoiceData.currency} ${item.total.toFixed(2)}`, currentX, y + 5);
      
      y += 7;
    });

    // Draw table border
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.1);
    doc.rect(margin, tableTop, contentWidth, y - tableTop);
    
    y += 10;

    // Totals Section
    const totalsX = pageWidth - margin - 60;
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, y);
    const subtotalText = `${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`;
    const subtotalWidth = doc.getTextWidth(subtotalText);
    doc.text(subtotalText, totalsX + 60 - subtotalWidth, y);
    
    if (invoiceData.taxAmount > 0) {
      y += 6;
      doc.text('Tax:', totalsX, y);
      const taxText = `${invoiceData.currency} ${invoiceData.taxAmount.toFixed(2)}`;
      const taxWidth = doc.getTextWidth(taxText);
      doc.text(taxText, totalsX + 60 - taxWidth, y);
    }
    
    if (invoiceData.shippingCost && invoiceData.shippingCost > 0) {
      y += 6;
      doc.text('Shipping:', totalsX, y);
      const shipText = `${invoiceData.currency} ${invoiceData.shippingCost.toFixed(2)}`;
      const shipWidth = doc.getTextWidth(shipText);
      doc.text(shipText, totalsX + 60 - shipWidth, y);
    }
    
    if (invoiceData.discount && invoiceData.discount > 0) {
      y += 6;
      doc.text('Discount:', totalsX, y);
      const discText = `-${invoiceData.currency} ${invoiceData.discount.toFixed(2)}`;
      const discWidth = doc.getTextWidth(discText);
      doc.text(discText, totalsX + 60 - discWidth, y);
    }
    
    y += 8;
    
    // Total line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(totalsX, y - 2, totalsX + 60, y - 2);
    
    // Total Amount
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', totalsX, y + 4);
    const totalText = `${invoiceData.currency} ${invoiceData.totalAmount.toFixed(2)}`;
    const totalWidth = doc.getTextWidth(totalText);
    doc.text(totalText, totalsX + 60 - totalWidth, y + 4);
    
    y += 20;

    // Terms and Conditions
    if (invoiceData.terms) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('Terms & Conditions:', margin, y);
      
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const termsLines = doc.splitTextToSize(invoiceData.terms, contentWidth);
      doc.text(termsLines, margin, y);
    }

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.setFont('helvetica', 'italic');
    const footerText = `Invoice generated on ${new Date(invoiceData.generatedAt).toLocaleString()}`;
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);

    // Convert to buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    console.log('✅ PDF generated successfully');
    console.log(`📊 PDF size: ${pdfBuffer.length} bytes`);
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    throw error;
  }
}