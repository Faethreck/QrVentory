/**
 * Utility script to seed QrVentory's data.xlsx with sample entries for testing filters/sorting.
 * Run with: `node scripts/add-test-items.js`
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const ExcelJS = require('exceljs');

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

const DATA_START_ROW = 2;

const SAMPLE_ITEMS = [
  {
    Nombre: 'Notebook Dell XPS 13',
    NoSerie: 'LOC-OFI-COM-250910-01',
    Categoria: 'Computadores',
    Cantidad: 1,
    'Fecha Ingreso': '2025-09-10',
    Proveedor: 'TecnoProveedor Ltda.',
    Rut: '76.543.210-5',
    NoFactura: 'F-98213',
    Estado: 'Operativo',
    Responsable: 'Carolina Torres',
    Ubicacion: 'Oficina Santiago',
    Notas: 'Equipo asignado a gerencia.',
    Imagen: '',
  },
  {
    Nombre: 'Impresora HP LaserJet Pro',
    NoSerie: 'LOC-IMP-OFI-250818-02',
    Categoria: 'Impresoras',
    Cantidad: 1,
    'Fecha Ingreso': '2025-08-18',
    Proveedor: 'Office Supply SPA',
    Rut: '96.123.456-8',
    NoFactura: 'F-77102',
    Estado: 'En mantención',
    Responsable: 'Luis Rojas',
    Ubicacion: 'Oficina Santiago',
    Notas: 'Requiere cambio de rodillo.',
    Imagen: '',
  },
  {
    Nombre: 'Proyector Epson PowerLite',
    NoSerie: 'LOC-SALA-AUD-250705-03',
    Categoria: 'Audiovisual',
    Cantidad: 1,
    'Fecha Ingreso': '2025-07-05',
    Proveedor: 'VisualTech',
    Rut: '82.456.789-2',
    NoFactura: 'F-55901',
    Estado: 'Operativo',
    Responsable: 'María Fernández',
    Ubicacion: 'Sala de reuniones - Auditorio',
    Notas: 'Lámpara reemplazada en agosto.',
    Imagen: '',
  },
  {
    Nombre: 'Silla ergonómica Herman Miller',
    NoSerie: 'LOC-OFI-MUE-250301-04',
    Categoria: 'Mobiliario',
    Cantidad: 4,
    'Fecha Ingreso': '2025-03-01',
    Proveedor: 'Muebles Pro',
    Rut: '79.654.321-0',
    NoFactura: 'F-44210',
    Estado: 'Operativo',
    Responsable: 'Equipo de TI',
    Ubicacion: 'Oficina Valparaíso',
    Notas: 'Asignadas a estaciones hot desk.',
    Imagen: '',
  },
  {
    Nombre: 'Router Cisco Catalyst',
    NoSerie: 'LOC-RED-DAT-241215-05',
    Categoria: 'Redes',
    Cantidad: 2,
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
    Nombre: 'Servidor HPE ProLiant DL380',
    NoSerie: 'LOC-RED-DAT-241001-06',
    Categoria: 'Servidores',
    Cantidad: 1,
    'Fecha Ingreso': '2024-10-01',
    Proveedor: 'CloudLogic',
    Rut: '61.234.987-6',
    NoFactura: 'F-22990',
    Estado: 'Operativo',
    Responsable: 'Departamento Redes',
    Ubicacion: 'Data Center',
    Notas: 'Servidor de virtualización principal.',
    Imagen: '',
  },
  {
    Nombre: 'Tablet Samsung Galaxy Tab S9',
    NoSerie: 'LOC-MOV-VENT-250902-07',
    Categoria: 'Dispositivos móviles',
    Cantidad: 3,
    'Fecha Ingreso': '2025-09-02',
    Proveedor: 'Tech Mobile',
    Rut: '70.111.222-3',
    NoFactura: 'F-99021',
    Estado: 'Operativo',
    Responsable: 'Equipo Comercial',
    Ubicacion: 'Sala Ventas',
    Notas: 'Usadas para demostraciones de producto.',
    Imagen: '',
  },
  {
    Nombre: 'Monitor LG UltraWide 34"',
    NoSerie: 'LOC-OFI-COM-250612-08',
    Categoria: 'Monitores',
    Cantidad: 2,
    'Fecha Ingreso': '2025-06-12',
    Proveedor: 'VisionTech',
    Rut: '73.876.543-1',
    NoFactura: 'F-88032',
    Estado: 'Operativo',
    Responsable: 'Carolina Torres',
    Ubicacion: 'Oficina Santiago',
    Notas: 'Asignado a estaciones de diseño.',
    Imagen: '',
  },
  {
    Nombre: 'Cámara de seguridad Hikvision',
    NoSerie: 'LOC-SEG-BOD-240915-09',
    Categoria: 'Seguridad',
    Cantidad: 6,
    'Fecha Ingreso': '2024-09-15',
    Proveedor: 'SafeHome SPA',
    Rut: '68.432.199-7',
    NoFactura: 'F-19877',
    Estado: 'Operativo',
    Responsable: 'Seguridad',
    Ubicacion: 'Bodega Central',
    Notas: 'Cámaras IP con almacenamiento en NVR.',
    Imagen: '',
  },
  {
    Nombre: 'Kit de herramientas Truper',
    NoSerie: 'LOC-MAN-BOD-250104-10',
    Categoria: 'Herramientas',
    Cantidad: 5,
    'Fecha Ingreso': '2025-01-04',
    Proveedor: 'Ferretería Industrial',
    Rut: '72.555.888-5',
    NoFactura: 'F-65120',
    Estado: 'Disponible',
    Responsable: 'Equipo Mantención',
    Ubicacion: 'Bodega Central',
    Notas: 'Asignados bajo préstamo según requerimiento.',
    Imagen: '',
  },
  {
    Nombre: 'Switch Ubiquiti UniFi 24p',
    NoSerie: 'LOC-RED-SUC-241030-11',
    Categoria: 'Redes',
    Cantidad: 3,
    'Fecha Ingreso': '2024-10-30',
    Proveedor: 'NetServices',
    Rut: '65.987.123-4',
    NoFactura: 'F-33099',
    Estado: 'Operativo',
    Responsable: 'Departamento Redes',
    Ubicacion: 'Sucursal Concepción',
    Notas: 'Configuración en modo PoE completo.',
    Imagen: '',
  },
  {
    Nombre: 'TV Samsung 65" QLED',
    NoSerie: 'LOC-SALA-AUD-250211-12',
    Categoria: 'Audiovisual',
    Cantidad: 1,
    'Fecha Ingreso': '2025-02-11',
    Proveedor: 'ElectroHome',
    Rut: '80.987.654-3',
    NoFactura: 'F-50987',
    Estado: 'Operativo',
    Responsable: 'Eventos Corporativos',
    Ubicacion: 'Sala de reuniones - Auditorio',
    Notas: 'Control remoto en recepción.',
    Imagen: '',
  },
  {
    Nombre: 'Kit realidad virtual Meta Quest 3',
    NoSerie: 'LOC-I+D-LAB-250901-13',
    Categoria: 'Innovación',
    Cantidad: 2,
    'Fecha Ingreso': '2025-09-01',
    Proveedor: 'FutureLab',
    Rut: '74.210.365-9',
    NoFactura: 'F-99210',
    Estado: 'Operativo',
    Responsable: 'Laboratorio I+D',
    Ubicacion: 'Laboratorio Innovación',
    Notas: 'Uso restringido con reserva previa.',
    Imagen: '',
  },
  {
    Nombre: 'Batería UPS APC Smart-UPS',
    NoSerie: 'LOC-RED-DAT-240601-14',
    Categoria: 'Energía',
    Cantidad: 2,
    'Fecha Ingreso': '2024-06-01',
    Proveedor: 'PowerTech',
    Rut: '63.210.987-2',
    NoFactura: 'F-21078',
    Estado: 'Operativo',
    Responsable: 'Departamento Redes',
    Ubicacion: 'Data Center',
    Notas: 'Autonomía de 45 minutos por unidad.',
    Imagen: '',
  },
];

function resolveUserDataPath() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'QrVentory');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'QrVentory');
  }

  return path.join(os.homedir(), '.config', 'QrVentory');
}

function normalizeSerial(value) {
  return value == null ? '' : String(value).trim();
}

async function ensureDirectory(directory) {
  await fs.mkdir(directory, { recursive: true });
}

async function ensureWorksheet(workbook) {
  let sheet = workbook.getWorksheet('Sheet1');
  if (!sheet) {
    sheet = workbook.addWorksheet('Sheet1');
    sheet.addRow(HEADERS);
    return sheet;
  }

  const headerRow = sheet.getRow(1);
  const rowValues = headerRow.values.slice(1);
  const matches =
    rowValues.length === HEADERS.length &&
    rowValues.every((value, index) => value === HEADERS[index]);

  if (!matches) {
    sheet.spliceRows(1, 1, HEADERS);
  }

  return sheet;
}

function toRow(item) {
  return HEADERS.map((header) => item[header] ?? '');
}

async function addSampleItems() {
  const userDataDir = resolveUserDataPath();
  await ensureDirectory(userDataDir);

  const filePath = path.join(userDataDir, 'data.xlsx');
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(filePath);
  } catch {
    // File does not exist yet; continue with empty workbook.
  }

  const sheet = await ensureWorksheet(workbook);

  const existingSerials = new Set();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < DATA_START_ROW) {
      return;
    }
    const serialCell = row.getCell(2).value;
    const serial = normalizeSerial(
      typeof serialCell === 'object' && serialCell !== null && 'text' in serialCell
        ? serialCell.text
        : serialCell,
    );
    if (serial) {
      existingSerials.add(serial);
    }
  });

  const itemsToInsert = SAMPLE_ITEMS.filter((item) => {
    const serial = normalizeSerial(item.NoSerie);
    return serial && !existingSerials.has(serial);
  });

  if (itemsToInsert.length === 0) {
    console.log('No new sample items to insert. Skipping.');
    return;
  }

  itemsToInsert.forEach((item) => {
    sheet.addRow(toRow(item));
  });

  await workbook.xlsx.writeFile(filePath);
  console.log(`Added ${itemsToInsert.length} sample item(s) to ${filePath}`);
}

addSampleItems().catch((error) => {
  console.error('Failed to add sample items:', error);
  process.exitCode = 1;
});
