// src/utils.js (CommonJS)
const ExcelJS = require('exceljs');
const fs = require('fs');

async function createExcelFile(filePath, headers) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');
  worksheet.addRow(headers);
  await workbook.xlsx.writeFile(filePath);
}

async function addRowToExcel(filePath, rowData) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Sheet1');
  worksheet.addRow(rowData);
  await workbook.xlsx.writeFile(filePath);
}

async function editCellInExcel(filePath, rowNumber, columnNumber, newValue) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Sheet1');
  const row = worksheet.getRow(rowNumber);
  row.getCell(columnNumber).value = newValue;
  row.commit();
  await workbook.xlsx.writeFile(filePath);
}

async function viewExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Sheet1');
  const rows = [];
  worksheet.eachRow((row) => rows.push(row.values.slice(1)));
  return rows;
}

module.exports = {
  createExcelFile,
  addRowToExcel,
  editCellInExcel,
  viewExcelFile
};