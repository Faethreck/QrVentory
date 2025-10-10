// src/utils.js
// Utility functions for Excel file handling and QR code generation

import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';

const EMPTY_PIXEL_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const SHEET_NAME = 'Sheet1';
const DATA_START_ROW = 2;

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

const HEADER_INDEX = HEADERS.reduce((accumulator, header, index) => {
  accumulator[header] = index;
  return accumulator;
}, {});
const SERIAL_COLUMN_INDEX = HEADER_INDEX.NoSerie + 1;

const EXPORT_COLUMN_WIDTHS = {
  Nombre: 28,
  NoSerie: 18,
  Categoria: 20,
  Cantidad: 12,
  'Fecha Ingreso': 16,
  Proveedor: 26,
  Rut: 16,
  NoFactura: 16,
  Estado: 14,
  Responsable: 24,
  Ubicacion: 26,
  Notas: 42,
  Imagen: 12,
};

const HEADER_FILL_COLOR = 'FF4A6572';
const HEADER_FONT_COLOR = 'FFFFFFFF';
const STRIPED_FILL_COLOR = 'FFF4F8FA';
const BORDER_COLOR = 'FFD6DEE2';
const DATA_FONT_COLOR = 'FF1F2629';

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  const rowValues = headerRow.values.slice(1);
  const matches =
    rowValues.length === HEADERS.length &&
    rowValues.every((value, index) => value === HEADERS[index]);

  if (matches) {
    return false;
  }

  if (rowValues.length > 0) {
    sheet.spliceRows(1, 1, HEADERS);
  } else {
    sheet.insertRow(1, HEADERS);
  }

  return true;
}

async function ensureWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  const exists = await fileExists(filePath);

  if (exists) {
    await workbook.xlsx.readFile(filePath);
  }

  let sheet = workbook.getWorksheet(SHEET_NAME);
  let mutated = false;

  if (!sheet) {
    sheet = workbook.addWorksheet(SHEET_NAME);
    sheet.addRow(HEADERS);
    mutated = true;
  } else if (ensureHeaderRow(sheet)) {
    mutated = true;
  }

  if (!exists || mutated) {
    await workbook.xlsx.writeFile(filePath);
  }

  return { workbook, sheet };
}

function normalizeItem(rawItem = {}) {
  if (!rawItem || typeof rawItem !== 'object') {
    return HEADERS.reduce((accumulator, header) => {
      accumulator[header] = '';
      return accumulator;
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

function normalizeSerial(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeRowNumber(value) {
  if (Number.isInteger(value)) {
    return value >= DATA_START_ROW ? value : null;
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= DATA_START_ROW ? numeric : null;
}

function extractSerialFromValue(value) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'object') {
    if ('text' in value && value.text != null) {
      return normalizeSerial(value.text);
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      const text = value.richText.map((entry) => entry.text ?? '').join('');
      return normalizeSerial(text);
    }
    if ('result' in value && value.result != null) {
      return normalizeSerial(value.result);
    }
    if ('formula' in value && value.formula != null) {
      return normalizeSerial(value.formula);
    }
  }

  return normalizeSerial(value);
}

function rowToNormalizedItem(row, rowNumber) {
  const rowValues = row.values.slice(1);
  const raw = {};
  HEADERS.forEach((header, index) => {
    raw[header] = rowValues[index] ?? '';
  });

  const normalized = normalizeItem(raw);
  if (Number.isInteger(rowNumber)) {
    normalized._rowNumber = rowNumber;
  }
  return normalized;
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
  for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!row || !row.hasValues) {
      continue;
    }
    items.push(rowToNormalizedItem(row, rowNumber));
  }

  return items;
}

export async function exportItemsToFile(sourcePath, destinationPath) {
  if (!destinationPath) {
    throw new Error('destinationPath is required');
  }

  const items = await getAllItems(sourcePath);
  const timestamp = new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QrVentory';
  workbook.lastModifiedBy = 'QrVentory';
  workbook.created = timestamp;
  workbook.modified = timestamp;

  const sheet = workbook.addWorksheet('Inventario', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  sheet.columns = HEADERS.map((header) => ({
    header,
    key: header,
    width: EXPORT_COLUMN_WIDTHS[header] ?? 20,
  }));

  sheet.columns.forEach((column) => {
    column.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  });

  sheet.getColumn('Cantidad').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn('Cantidad').numFmt = '#,##0';
  sheet.getColumn('Fecha Ingreso').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn('Fecha Ingreso').numFmt = 'yyyy-mm-dd';
  sheet.getColumn('Rut').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn('NoSerie').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getColumn('Imagen').alignment = { vertical: 'middle', horizontal: 'center' };

  const headerRow = sheet.getRow(1);
  styleHeaderRow(headerRow);

  items.forEach((item, index) => {
    const exportRow = buildExportRow(item);
    const row = sheet.addRow(exportRow);
    styleDataRow(row, index % 2 === 1);
  });

  const lastHeaderCell = headerRow.getCell(headerRow.cellCount).address;
  sheet.autoFilter = `${headerRow.getCell(1).address}:${lastHeaderCell}`;
  sheet.properties.defaultRowHeight = 18;

  await workbook.xlsx.writeFile(destinationPath);
  return { exported: items.length };
}

function buildExportRow(rawItem) {
  const item = normalizeItem(rawItem);
  const row = {};

  HEADERS.forEach((header) => {
    switch (header) {
      case 'Fecha Ingreso': {
        const value = item['Fecha Ingreso'];
        const date = value ? new Date(value) : null;
        row[header] =
          date && !Number.isNaN(date.getTime()) ? date : value || '';
        break;
      }
      case 'Cantidad': {
        const quantity = Number(item.Cantidad);
        row[header] = Number.isFinite(quantity) ? quantity : item.Cantidad || '';
        break;
      }
      case 'Imagen': {
        row[header] = item.Imagen ? 'Sí' : 'No';
        break;
      }
      default:
        row[header] = item[header] ?? '';
        break;
    }
  });

  return row;
}

function styleHeaderRow(row) {
  row.height = 24;
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT_COLOR }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL_COLOR } };
    cell.border = createBorder();
  });
}

function styleDataRow(row, isStriped) {
  row.height = 20;
  row.eachCell((cell) => {
    cell.font = { color: { argb: DATA_FONT_COLOR }, size: 10 };
    cell.border = createBorder();
    if (isStriped) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: STRIPED_FILL_COLOR },
      };
    }
  });
}

function createBorder() {
  const edge = { style: 'thin', color: { argb: BORDER_COLOR } };
  return {
    top: edge,
    left: edge,
    bottom: edge,
    right: edge,
  };
}

export async function updateItem(filePath, payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return { updated: 0 };
  }

  const target = payload.target ?? {};
  const targetSerial = normalizeSerial(target.serial);
  const targetRowNumber = normalizeRowNumber(target.rowNumber);
  const updatesSource = payload.item ?? payload.values ?? {};

  let item = normalizeItem(updatesSource);
  if (!item.NoSerie && targetSerial) {
    item.NoSerie = targetSerial;
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { updated: 0 };
  }

  let rowIndex = null;

  if (targetRowNumber != null) {
    const row = sheet.getRow(targetRowNumber);
    if (row && row.hasValues) {
      rowIndex = targetRowNumber;
    }
  }

  if (rowIndex == null && targetSerial) {
    for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const cellValue = sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value;
      const serial = extractSerialFromValue(cellValue);
      if (serial === targetSerial) {
        rowIndex = rowNumber;
        break;
      }
    }
  }

  if (rowIndex == null) {
    return { updated: 0 };
  }

  const rowValues = itemToRow(item);
  const row = sheet.getRow(rowIndex);
  rowValues.forEach((value, columnIndex) => {
    row.getCell(columnIndex + 1).value = value;
  });
  row.commit();

  await workbook.xlsx.writeFile(filePath);

  item = {
    ...normalizeItem(item),
    _rowNumber: rowIndex,
  };

  const qrDataUrl = await generateQrForItem(item);

  return {
    updated: 1,
    item,
    qrDataUrl,
  };
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
        const serial = normalizeSerial(entry);
        return serial ? { serial, rowNumber: null } : null;
      }

      const serial = normalizeSerial(entry.serial);
      const rowNumber = normalizeRowNumber(entry.rowNumber);

      if (!serial && rowNumber == null) {
        return null;
      }

      return { serial, rowNumber };
    })
    .filter(Boolean);

  if (normalizedEntries.length === 0) {
    return { deleted: 0, items: [] };
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { deleted: 0, items: [] };
  }

  const rowTargets = new Set(
    normalizedEntries
      .map((entry) => entry.rowNumber)
      .filter((rowNumber) => rowNumber != null),
  );
  const serialTargets = new Set(
    normalizedEntries
      .map((entry) => entry.serial)
      .filter((serial) => Boolean(serial)),
  );

  let deleted = 0;
  const removedItems = [];

  for (let rowNumber = sheet.rowCount; rowNumber >= DATA_START_ROW; rowNumber -= 1) {
    const shouldRemoveByRow = rowTargets.has(rowNumber);
    let serial = '';
    let shouldRemoveBySerial = false;

    if (!shouldRemoveByRow && serialTargets.size > 0) {
      const cellValue = sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value;
      serial = extractSerialFromValue(cellValue);
      shouldRemoveBySerial = Boolean(serial && serialTargets.has(serial));
    }

    if (!shouldRemoveByRow && !shouldRemoveBySerial) {
      continue;
    }

    const row = sheet.getRow(rowNumber);
    removedItems.push(rowToNormalizedItem(row, rowNumber));

    sheet.spliceRows(rowNumber, 1);
    deleted += 1;

    if (shouldRemoveByRow) {
      rowTargets.delete(rowNumber);
    }
    if (shouldRemoveBySerial && serial) {
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

  const rowsToAdd = [];
  items.forEach((raw) => {
    if (!raw || typeof raw !== 'object') {
      return;
    }
    rowsToAdd.push(itemToRow(normalizeItem(raw)));
  });

  rowsToAdd.forEach((rowValues) => {
    sheet.addRow(rowValues);
  });

  if (rowsToAdd.length > 0) {
    await workbook.xlsx.writeFile(filePath);
  }

  return { restored: rowsToAdd.length };
}
