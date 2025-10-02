// src/utils.js
import fs from 'fs';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';

const HEADERS = [
  'Nombre', 'NoSerie', 'Categoria', 'Cantidad', 'Fecha Ingreso',
  'Proveedor', 'Rut', 'NoFactura', 'Estado', 'Responsable', 'Ubicacion', 'Notas'
];

async function ensureWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();

  const exists = fs.existsSync(filePath);
  if (exists) {
    await workbook.xlsx.readFile(filePath);
    let ws = workbook.getWorksheet('Sheet1');
    if (!ws) {
      ws = workbook.addWorksheet('Sheet1');
      ws.addRow(HEADERS);
    } else {
      // Ensure headers exist
      const headerRow = ws.getRow(1).values.slice(1); // drop index 0
      if (headerRow.length !== HEADERS.length || headerRow.some((h, i) => h !== HEADERS[i])) {
        ws.insertRow(1, HEADERS);
      }
    }
    return { workbook, sheet: workbook.getWorksheet('Sheet1') };
  }

  // Create fresh
  const ws = workbook.addWorksheet('Sheet1');
  ws.addRow(HEADERS);
  await workbook.xlsx.writeFile(filePath);
  return { workbook, sheet: ws };
}

export async function saveItemAndGenerateQR(filePath, item) {
  // 1) Ensure workbook/sheet
  const { workbook } = await ensureWorkbook(filePath);
  const sheet = workbook.getWorksheet('Sheet1');

  // 2) Append row in the exact header order
  const row = [
    item.Nombre ?? '',
    item.NoSerie ?? '',
    item.Categoria ?? '',
    item.Cantidad ?? '',
    item['Fecha Ingreso'] ?? '',
    item.Proveedor ?? '',
    item.Rut ?? '',
    item.NoFactura ?? '',
    item.Estado ?? '',
    item.Responsable ?? '',
    item.Ubicacion ?? '',
    item.Notas ?? '',
  ];
  sheet.addRow(row);

  // 3) Save workbook
  await workbook.xlsx.writeFile(filePath);

  // 4) Build QR payload (include a timestamp & schema version)
  const payload = {
    ...item,
    _meta: {
      v: 1,
      savedAt: new Date().toISOString(),
    },
  };

  // 5) Generate QR as base64 PNG
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload)); // default PNG data URL
  return dataUrl; // e.g., "data:image/png;base64,...."
}