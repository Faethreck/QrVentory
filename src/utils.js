// src/utils.js
// Utility functions for Excel file handling and QR code generation

import fs from 'fs';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';

const EMPTY_PIXEL_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const HEADERS = [
  'Nombre',
  'NoSerie',
  'Categoria',
  'Cantidad',
  'Fecha Ingreso',
  'Proveedor',
  'Rut',
  'NoFactura',
  'Estado',
  'Responsable',
  'Ubicacion',
  'Notas',
  'Imagen',
];

async function ensureWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  const exists = fs.existsSync(filePath);

  if (exists) {
    await workbook.xlsx.readFile(filePath);
    let sheet = workbook.getWorksheet('Sheet1');
    let mutated = false;

    if (!sheet) {
      sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(HEADERS);
      mutated = true;
    } else {
      const headerRow = sheet.getRow(1).values.slice(1);
      const headersMatch =
        headerRow.length === HEADERS.length &&
        headerRow.every((h, i) => h === HEADERS[i]);

      if (!headersMatch) {
        if (headerRow.length) {
          sheet.spliceRows(1, 1, HEADERS);
        } else {
          sheet.insertRow(1, HEADERS);
        }
        mutated = true;
      }
    }

    if (mutated) {
      await workbook.xlsx.writeFile(filePath);
    }

    return { workbook, sheet: workbook.getWorksheet('Sheet1') };
  }

  const sheet = workbook.addWorksheet('Sheet1');
  sheet.addRow(HEADERS);
  await workbook.xlsx.writeFile(filePath);

  return { workbook, sheet };
}

function normalizeItem(rawItem = {}) {
  if (!rawItem || typeof rawItem !== 'object') {
    return HEADERS.reduce((acc, header) => {
      acc[header] = '';
      return acc;
    }, {});
  }

  const normalized = { ...rawItem };

  HEADERS.forEach((header) => {
    const value = rawItem[header];

    if (value === undefined || value === null) {
      normalized[header] = '';
      return;
    }

    if (value instanceof Date) {
      normalized[header] = value.toISOString();
      return;
    }

    if (typeof value === 'number') {
      normalized[header] = Number.isFinite(value) ? value : '';
      return;
    }

    normalized[header] = String(value).trim();
  });

  return normalized;
}

function itemToRow(item) {
  const normalized = normalizeItem(item);
  return [
    normalized.Nombre ?? '',
    normalized.NoSerie ?? '',
    normalized.Categoria ?? '',
    normalized.Cantidad ?? '',
    normalized['Fecha Ingreso'] ?? '',
    normalized.Proveedor ?? '',
    normalized.Rut ?? '',
    normalized.NoFactura ?? '',
    normalized.Estado ?? '',
    normalized.Responsable ?? '',
    normalized.Ubicacion ?? '',
    normalized.Notas ?? '',
    normalized.Imagen ?? '',
  ];
}

function buildPayload(item) {
  return {
    ...item,
    _meta: {
      v: 1,
      savedAt: new Date().toISOString(),
    },
  };
}

export async function generateQrForItem(rawItem) {
  const item = normalizeItem(rawItem);
  const qrItem = {
    ...item,
    Imagen: item.Imagen ? 'Imagen adjunta' : '',
  };
  const payload = buildPayload(qrItem);
  const serialized = JSON.stringify(payload);

  try {
    return await QRCode.toDataURL(serialized);
  } catch (error) {
    console.error('QR generation failed, attempting fallback', error);
    try {
      const fallbackPayload = {
        NoSerie: item.NoSerie ?? '',
        Nombre: item.Nombre ?? '',
        _meta: payload._meta,
      };
      return await QRCode.toDataURL(JSON.stringify(fallbackPayload));
    } catch (fallbackError) {
      console.error('QR fallback also failed, returning placeholder image', fallbackError);
      return EMPTY_PIXEL_DATA_URL;
    }
  }
}

export async function saveItemAndGenerateQR(filePath, rawItem) {
  const item = normalizeItem(rawItem);
  const { workbook, sheet } = await ensureWorkbook(filePath);
  sheet.addRow(itemToRow(item));
  await workbook.xlsx.writeFile(filePath);
  return generateQrForItem(item);
}

export async function getAllItems(filePath) {
  const { sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return [];
  }

  const items = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rowValues = row.values.slice(1);
    const item = {};
    HEADERS.forEach((header, index) => {
      item[header] = rowValues[index] ?? '';
    });
    const normalized = normalizeItem(item);
    normalized._rowNumber = rowNumber;
    items.push(normalized);
  });

  return items;
}

export async function deleteItemsBySerial(filePath, entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { deleted: 0, items: [] };
  }

  const normalizedEntries = entries
    .map((entry) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === 'string') {
        const serial = entry.trim();
        return serial ? { serial, rowNumber: null } : null;
      }

      const serial = entry.serial != null ? String(entry.serial).trim() : '';
      const rowNumber = Number.isInteger(entry.rowNumber)
        ? entry.rowNumber
        : Number.isFinite(Number(entry.rowNumber))
          ? Number(entry.rowNumber)
          : null;

      if (!serial && (rowNumber == null || rowNumber < 2)) {
        return null;
      }

      return {
        serial,
        rowNumber: rowNumber != null && rowNumber >= 2 ? rowNumber : null,
      };
    })
    .filter(Boolean);

  if (normalizedEntries.length === 0) {
    return { deleted: 0, items: [] };
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { deleted: 0, items: [] };
  }

  let deleted = 0;
  const removedItems = [];
  const rowTargets = new Set(
    normalizedEntries
      .map((entry) => entry.rowNumber)
      .filter((rowNumber) => rowNumber != null),
  );
  const serialTargets = new Set(
    normalizedEntries
      .map((entry) => entry.serial)
      .filter((serial) => serial && serial.length > 0),
  );

  for (let rowNumber = sheet.rowCount; rowNumber >= 2; rowNumber -= 1) {
    const shouldRemoveByRow = rowTargets.has(rowNumber);
    let shouldRemoveBySerial = false;
    let serial = '';

    if (!shouldRemoveByRow && serialTargets.size > 0) {
      const cellValue = sheet.getCell(rowNumber, 2).value;
      serial = typeof cellValue === 'object' && cellValue !== null && 'text' in cellValue
        ? String(cellValue.text).trim()
        : String(cellValue ?? '').trim();
      shouldRemoveBySerial = Boolean(serial && serialTargets.has(serial));
    }

    if (!shouldRemoveByRow && !shouldRemoveBySerial) {
      continue;
    }

    const row = sheet.getRow(rowNumber);
    const rowValues = row.values.slice(1);
    const item = {};
    HEADERS.forEach((header, index) => {
      item[header] = rowValues[index] ?? '';
    });
    removedItems.push(normalizeItem(item));

    sheet.spliceRows(rowNumber, 1);
    deleted += 1;
    if (shouldRemoveByRow) {
      rowTargets.delete(rowNumber);
    }
    if (shouldRemoveBySerial) {
      serialTargets.delete(serial);
    }
  }

  if (deleted > 0) {
    await workbook.xlsx.writeFile(filePath);
  }

  return { deleted, items: removedItems };
}

export async function restoreItems(filePath, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { restored: 0 };
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { restored: 0 };
  }

  let restored = 0;
  items.forEach((raw) => {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    const normalized = normalizeItem(raw);
    sheet.addRow(itemToRow(normalized));
    restored += 1;
  });

  if (restored > 0) {
    await workbook.xlsx.writeFile(filePath);
  }

  return { restored };
}
