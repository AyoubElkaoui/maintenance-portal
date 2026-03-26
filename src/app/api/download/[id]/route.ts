import { NextRequest, NextResponse } from 'next/server';
import { getUpload, getUploadData, deleteUpload } from '@/lib/storage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function calculateDaysOpen(row: Record<string, unknown>) {
  const invoiceDate = row['Factuurdatum'] || row['factuurdatum'];
  const paymentTerm = row['Betalingstermijn'] || row['betalingstermijn'] || row['Termijn'] || row['termijn'];

  if (!invoiceDate || !paymentTerm) return null;

  try {
    const invoiceDateObj = new Date(invoiceDate as string);
    const currentDate = new Date();
    const paymentTermDays = parseInt(paymentTerm as string);

    if (isNaN(paymentTermDays)) return null;

    // Calculate due date
    const dueDate = new Date(invoiceDateObj);
    dueDate.setDate(dueDate.getDate() + paymentTermDays);

    // Calculate days remaining until due date (positive) or days overdue (negative)
    const timeDiff = dueDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return daysDiff;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const shouldDelete = searchParams.get('delete') !== 'false';

    const upload = await getUpload(id);

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    if (upload.status !== 'reviewed') {
      return NextResponse.json(
        { error: 'Upload is not yet reviewed' },
        { status: 400 }
      );
    }

    // Get the reviewed data
    const reviewedData = await getUploadData(id);
    const comments = upload.comments || '';

    // Delete the upload after download (automatic cleanup) - only if not explicitly prevented
    if (shouldDelete) {
      await deleteUpload(id);
    }

    if (format === 'excel') {
      return generateExcelFile(reviewedData, comments, upload.filename);
    } else if (format === 'pdf') {
      return generatePDFFile(reviewedData, comments, upload.filename);
    } else {
      return NextResponse.json(
        { error: 'Unsupported format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error downloading upload:', error);
    return NextResponse.json(
      { error: 'Failed to download upload' },
      { status: 500 }
    );
  }
}

function getRelatieNaam(row: Record<string, unknown>): string {
  return String(
    row['Relatienaam'] || row['relatienaam'] || row['Relatie'] || row['relatie'] ||
    row['Bedrijfsnaam'] || row['bedrijfsnaam'] || row['Naam'] || row['naam'] || 'Onbekend'
  );
}

function groupByRelatie(data: Record<string, unknown>[]): Map<string, Record<string, unknown>[]> {
  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of data) {
    const name = getRelatieNaam(row);
    if (!grouped.has(name)) {
      grouped.set(name, []);
    }
    grouped.get(name)!.push(row);
  }
  return grouped;
}

function getHeaders(reviewedData: Record<string, unknown>[]) {
  const originalHeaders = Object.keys(reviewedData[0]).filter(key =>
    !key.startsWith('_') && !['Akkoord', 'Afgewezen', 'Achterstallige dagen', 'Aantal dagen open'].includes(key)
  );
  const headers = [...originalHeaders, 'Dagen open', 'Herinnering', 'Herinnering_Opmerking', 'Review_Status', 'Review_Opmerkingen'];
  return { originalHeaders, headers };
}

function getRowValues(row: Record<string, unknown>, originalHeaders: string[]) {
  const originalValues = originalHeaders.map(header => String(row[header] ?? ''));
  const daysOpen = calculateDaysOpen(row);
  const daysOpenStr = daysOpen !== null ? (daysOpen > 0 ? `+${daysOpen}` : daysOpen.toString()) : '-';
  const herinnering = row._herinnering ? 'Ja' : 'Nee';
  const herinneringOpmerking = String(row._herinneringOpmerking || '');
  const status = row._status === 'issue' ? 'Probleem' : 'Goedgekeurd';
  const rowComments = String(row._comments || '');
  return [...originalValues, daysOpenStr, herinnering, herinneringOpmerking, status, rowComments];
}

function generateExcelFile(reviewedData: Record<string, unknown>[], comments: string, filename: string) {
  const wb = XLSX.utils.book_new();
  const excelData: (string | number | boolean)[][] = [];

  // Add reviewer comments at the top if any
  if (comments.trim()) {
    excelData.push(['Algemene Reviewer Opmerkingen:']);
    comments.split('\n').forEach(line => {
      excelData.push([line]);
    });
    excelData.push([]); // Empty row
  }

  if (reviewedData.length > 0) {
    const { originalHeaders, headers } = getHeaders(reviewedData);
    const grouped = groupByRelatie(reviewedData);

    for (const [relatieNaam, rows] of grouped) {
      // Add client name as section header
      excelData.push([`Klant: ${relatieNaam}`]);
      excelData.push(headers);

      for (const row of rows) {
        excelData.push(getRowValues(row, originalHeaders));
      }

      excelData.push([]); // Empty row between clients
    }

    const colWidths = headers.map((header: string) => ({ wch: Math.max(header.length, 15) }));
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, 'Reviewed Data');
  } else {
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Reviewed Data');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="reviewed_${filename.replace('.csv', '')}.xlsx"`,
    },
  });
}

function generatePDFFile(reviewedData: Record<string, unknown>[], comments: string, filename: string) {
  const doc = new jsPDF('landscape');

  doc.setFontSize(16);
  doc.text('Reviewed Data Report', 20, 20);

  doc.setFontSize(12);
  doc.text(`Source: ${filename}`, 20, 35);

  let yPosition = 50;

  // Add reviewer comments if any
  if (comments.trim()) {
    doc.setFontSize(14);
    doc.text('Algemene Reviewer Opmerkingen:', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const commentLines = doc.splitTextToSize(comments, 250);
    doc.text(commentLines, 20, yPosition);
    yPosition += commentLines.length * 5 + 10;
  }

  if (reviewedData.length > 0) {
    const { originalHeaders, headers } = getHeaders(reviewedData);
    const grouped = groupByRelatie(reviewedData);

    for (const [relatieNaam, rows] of grouped) {
      // Check if we need a new page
      if (yPosition > 170) {
        doc.addPage();
        yPosition = 20;
      }

      // Add client name as section header
      doc.setFontSize(12);
      doc.setFont(undefined as unknown as string, 'bold');
      doc.text(`Klant: ${relatieNaam}`, 20, yPosition);
      doc.setFont(undefined as unknown as string, 'normal');
      yPosition += 8;

      const tableData = rows.map((row: Record<string, unknown>) => {
        return getRowValues(row, originalHeaders);
      });

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: yPosition,
        styles: {
          fontSize: 7,
          cellPadding: 1,
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { top: 10 },
        columnStyles: {
          [headers.length - 5]: { cellWidth: 20 }, // Dagen open
          [headers.length - 4]: { cellWidth: 20 }, // Herinnering
          [headers.length - 3]: { cellWidth: 30 }, // Herinnering Opmerking
          [headers.length - 2]: { cellWidth: 25 }, // Review Status
          [headers.length - 1]: { cellWidth: 40 }, // Review Opmerkingen
        },
      });

      // Get the final Y position after the table
      const finalY = (doc as unknown as Record<string, unknown>).lastAutoTable as { finalY: number } | undefined;
      yPosition = (finalY?.finalY || yPosition) + 10;
    }
  }

  const pdfBuffer = doc.output('arraybuffer');

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reviewed_${filename.replace('.csv', '')}.pdf"`,
    },
  });
}