// src/utils.js
// Utility functions for Excel file handling and QR code generation

import { access, writeFile as fsWriteFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { deriveSerialBase, normalizeSerialValue } from './shared/serial.js';

const EMPTY_PIXEL_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

const SHEET_NAME = 'Sheet1';
const DATA_START_ROW = 2;

const HEADERS = [
  'Nombre',
  'NoSerie',
  'Categoria',
  'Tipo',
  'Subvencion',
  'Nivel Educativo',
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
const ESTADO_COLUMN_INDEX = HEADER_INDEX.Estado + 1;

const EXPORT_COLUMN_WIDTHS = {
  Nombre: 28,
  NoSerie: 18,
  Categoria: 20,
  Tipo: 16,
  Subvencion: 20,
  'Nivel Educativo': 20,
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
const DEFAULT_BAJA_ESTADO = 'Dado de baja';

const ITEM_TYPE_OPTIONS = new Map([
  ['tangible', 'Tangible'],
  ['fungible', 'Fungible'],
]);

const SUBVENCION_OPTIONS = new Map([
  ['aulas conectadas', 'Aulas Conectadas'],
  ['sep', 'SEP'],
  ['general', 'General'],
]);

const NIVEL_EDUCATIVO_OPTIONS = new Map([
  ['general', 'General'],
  ['educacion basica', 'Educacion Basica'],
  ['educacion media', 'Educacion Media'],
]);

const DEMO_ITEMS = [
  {
    Nombre: 'Notebook Lenovo ThinkPad E15',
    NoSerie: '',
    Categoria: 'Tecnologia',
    Tipo: 'Tangible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 1,
    'Fecha Ingreso': '2025-02-10',
    Proveedor: 'TecnoProveedor Ltda.',
    Rut: '76.543.210-5',
    NoFactura: 'F-98213',
    Estado: 'Operativo',
    Responsable: 'Equipo TIC',
    Ubicacion: 'Laboratorio Informatica',
    Notas: 'Equipo configurado para pruebas de software.',
    Imagen: '',
  },
  {
    Nombre: 'Tablet Samsung Galaxy Tab S9',
    NoSerie: '',
    Categoria: 'Dispositivos Moviles',
    Tipo: 'Tangible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Basica',
    Cantidad: 3,
    'Fecha Ingreso': '2025-03-04',
    Proveedor: 'MobileStore SPA',
    Rut: '70.111.222-3',
    NoFactura: 'F-99021',
    Estado: 'Operativo',
    Responsable: 'Coordinacion SEP',
    Ubicacion: 'Sala de Clases 2B',
    Notas: 'Uso compartido por docentes.',
    Imagen: '',
  },
  {
    Nombre: 'Impresora HP LaserJet Pro M404dn',
    NoSerie: '',
    Categoria: 'Impresoras',
    Tipo: 'Tangible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 1,
    'Fecha Ingreso': '2024-11-18',
    Proveedor: 'Office Supply SPA',
    Rut: '96.123.456-8',
    NoFactura: 'F-77102',
    Estado: 'En mantenimiento',
    Responsable: 'Luis Rojas',
    Ubicacion: 'Sala de Profesores',
    Notas: 'Requiere cambio de rodillo.',
    Imagen: '',
  },
  {
    Nombre: 'Proyector Epson PowerLite X49',
    NoSerie: '',
    Categoria: 'Audiovisual',
    Tipo: 'Tangible',
    Subvencion: 'Aulas Conectadas',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 1,
    'Fecha Ingreso': '2024-08-25',
    Proveedor: 'VisualTech',
    Rut: '82.456.789-2',
    NoFactura: 'F-55901',
    Estado: 'Operativo',
    Responsable: 'Maria Fernandez',
    Ubicacion: 'Auditorio Principal',
    Notas: 'Lampara reemplazada en agosto.',
    Imagen: '',
  },
  {
    Nombre: 'Kit de herramientas Truper 108 piezas',
    NoSerie: '',
    Categoria: 'Herramientas',
    Tipo: 'Tangible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 2,
    'Fecha Ingreso': '2025-01-04',
    Proveedor: 'Ferreteria Industrial',
    Rut: '72.555.888-5',
    NoFactura: 'F-65120',
    Estado: 'Disponible',
    Responsable: 'Equipo Mantencion',
    Ubicacion: 'Bodega Central',
    Notas: 'Asignados bajo préstamo según requerimiento.',
    Imagen: '',
  },
  {
    Nombre: 'Monitor LG UltraWide 34"',
    NoSerie: '',
    Categoria: 'Monitores',
    Tipo: 'Tangible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 2,
    'Fecha Ingreso': '2025-06-12',
    Proveedor: 'VisionTech',
    Rut: '73.876.543-1',
    NoFactura: 'F-88032',
    Estado: 'Operativo',
    Responsable: 'Carolina Torres',
    Ubicacion: 'Sala de Diseño',
    Notas: 'Asignado a estaciones de diseño gráfico.',
    Imagen: '',
  },
  {
    Nombre: 'Router Cisco Catalyst 9200',
    NoSerie: '',
    Categoria: 'Redes',
    Tipo: 'Tangible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 1,
    'Fecha Ingreso': '2024-12-15',
    Proveedor: 'NetServices',
    Rut: '65.987.123-4',
    NoFactura: 'F-33007',
    Estado: 'Operativo',
    Responsable: 'Departamento Redes',
    Ubicacion: 'Data Center',
    Notas: 'Configuración HA activa.',
    Imagen: '',
  },
  {
    Nombre: 'Set de Micrófonos Inalámbricos Shure',
    NoSerie: '',
    Categoria: 'Audiovisual',
    Tipo: 'Tangible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 1,
    'Fecha Ingreso': '2025-04-18',
    Proveedor: 'SoundPro',
    Rut: '69.222.111-9',
    NoFactura: 'F-77401',
    Estado: 'Operativo',
    Responsable: 'Departamento de Música',
    Ubicacion: 'Sala de Música',
    Notas: 'Incluye receptores y estuche rígido.',
    Imagen: '',
  },
  {
    Nombre: 'Kit de Robótica LEGO Education SPIKE',
    NoSerie: '',
    Categoria: 'Robótica',
    Tipo: 'Tangible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Basica',
    Cantidad: 4,
    'Fecha Ingreso': '2025-05-20',
    Proveedor: 'STEM Chile',
    Rut: '63.321.654-7',
    NoFactura: 'F-88112',
    Estado: 'Operativo',
    Responsable: 'Academia STEM',
    Ubicacion: 'Laboratorio STEM',
    Notas: 'Incluye manuales y tablets de control.',
    Imagen: '',
  },
  {
    Nombre: 'Silla ergonómica Herman Miller',
    NoSerie: '',
    Categoria: 'Mobiliario',
    Tipo: 'Tangible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 4,
    'Fecha Ingreso': '2025-03-01',
    Proveedor: 'Muebles Pro',
    Rut: '79.654.321-0',
    NoFactura: 'F-44210',
    Estado: 'Operativo',
    Responsable: 'Equipo de TI',
    Ubicacion: 'Oficina Coordinación',
    Notas: 'Asientos asignados a estaciones hot desk.',
    Imagen: '',
  },
  {
    Nombre: 'Cartucho de tinta Epson 502 Negro',
    NoSerie: '',
    Categoria: 'Suministros de impresión',
    Tipo: 'Fungible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 18,
    'Fecha Ingreso': '2025-05-28',
    Proveedor: 'Office Supply SPA',
    Rut: '96.123.456-8',
    NoFactura: 'F-90321',
    Estado: 'Consumible disponible',
    Responsable: 'Sala de Profesores',
    Ubicacion: 'Bodega de impresión',
    Notas: 'Reponer cuando queden 4 unidades.',
    Imagen: '',
  },
  {
    Nombre: 'Resmas de papel carta 75g',
    NoSerie: '',
    Categoria: 'Papelería',
    Tipo: 'Fungible',
    Subvencion: 'General',
    'Nivel Educativo': 'Educacion Basica',
    Cantidad: 40,
    'Fecha Ingreso': '2025-04-15',
    Proveedor: 'Papeles Andes',
    Rut: '62.457.890-3',
    NoFactura: 'F-78220',
    Estado: 'Consumible disponible',
    Responsable: 'Administración',
    Ubicacion: 'Almacén general',
    Notas: 'Cajas con sensor de humedad.',
    Imagen: '',
  },
  {
    Nombre: 'Alcohol gel 500 ml',
    NoSerie: '',
    Categoria: 'Higiene',
    Tipo: 'Fungible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Basica',
    Cantidad: 32,
    'Fecha Ingreso': '2025-03-22',
    Proveedor: 'Salud Integral Ltda.',
    Rut: '77.210.654-2',
    NoFactura: 'F-55210',
    Estado: 'Consumible disponible',
    Responsable: 'Inspectoría',
    Ubicacion: 'Bodega sanitaria',
    Notas: 'Reparto mensual a salas.',
    Imagen: '',
  },
  {
    Nombre: 'Pack baterías AA recargables',
    NoSerie: '',
    Categoria: 'Energía',
    Tipo: 'Fungible',
    Subvencion: 'Aulas Conectadas',
    'Nivel Educativo': 'Educacion Media',
    Cantidad: 24,
    'Fecha Ingreso': '2025-02-08',
    Proveedor: 'TecnoProveedor Ltda.',
    Rut: '76.543.210-5',
    NoFactura: 'F-88216',
    Estado: 'Consumible disponible',
    Responsable: 'Equipo TIC',
    Ubicacion: 'Laboratorio Informatica',
    Notas: 'Incluye cargadores rápidos.',
    Imagen: '',
  },
  {
    Nombre: 'Set de material didáctico STEM',
    NoSerie: '',
    Categoria: 'Material educativo',
    Tipo: 'Fungible',
    Subvencion: 'SEP',
    'Nivel Educativo': 'Educacion Basica',
    Cantidad: 15,
    'Fecha Ingreso': '2025-06-05',
    Proveedor: 'STEM Chile',
    Rut: '63.321.654-7',
    NoFactura: 'F-90345',
    Estado: 'Consumible disponible',
    Responsable: 'Academia STEM',
    Ubicacion: 'Sala de recursos',
    Notas: 'Reposición trimestral planificada.',
    Imagen: '',
  },
];

const mmToPoints = (mm) => (mm * 72) / 25.4;
const LABEL_PAGE_WIDTH_PT = mmToPoints(216);
const LABEL_PAGE_HEIGHT_PT = mmToPoints(279);
const LABEL_WIDTH_PT = mmToPoints(101);
const LABEL_HEIGHT_PT = mmToPoints(51);
const LABEL_COLUMNS = 2;
const LABEL_ROWS = 5;
const LABELS_PER_PAGE = LABEL_COLUMNS * LABEL_ROWS;
const LABEL_MARGIN_X_PT = (LABEL_PAGE_WIDTH_PT - LABEL_COLUMNS * LABEL_WIDTH_PT) / 2;
const LABEL_MARGIN_Y_PT = (LABEL_PAGE_HEIGHT_PT - LABEL_ROWS * LABEL_HEIGHT_PT) / 2;
const QR_SIZE_RATIO = 0.9;
const QR_SIZE_PT = Math.min(LABEL_WIDTH_PT, LABEL_HEIGHT_PT) * QR_SIZE_RATIO;
const REPORT_PAGE_WIDTH_PT = mmToPoints(210);
const REPORT_PAGE_HEIGHT_PT = mmToPoints(297);
const REPORT_MARGIN_X_PT = mmToPoints(20);
const REPORT_MARGIN_Y_PT = mmToPoints(20);
const REPORT_CONTENT_WIDTH_PT = REPORT_PAGE_WIDTH_PT - 2 * REPORT_MARGIN_X_PT;
const REPORT_LINE_GAP_PT = 4;
const REPORT_SECTION_GAP_PT = 10;
const REPORT_ITEM_INDENT_PT = mmToPoints(6);
const REPORT_QR_SIZE_PT = mmToPoints(28);
const REPORT_QR_GAP_PT = mmToPoints(6);
const REPORT_QR_COLUMNS = 4;
const REPORT_QR_LABEL_FONT_SIZE_PT = 8;
const REPORT_QR_MAX_LABEL_LINES = 2;
const REPORT_QR_LABEL_LINE_HEIGHT_PT = REPORT_QR_LABEL_FONT_SIZE_PT + 2;
const REPORT_QR_ROW_HEIGHT_PT =
  REPORT_QR_SIZE_PT +
  REPORT_QR_LABEL_LINE_HEIGHT_PT * REPORT_QR_MAX_LABEL_LINES +
  REPORT_QR_GAP_PT +
  6;

let itemCache = null;
let itemCachePath = null;

const cloneItems = (items = []) => items.map((item) => ({ ...item }));

const setItemCache = (filePath, items = []) => {
  itemCachePath = filePath;
  itemCache = cloneItems(items);
};

const getCachedItems = (filePath) => {
  if (itemCache && itemCachePath === filePath) {
    return cloneItems(itemCache);
  }
  return null;
};

const invalidateItemCache = () => {
  itemCache = null;
  itemCachePath = null;
};

const formatDateWithTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetRemainder = pad(Math.abs(offsetMinutes) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetRemainder}`;
};

const ensureFechaIngresoValue = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return formatDateWithTime();
  }
  const trimmed = String(rawValue).trim();
  return trimmed || formatDateWithTime();
};

function normalizeOptionValue(raw, map) {
  if (raw == null) {
    return '';
  }
  const value = String(raw).trim();
  if (!value) {
    return '';
  }
  const key = value.toLowerCase();
  if (map.has(key)) {
    return map.get(key);
  }
  return value;
}

function ensureUniqueSerial(baseSerial, existingSerials, fallbackPrefix = 'AUTO', options = {}) {
  const { forceSuffix = false, padWidth = 3, startAt = 1 } = options || {};
  const normalizedPrefix = normalizeSerial(fallbackPrefix) || 'AUTO';
  let candidate = normalizeSerial(baseSerial);
  if (!candidate) {
    candidate = normalizedPrefix;
  }

  if (!forceSuffix && !existingSerials.has(candidate)) {
    existingSerials.add(candidate);
    return candidate;
  }

  const safePadWidth = Number.isInteger(padWidth) && padWidth > 0 ? padWidth : 3;
  let suffix = Number.isInteger(startAt) && startAt > 0 ? startAt : 1;
  let uniqueSerial = `${candidate}-${String(suffix).padStart(safePadWidth, '0')}`;

  while (existingSerials.has(uniqueSerial)) {
    suffix += 1;
    uniqueSerial = `${candidate}-${String(suffix).padStart(safePadWidth, '0')}`;
  }

  existingSerials.add(uniqueSerial);
  return uniqueSerial;
}

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

  const normalizedTipo = normalizeOptionValue(normalized.Tipo || 'Tangible', ITEM_TYPE_OPTIONS);
  normalized.Tipo = normalizedTipo.toLowerCase() === 'fungible' ? ITEM_TYPE_OPTIONS.get('fungible') : ITEM_TYPE_OPTIONS.get('tangible');

  normalized.Subvencion = normalizeOptionValue(normalized.Subvencion || 'General', SUBVENCION_OPTIONS);
  normalized['Nivel Educativo'] = normalizeOptionValue(
    normalized['Nivel Educativo'] || 'General',
    NIVEL_EDUCATIVO_OPTIONS,
  );

  return normalized;
}

function itemToRow(item) {
  const normalized = normalizeItem(item);
  return [
    normalized.Nombre ?? '',
    normalized.NoSerie ?? '',
    normalized.Categoria ?? '',
    normalized.Tipo ?? '',
    normalized.Subvencion ?? '',
    normalized['Nivel Educativo'] ?? '',
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
  return normalizeSerialValue(value);
}

function normalizeRowNumber(value) {
  if (Number.isInteger(value)) {
    return value >= DATA_START_ROW ? value : null;
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= DATA_START_ROW ? numeric : null;
}

function normalizeSelectionEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
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
  item['Fecha Ingreso'] = ensureFechaIngresoValue(item['Fecha Ingreso']);
  const { workbook, sheet } = await ensureWorkbook(filePath);

  const cachedItems = getCachedItems(filePath);
  const existingSerials = new Set();
  if (cachedItems) {
    cachedItems.forEach((entry) => {
      const serial = normalizeSerial(entry?.NoSerie);
      if (serial) {
        existingSerials.add(serial);
      }
    });
  } else {
    for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const serialValue = extractSerialFromValue(
        sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value,
      );
      if (serialValue) {
        existingSerials.add(serialValue);
      }
    }
  }

  const fallbackPrefixRaw = item.Nombre
    ? item.Nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    : '';
  const fallbackPrefix = fallbackPrefixRaw || 'AUTO';
  const hasUserSerial = Boolean(item.NoSerie);
  const baseSerial = hasUserSerial ? item.NoSerie : deriveSerialBase(item);

  item.NoSerie = ensureUniqueSerial(baseSerial, existingSerials, fallbackPrefix, {
    forceSuffix: !hasUserSerial,
    padWidth: 3,
    startAt: 1,
  });

  const newRowNumber = sheet.rowCount + 1;
  sheet.addRow(itemToRow(item));
  await workbook.xlsx.writeFile(filePath);
  if (cachedItems) {
    const updatedCache = [...cachedItems, { ...item, _rowNumber: newRowNumber }];
    setItemCache(filePath, updatedCache);
  } else {
    invalidateItemCache();
  }
  return generateQrForItem(item);
}

export async function getAllItems(filePath) {
  const cached = getCachedItems(filePath);
  if (cached) {
    return cached;
  }

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

  setItemCache(filePath, items);
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


export async function importItemsFromFile(targetPath, sourcePath) {
  if (!sourcePath) {
    throw new Error('sourcePath is required');
  }

  const sourceWorkbook = new ExcelJS.Workbook();
  await sourceWorkbook.xlsx.readFile(sourcePath);

  let sourceSheet = null;
  for (const sheet of sourceWorkbook.worksheets) {
    const headerRow = sheet.getRow(1);
    const headerValues = headerRow?.values?.slice(1) ?? [];
    const matchesHeaders = HEADERS.every((header, index) => {
      const cellValue = headerValues[index];
      const normalized = cellValue == null ? '' : String(cellValue).trim();
      return normalized === header;
    });
    if (matchesHeaders) {
      sourceSheet = sheet;
      break;
    }
  }

  if (!sourceSheet) {
    throw new Error('El archivo seleccionado no contiene los encabezados esperados.');
  }

  const importedItems = [];
  for (let rowNumber = DATA_START_ROW; rowNumber <= sourceSheet.rowCount; rowNumber += 1) {
    const row = sourceSheet.getRow(rowNumber);
    if (!row || !row.hasValues) {
      continue;
    }
    importedItems.push(rowToNormalizedItem(row, rowNumber));
  }

  const { workbook, sheet } = await ensureWorkbook(targetPath);
  if (!sheet) {
    return { imported: 0 };
  }

  const existingRowCount = sheet.rowCount - DATA_START_ROW + 1;
  if (existingRowCount > 0) {
    sheet.spliceRows(DATA_START_ROW, existingRowCount);
  }

  importedItems.forEach((item) => {
    sheet.addRow(itemToRow(item));
  });

  await workbook.xlsx.writeFile(targetPath);
  invalidateItemCache();
  return { imported: importedItems.length };
}
export async function generateLabelsPdf(sourcePath, rawEntries = [], destinationPath) {
  if (!destinationPath) {
    throw new Error('destinationPath is required');
  }

  const normalizedEntries = normalizeSelectionEntries(rawEntries);
  const totalRequested = normalizedEntries.length;

  if (totalRequested === 0) {
    return { printed: 0, totalRequested: 0, missing: 0 };
  }

  const allItems = await getAllItems(sourcePath);
  if (allItems.length === 0) {
    return { printed: 0, totalRequested, missing: totalRequested };
  }

  const serialMap = new Map();
  const rowMap = new Map();
  allItems.forEach((item) => {
    const serial = normalizeSerial(item.NoSerie);
    const rowNumber = normalizeRowNumber(item._rowNumber);
    if (serial && !serialMap.has(serial)) {
      serialMap.set(serial, item);
    }
    if (rowNumber != null && !rowMap.has(rowNumber)) {
      rowMap.set(rowNumber, item);
    }
  });

  const matchedItems = [];
  const missingEntries = [];
  const seenKeys = new Set();

  normalizedEntries.forEach((entry) => {
    let candidate = null;
    if (entry.serial && serialMap.has(entry.serial)) {
      candidate = serialMap.get(entry.serial);
    }
    if (!candidate && entry.rowNumber != null && rowMap.has(entry.rowNumber)) {
      candidate = rowMap.get(entry.rowNumber);
    }
    if (!candidate) {
      missingEntries.push(entry);
      return;
    }

    const candidateSerial = normalizeSerial(candidate.NoSerie);
    const candidateRow = normalizeRowNumber(candidate._rowNumber);
    const key = `${candidateSerial}|${candidateRow ?? ''}`;
    if (seenKeys.has(key)) {
      return;
    }
    seenKeys.add(key);
    matchedItems.push(candidate);
  });

  if (matchedItems.length === 0) {
    return { printed: 0, totalRequested, missing: totalRequested };
  }

  const compareByInsertionOrder = (itemA, itemB) => {
    const rowA = normalizeRowNumber(itemA?._rowNumber);
    const rowB = normalizeRowNumber(itemB?._rowNumber);
    if (rowA != null && rowB != null && rowA !== rowB) {
      return rowA - rowB;
    }
    if (rowA != null) {
      return -1;
    }
    if (rowB != null) {
      return 1;
    }

    const dateA = Date.parse(itemA?.['Fecha Ingreso']);
    const dateB = Date.parse(itemB?.['Fecha Ingreso']);
    if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateA !== dateB) {
      return dateA - dateB;
    }

    const serialA = normalizeSerial(itemA?.NoSerie);
    const serialB = normalizeSerial(itemB?.NoSerie);
    if (serialA && serialB && serialA !== serialB) {
      return serialA.localeCompare(serialB);
    }

    const nameA = (itemA?.Nombre || '').toLowerCase();
    const nameB = (itemB?.Nombre || '').toLowerCase();
    return nameA.localeCompare(nameB);
  };

  matchedItems.sort(compareByInsertionOrder);

  const pdfDoc = await PDFDocument.create();
  const pageSize = [LABEL_PAGE_WIDTH_PT, LABEL_PAGE_HEIGHT_PT];

  const qrPayloads = [];
  for (const item of matchedItems) {
    const qrDataUrl = await generateQrForItem(item);
    qrPayloads.push({ item, qrDataUrl });
  }

  let page = null;

  for (let index = 0; index < qrPayloads.length; index += 1) {
    if (index % LABELS_PER_PAGE === 0) {
      page = pdfDoc.addPage(pageSize);
    }

    const slotIndex = index % LABELS_PER_PAGE;
    const column = slotIndex % LABEL_COLUMNS;
    const row = Math.floor(slotIndex / LABEL_COLUMNS);
    const labelX = LABEL_MARGIN_X_PT + column * LABEL_WIDTH_PT;
    const labelY = LABEL_PAGE_HEIGHT_PT - LABEL_MARGIN_Y_PT - (row + 1) * LABEL_HEIGHT_PT;

    const qrImage = await pdfDoc.embedPng(qrPayloads[index].qrDataUrl);
    const qrX = labelX + (LABEL_WIDTH_PT - QR_SIZE_PT) / 2;
    const qrY = labelY + (LABEL_HEIGHT_PT - QR_SIZE_PT) / 2;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: QR_SIZE_PT,
      height: QR_SIZE_PT,
    });
  }

  const pdfBytes = await pdfDoc.save();
  await fsWriteFile(destinationPath, pdfBytes);

  return {
    printed: matchedItems.length,
    totalRequested,
    missing: missingEntries.length,
  };
}

function wrapTextForWidth(text, font, size, maxWidth) {
  const normalized = String(text ?? '');
  if (!normalized) {
    return [''];
  }
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, size);
    if (candidateWidth <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

function resolveItemQuantity(value) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.round(numeric);
  }
  return 1;
}

function extractItemName(item) {
  const raw = item?.Nombre ?? '';
  const text = String(raw).trim();
  return text || 'Item sin nombre';
}

function extractLocationName(item) {
  const raw = item?.Ubicacion ?? '';
  const text = String(raw).trim();
  return text || 'Ubicacion sin especificar';
}

function buildCompactQrLabel(item) {
  const quantity = resolveItemQuantity(item?.Cantidad);
  const name = extractItemName(item);
  const baseLabel = `${quantity} x ${name}`;
  if (baseLabel.length <= 32) {
    return baseLabel;
  }
  return `${baseLabel.slice(0, 31)}…`;
}

function formatReportTimestamp(date) {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'long',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export async function generateLocationReportPdf(sourcePath, rawEntries = [], destinationPath) {
  if (!destinationPath) {
    throw new Error('destinationPath is required');
  }

  const normalizedEntries = normalizeSelectionEntries(rawEntries);
  const totalRequested = normalizedEntries.length;

  if (totalRequested === 0) {
    return { totalRequested: 0, missing: 0, groupedLocations: 0, totalUnits: 0, totalLines: 0 };
  }

  const allItems = await getAllItems(sourcePath);
  if (allItems.length === 0) {
    return {
      totalRequested,
      missing: totalRequested,
      groupedLocations: 0,
      totalUnits: 0,
      totalLines: 0,
    };
  }

  const serialMap = new Map();
  const rowMap = new Map();
  allItems.forEach((item) => {
    const serial = normalizeSerial(item.NoSerie);
    const rowNumber = normalizeRowNumber(item._rowNumber);
    if (serial && !serialMap.has(serial)) {
      serialMap.set(serial, item);
    }
    if (rowNumber != null && !rowMap.has(rowNumber)) {
      rowMap.set(rowNumber, item);
    }
  });

  const matchedItems = [];
  const missingEntries = [];
  const seenKeys = new Set();

  normalizedEntries.forEach((entry) => {
    let candidate = null;
    if (entry.serial && serialMap.has(entry.serial)) {
      candidate = serialMap.get(entry.serial);
    }
    if (!candidate && entry.rowNumber != null && rowMap.has(entry.rowNumber)) {
      candidate = rowMap.get(entry.rowNumber);
    }
    if (!candidate) {
      missingEntries.push(entry);
      return;
    }
    const normalizedSerial = normalizeSerial(candidate.NoSerie);
    const normalizedRow = normalizeRowNumber(candidate._rowNumber);
    const key = `${normalizedSerial}|${normalizedRow ?? ''}`;
    if (seenKeys.has(key)) {
      return;
    }
    seenKeys.add(key);
    matchedItems.push(candidate);
  });

  if (matchedItems.length === 0) {
    return {
      totalRequested,
      missing: totalRequested,
      groupedLocations: 0,
      totalUnits: 0,
      totalLines: 0,
    };
  }

  const locationMap = new Map();
  matchedItems.forEach((item) => {
    const locationName = extractLocationName(item);
    const locationKey = locationName.toLowerCase();
    let locationEntry = locationMap.get(locationKey);
    if (!locationEntry) {
      locationEntry = {
        location: locationName,
        items: new Map(),
        totalUnits: 0,
      };
      locationMap.set(locationKey, locationEntry);
    }
    const itemName = extractItemName(item);
    const itemKey = itemName.toLowerCase();
    const quantity = resolveItemQuantity(item.Cantidad);
    const aggregatedItem = locationEntry.items.get(itemKey) || { name: itemName, quantity: 0 };
    aggregatedItem.quantity += quantity;
    locationEntry.items.set(itemKey, aggregatedItem);
    locationEntry.totalUnits += quantity;
  });

  const groupedSummary = Array.from(locationMap.values())
    .map((group) => ({
      location: group.location,
      totalUnits: group.totalUnits,
      items: Array.from(group.items.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => a.location.localeCompare(b.location, undefined, { sensitivity: 'base' }));

  const totalUnits = groupedSummary.reduce((accumulator, group) => accumulator + group.totalUnits, 0);
  const totalLines = groupedSummary.reduce(
    (accumulator, group) => accumulator + group.items.length,
    0,
  );
  const qrPayloads = [];
  for (const item of matchedItems) {
    try {
      const qrDataUrl = await generateQrForItem(item);
      if (qrDataUrl) {
        qrPayloads.push({ item, qrDataUrl });
      }
    } catch (error) {
      console.error('Failed to generate QR for report item', error);
    }
  }

  const pdfDoc = await PDFDocument.create();
  const headingFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const accentColor = rgb(0.24, 0.32, 0.55);
  const mutedColor = rgb(0.42, 0.45, 0.5);

  let page = pdfDoc.addPage([REPORT_PAGE_WIDTH_PT, REPORT_PAGE_HEIGHT_PT]);
  let cursorY = REPORT_PAGE_HEIGHT_PT - REPORT_MARGIN_Y_PT;

  const ensureSpace = (spaceNeeded) => {
    if (cursorY - spaceNeeded < REPORT_MARGIN_Y_PT) {
      page = pdfDoc.addPage([REPORT_PAGE_WIDTH_PT, REPORT_PAGE_HEIGHT_PT]);
      cursorY = REPORT_PAGE_HEIGHT_PT - REPORT_MARGIN_Y_PT;
    }
  };

  const drawLines = (lines, { font = bodyFont, size = 11, color = rgb(0, 0, 0), indent = 0 } = {}) => {
    const lineHeight = size + REPORT_LINE_GAP_PT;
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: REPORT_MARGIN_X_PT + indent,
        y: cursorY - size,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    });
  };

  const drawParagraph = (text, options = {}) => {
    const font = options.font ?? bodyFont;
    const size = options.size ?? 11;
    const indent = options.indent ?? 0;
    const maxWidth = Math.max(10, REPORT_CONTENT_WIDTH_PT - indent);
    const lines = wrapTextForWidth(text, font, size, maxWidth);
    drawLines(lines, { ...options, font, size, indent });
  };

  drawParagraph('Resumen por ubicacion', {
    font: headingFont,
    size: 20,
    color: accentColor,
  });
  drawParagraph(
    `Generado el ${formatReportTimestamp(new Date())} · ${groupedSummary.length} ubicacion(es) · ${totalUnits} unidad(es)`,
    { size: 11, color: mutedColor },
  );
  cursorY -= REPORT_SECTION_GAP_PT;

  groupedSummary.forEach((group, index) => {
    drawParagraph(group.location, { font: headingFont, size: 15, color: accentColor });
    drawParagraph(
      `${group.items.length} linea(s) · ${group.totalUnits} unidad(es)`,
      { size: 10, color: mutedColor },
    );
    cursorY -= REPORT_LINE_GAP_PT / 2;

    group.items.forEach((item) => {
      drawParagraph(`${item.quantity} x ${item.name}`, {
        size: 12,
        indent: REPORT_ITEM_INDENT_PT,
      });
    });

    if (index < groupedSummary.length - 1) {
      cursorY -= REPORT_SECTION_GAP_PT;
    }
  });

  cursorY -= REPORT_SECTION_GAP_PT;
  drawParagraph(
    `Total seleccionado: ${matchedItems.length} registro(s) · ${totalLines} linea(s) · ${totalUnits} unidad(es)`,
    { font: headingFont, size: 11 },
  );

  if (missingEntries.length > 0) {
    drawParagraph(
      `No se pudieron ubicar ${missingEntries.length} registro(s) en la planilla.`,
      { size: 10, color: rgb(0.7, 0.25, 0.25) },
    );
  }

  if (qrPayloads.length > 0) {
    const startQrPage = (isContinuation = false) => {
      page = pdfDoc.addPage([REPORT_PAGE_WIDTH_PT, REPORT_PAGE_HEIGHT_PT]);
      cursorY = REPORT_PAGE_HEIGHT_PT - REPORT_MARGIN_Y_PT;
      const headingText = isContinuation
        ? 'Codigos QR de los items listados (continuacion)'
        : 'Codigos QR de los items listados';
      drawParagraph(headingText, { font: headingFont, size: 16, color: accentColor });
      drawParagraph('Version compacta para referencia visual.', { size: 9, color: mutedColor });
      cursorY -= REPORT_SECTION_GAP_PT;
      return cursorY;
    };

    let qrRowTop = startQrPage(false);
    let columnIndex = 0;

    for (let index = 0; index < qrPayloads.length; index += 1) {
      if (columnIndex >= REPORT_QR_COLUMNS) {
        columnIndex = 0;
        qrRowTop -= REPORT_QR_ROW_HEIGHT_PT;
      }

      if (qrRowTop - REPORT_QR_ROW_HEIGHT_PT < REPORT_MARGIN_Y_PT) {
        qrRowTop = startQrPage(true);
        columnIndex = 0;
      }

      const payload = qrPayloads[index];
      let qrImage;
      try {
        qrImage = await pdfDoc.embedPng(payload.qrDataUrl);
      } catch (error) {
        console.error('Failed to embed QR for report item', error);
        columnIndex += 1;
        continue;
      }

      const x = REPORT_MARGIN_X_PT + columnIndex * (REPORT_QR_SIZE_PT + REPORT_QR_GAP_PT);
      const imageY = qrRowTop - REPORT_QR_SIZE_PT;
      page.drawImage(qrImage, {
        x,
        y: imageY,
        width: REPORT_QR_SIZE_PT,
        height: REPORT_QR_SIZE_PT,
      });

      const label = buildCompactQrLabel(payload.item);
      const labelLines = wrapTextForWidth(
        label,
        bodyFont,
        REPORT_QR_LABEL_FONT_SIZE_PT,
        REPORT_QR_SIZE_PT,
      ).slice(0, REPORT_QR_MAX_LABEL_LINES);
      labelLines.forEach((line, lineIndex) => {
        const labelY =
          imageY -
          4 -
          REPORT_QR_LABEL_FONT_SIZE_PT -
          lineIndex * REPORT_QR_LABEL_LINE_HEIGHT_PT;
        page.drawText(line, {
          x,
          y: labelY,
          size: REPORT_QR_LABEL_FONT_SIZE_PT,
          font: bodyFont,
          color: mutedColor,
        });
      });

      columnIndex += 1;
    }
  }

  const pdfBytes = await pdfDoc.save();
  await fsWriteFile(destinationPath, pdfBytes);

  return {
    totalRequested,
    missing: missingEntries.length,
    groupedLocations: groupedSummary.length,
    totalUnits,
    totalLines,
  };
}

export async function seedDemoItems(filePath) {
  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { added: 0 };
  }

  const existingSerials = new Set();
  const existingKeys = new Set();

  for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const serialValue = extractSerialFromValue(
      sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value,
    );
    if (serialValue) {
      existingSerials.add(serialValue);
    }
    const nombreValue = sheet.getCell(rowNumber, HEADER_INDEX.Nombre + 1).value ?? '';
    const ubicacionValue = sheet.getCell(rowNumber, HEADER_INDEX.Ubicacion + 1).value ?? '';
    const key = `${normalizeSerial(nombreValue).toLowerCase()}|${normalizeSerial(ubicacionValue).toLowerCase()}`;
    existingKeys.add(key);
  }

  let added = 0;

  DEMO_ITEMS.forEach((item, index) => {
    const normalized = normalizeItem(item);
    const key = `${normalized.Nombre.toLowerCase()}|${normalized.Ubicacion.toLowerCase()}`;
    if (existingKeys.has(key)) {
      return;
    }

    const fallbackPrefix =
      normalized.Nombre?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) ||
      `DEMO${index + 1}`;

    const hasUserSerial = Boolean(normalized.NoSerie);
    const baseSerial = hasUserSerial ? normalized.NoSerie : deriveSerialBase(normalized);

    normalized.NoSerie = ensureUniqueSerial(baseSerial, existingSerials, fallbackPrefix, {
      forceSuffix: !hasUserSerial,
      padWidth: 3,
      startAt: 1,
    });

    sheet.addRow(itemToRow(normalized));
    existingKeys.add(key);
    added += 1;
  });

  if (added === 0) {
    return { added: 0 };
  }

  await workbook.xlsx.writeFile(filePath);
  invalidateItemCache();
  return { added };
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

  const cachedItems = getCachedItems(filePath);
  if (cachedItems) {
    const updatedCache = cachedItems.map((entry) => {
      const entryRow = normalizeRowNumber(entry?._rowNumber);
      const entrySerial = normalizeSerial(entry?.NoSerie);
      if (entryRow === rowIndex || (targetSerial && entrySerial === targetSerial)) {
        return { ...item };
      }
      return entry;
    });
    setItemCache(filePath, updatedCache);
  } else {
    invalidateItemCache();
  }

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
    invalidateItemCache();
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
    invalidateItemCache();
  }

  return { restored: rowsToAdd.length };
}

export async function markItemsAsBaja(filePath, entries = [], options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { updated: 0, items: [] };
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
    return { updated: 0, items: [] };
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { updated: 0, items: [] };
  }

  const targetEstadoRaw =
    typeof options.estado === 'string' ? options.estado.trim() : DEFAULT_BAJA_ESTADO;
  const targetEstado = targetEstadoRaw || DEFAULT_BAJA_ESTADO;

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

  let updated = 0;
  const updatedItems = [];

  for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const shouldUpdateByRow = rowTargets.has(rowNumber);
    let serial = '';
    let shouldUpdateBySerial = false;

    if (!shouldUpdateByRow && serialTargets.size > 0) {
      const cellValue = sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value;
      serial = extractSerialFromValue(cellValue);
      shouldUpdateBySerial = Boolean(serial && serialTargets.has(serial));
    }

    if (!shouldUpdateByRow && !shouldUpdateBySerial) {
      continue;
    }

    const row = sheet.getRow(rowNumber);
    if (!row || !row.hasValues) {
      continue;
    }

    const currentItem = rowToNormalizedItem(row, rowNumber);
    const currentEstado = currentItem.Estado ?? '';

    if (currentEstado === targetEstado) {
      updatedItems.push(currentItem);
    } else {
      row.getCell(ESTADO_COLUMN_INDEX).value = targetEstado;
      const updatedItem = {
        ...currentItem,
        Estado: targetEstado,
      };
      updatedItems.push(updatedItem);
      updated += 1;
    }

    if (shouldUpdateByRow) {
      rowTargets.delete(rowNumber);
    }
    if (shouldUpdateBySerial && serial) {
      serialTargets.delete(serial);
    }

    if (rowTargets.size === 0 && serialTargets.size === 0) {
      break;
    }
  }

  if (updated > 0) {
    await workbook.xlsx.writeFile(filePath);
    const cachedItems = getCachedItems(filePath);
    if (cachedItems) {
      const updatedCache = cachedItems.map((entry) => {
        const entryRow = normalizeRowNumber(entry?._rowNumber);
        const entrySerial = normalizeSerial(entry?.NoSerie);
        const shouldUpdate =
          rowTargets.has(entryRow) ||
          serialTargets.has(entrySerial) ||
          normalizedEntries.some(
            (target) =>
              (target.rowNumber != null && target.rowNumber === entryRow) ||
              (target.serial && target.serial === entrySerial),
          );
        if (!shouldUpdate) {
          return entry;
        }
        return {
          ...entry,
          Estado: targetEstado,
        };
      });
      setItemCache(filePath, updatedCache);
    } else {
      invalidateItemCache();
    }
  }

  return { updated, items: updatedItems };
}

export async function saveItemsBatch(filePath, rawItems = []) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { saved: 0, items: [], qrData: [] };
  }

  const pendingItems = rawItems.filter((entry) => entry && typeof entry === 'object');
  if (pendingItems.length === 0) {
    return { saved: 0, items: [], qrData: [] };
  }

  const { workbook, sheet } = await ensureWorkbook(filePath);
  if (!sheet) {
    return { saved: 0, items: [], qrData: [] };
  }

  const existingSerials = new Set();
  const cachedItems = getCachedItems(filePath);
  if (cachedItems) {
    cachedItems.forEach((entry) => {
      const serial = normalizeSerial(entry?.NoSerie);
      if (serial) {
        existingSerials.add(serial);
      }
    });
  } else {
    for (let rowNumber = DATA_START_ROW; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const serialValue = extractSerialFromValue(
        sheet.getCell(rowNumber, SERIAL_COLUMN_INDEX).value,
      );
      if (serialValue) {
        existingSerials.add(serialValue);
      }
    }
  }

  const savedItems = [];
  const startingRow = sheet.rowCount + 1;
  let rowOffset = 0;
  pendingItems.forEach((entry) => {
    const normalized = normalizeItem(entry);
    normalized['Fecha Ingreso'] = ensureFechaIngresoValue(normalized['Fecha Ingreso']);
    const fallbackPrefixRaw = normalized.Nombre
      ? normalized.Nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
      : '';
    const fallbackPrefix = fallbackPrefixRaw || 'AUTO';

    const hasUserSerial = Boolean(normalized.NoSerie);
    const baseSerial = hasUserSerial ? normalized.NoSerie : deriveSerialBase(normalized);

    normalized.NoSerie = ensureUniqueSerial(baseSerial, existingSerials, fallbackPrefix, {
      forceSuffix: !hasUserSerial,
      padWidth: 3,
      startAt: 1,
    });

    sheet.addRow(itemToRow(normalized));
    const rowNumber = startingRow + rowOffset;
    rowOffset += 1;
    savedItems.push({ ...normalized, _rowNumber: rowNumber });
  });

  if (savedItems.length === 0) {
    return { saved: 0, items: [], qrData: [] };
  }

  await workbook.xlsx.writeFile(filePath);

  if (cachedItems) {
    const updatedCache = [...cachedItems, ...savedItems];
    setItemCache(filePath, updatedCache);
  } else {
    invalidateItemCache();
  }

  const qrData = [];
  for (const item of savedItems) {
    const qrDataUrl = await generateQrForItem(item);
    qrData.push({
      NoSerie: item.NoSerie,
      qrDataUrl,
    });
  }

  return {
    saved: savedItems.length,
    items: savedItems,
    qrData,
  };
}
