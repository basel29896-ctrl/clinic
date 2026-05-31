import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export tabular data to a PDF with a header and auto-fitted table.
 * @param {Object}   opts
 * @param {string}   opts.title    Document title.
 * @param {string[]} opts.columns  Column headers.
 * @param {Array[]}  opts.rows     Array of row arrays (cell values).
 * @param {string}   opts.filename Output filename without extension.
 */
export function exportToPDF({ title = 'Report', columns = [], rows = [], filename = 'report' }) {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 32,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [14, 165, 233] }, // #0EA5E9
    alternateRowStyles: { fillColor: [240, 249, 255] },
  });

  doc.save(`${filename}.pdf`);
}
