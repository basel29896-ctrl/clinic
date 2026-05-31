import * as XLSX from 'xlsx';

/**
 * Export an array of plain objects to an .xlsx file.
 * @param {Object[]} rows   Data rows (each object = one row).
 * @param {string}   filename  Output filename without extension.
 * @param {string}   sheetName Worksheet name.
 */
export function exportToExcel(rows, filename = 'export', sheetName = 'Sheet1') {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('exportToExcel: no rows to export');
  }
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
