import { deriveSerialBase, normalizeSerialValue } from './shared/serial.js';

const statusNotification = document.getElementById('status-notification');
const singleForm = document.getElementById('item-form');
const batchForm = document.getElementById('batch-form');
const form = singleForm;
const qrContainer = document.getElementById('qr-container');
const qrSection = document.getElementById('qr-section');
const qrImage = document.getElementById('qr-image');
const mainTabTriggers = document.querySelectorAll('[data-main-tab]');
const mainTabPanels = document.querySelectorAll('[data-main-panel]');
const formModeTriggers = document.querySelectorAll('[data-form-mode-trigger]');
const formModePanels = document.querySelectorAll('[data-form-mode-panel]');
const scopeTriggers = document.querySelectorAll('[data-scope-trigger]');
const tableBody = document.getElementById('items-table-body');
const tableContainer = document.getElementById('items-table-container');
const emptyState = document.getElementById('empty-state');
const detailModal = document.getElementById('item-detail-modal');
const detailFields = document.getElementById('detail-fields');
const detailQr = document.getElementById('detail-qr');
const detailTitle = document.getElementById('detail-title');
const modalCloseControls = detailModal ? detailModal.querySelectorAll('[data-close-modal]') : [];
const locationListButton = document.getElementById('generate-location-list');
const locationListModal = document.getElementById('location-list-modal');
const locationListContainer = document.getElementById('location-list-container');
const locationListEmpty = document.getElementById('location-list-empty');
const locationListDescription = document.getElementById('location-list-description');
const copyLocationListButton = document.getElementById('copy-location-list');
const downloadLocationListButton = document.getElementById('download-location-list');
const locationListCloseControls = locationListModal
  ? locationListModal.querySelectorAll('[data-close-location-modal]')
  : [];
const DEFAULT_LOCATION_LIST_MESSAGE =
  'Selecciona items y usa el boton "Generar listado" para crear un resumen por ubicacion.';
const rutInput = document.getElementById('input-rut');
const serialInput = document.getElementById('input-noserie');
const imageInput = document.getElementById('input-imagen');
const imageNameDisplay = document.getElementById('input-imagen-name');
const imagePreview = document.getElementById('image-preview');
const imagePreviewContainer = document.getElementById('image-preview-container');
const deleteSelectedButton = document.getElementById('delete-selected');
const decommissionButton = document.getElementById('decommission-selected');
const printLabelsButton = document.getElementById('print-labels');
const loadDemoItemsButton = document.getElementById('load-demo-items');
const selectAllCheckbox = document.getElementById('select-all-rows');
const undoDeleteButton = document.getElementById('undo-delete');
const exportButton = document.getElementById('export-items');
const importButton = document.getElementById('import-items');
const editItemButton = document.getElementById('edit-item');
const bulkEditButton = document.getElementById('bulk-edit-selected');
const filterInputs = document.querySelectorAll('[data-filter-key]');
const clearFiltersButton = document.getElementById('clear-filters');
const sortButtons = document.querySelectorAll('.table-sort-button');
const formSubmitButton = singleForm ? singleForm.querySelector('button[type="submit"]') : null;
const batchSubmitButton = batchForm ? batchForm.querySelector('button[type="submit"]') : null;
const themeToggleButton = document.getElementById('theme-toggle');
const locationQuickButtonGroups = document.querySelectorAll('[data-location-buttons]');
const bulkEditModal = document.getElementById('bulk-edit-modal');
const bulkEditForm = document.getElementById('bulk-edit-form');
const bulkEditCloseControls = bulkEditModal
  ? bulkEditModal.querySelectorAll('[data-close-bulk-edit]')
  : [];
const bulkEditApplyControls = bulkEditForm
  ? bulkEditForm.querySelectorAll('[data-bulk-apply]')
  : [];
const bulkEditFieldElements = bulkEditForm
  ? Array.from(bulkEditForm.querySelectorAll('[data-bulk-field]'))
  : [];
const bulkEditFieldMap = bulkEditFieldElements.reduce((accumulator, element) => {
  const key = element.dataset.bulkField;
  if (key) {
    accumulator[key] = element;
  }
  return accumulator;
}, {});
const bulkEditApplyMap = Array.from(bulkEditApplyControls || []).reduce(
  (accumulator, checkbox) => {
    const key = checkbox.dataset.bulkApply;
    if (key) {
      accumulator[key] = checkbox;
    }
    return accumulator;
  },
  {},
);
const locationAddModal = document.getElementById('location-add-modal');
const locationAddForm = document.getElementById('location-add-form');
const locationAddInput = document.getElementById('location-add-input');
const locationAddCloseControls = locationAddModal
  ? locationAddModal.querySelectorAll('[data-close-location-add]')
  : [];
const suggestionLists = {
  Nombre: document.getElementById('nombre-suggestions'),
  Categoria: document.getElementById('categoria-suggestions'),
  Proveedor: document.getElementById('proveedor-suggestions'),
  Responsable: document.getElementById('responsable-suggestions'),
  Ubicacion: document.getElementById('ubicacion-suggestions'),
};
let inlineSuggestionPool = {
  Nombre: [],
  Categoria: [],
  Proveedor: [],
  Responsable: [],
  Ubicacion: [],
};

const THEME_STORAGE_KEY = 'qrventory-theme';
const ACTIVE_LOCATION_STORAGE_KEY = 'qrventory-active-location';
const LOCATION_USAGE_STORAGE_KEY = 'qrventory-location-usage';
const LOCATION_BUTTONS_EXPANDED_STORAGE_KEY = 'qrventory-location-buttons-expanded';
const SUGGESTION_LIMIT = 40;
const LOCATION_VISIBLE_LIMIT = 6;
const prefersDarkScheme =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
const rootElement = document.documentElement;

const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
};

const refreshThemeToggleLabel = (activeTheme) => {
  if (!themeToggleButton) {
    return;
  }
  const isLight = activeTheme === 'light';
  const labelText = isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  const prefix = String.fromCodePoint(isLight ? 0x1f319 : 0x1f31e);
  themeToggleButton.textContent = `${prefix} ${labelText}`;
  themeToggleButton.setAttribute('aria-label', labelText);
  themeToggleButton.setAttribute('aria-pressed', String(isLight));
  themeToggleButton.setAttribute('title', labelText);
  themeToggleButton.dataset.activeTheme = activeTheme;
};

const setTheme = (theme, { persist = true } = {}) => {
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  if (normalizedTheme === 'light') {
    rootElement.setAttribute('data-theme', 'light');
  } else {
    rootElement.removeAttribute('data-theme');
  }
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    } catch {
      // Intentionally ignore storage errors (private mode, etc.)
    }
  }
  refreshThemeToggleLabel(normalizedTheme);
  return normalizedTheme;
};

const resolvePreferredTheme = () => {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }
  if (prefersDarkScheme && typeof prefersDarkScheme.matches === 'boolean') {
    return prefersDarkScheme.matches ? 'dark' : 'light';
  }
  return 'dark';
};

const initializeThemeControls = () => {
  const initialTheme = setTheme(resolvePreferredTheme(), { persist: false });

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
      const currentTheme = rootElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
    });
  }

  if (prefersDarkScheme) {
    const handleSchemeChange = (event) => {
      if (getStoredTheme()) {
        return;
      }
      setTheme(event.matches ? 'dark' : 'light', { persist: false });
    };

    if (typeof prefersDarkScheme.addEventListener === 'function') {
      prefersDarkScheme.addEventListener('change', handleSchemeChange);
    } else if (typeof prefersDarkScheme.addListener === 'function') {
      prefersDarkScheme.addListener(handleSchemeChange);
    }
  }
};

initializeThemeControls();

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const singleFieldElements = singleForm
  ? Array.from(singleForm.querySelectorAll('[data-field]'))
  : [];
const singleFieldMap = singleFieldElements.reduce((accumulator, element) => {
  const key = element.dataset.field;
  if (key) {
    accumulator[key] = element;
  }
  return accumulator;
}, {});
const batchFieldElements = batchForm
  ? Array.from(batchForm.querySelectorAll('[data-batch-field]'))
  : [];
const batchFieldMap = batchFieldElements.reduce((accumulator, element) => {
  const key = element.dataset.batchField;
  if (key) {
    accumulator[key] = element;
  }
  return accumulator;
}, {});
const inlineSuggestionTargets = [
  { element: singleFieldMap?.Nombre, key: 'Nombre' },
  { element: singleFieldMap?.Categoria, key: 'Categoria' },
  { element: singleFieldMap?.Proveedor, key: 'Proveedor' },
  { element: singleFieldMap?.Responsable, key: 'Responsable' },
  { element: singleFieldMap?.Ubicacion, key: 'Ubicacion' },
  { element: batchFieldMap?.Nombre, key: 'Nombre' },
  { element: batchFieldMap?.Categoria, key: 'Categoria' },
  { element: batchFieldMap?.Proveedor, key: 'Proveedor' },
  { element: batchFieldMap?.Responsable, key: 'Responsable' },
  { element: batchFieldMap?.Ubicacion, key: 'Ubicacion' },
  { element: bulkEditFieldMap?.Ubicacion, key: 'Ubicacion' },
  { element: bulkEditFieldMap?.Nombre, key: 'Nombre' },
  { element: bulkEditFieldMap?.Categoria, key: 'Categoria' },
  { element: bulkEditFieldMap?.Proveedor, key: 'Proveedor' },
  { element: bulkEditFieldMap?.Responsable, key: 'Responsable' },
  { element: locationAddInput, key: 'Ubicacion' },
];
const FORM_FIELD_KEYS = [
  'Nombre',
  'Categoria',
  'Proveedor',
  'Subvencion',
  'NoSerie',
  'Tipo',
  'Nivel Educativo',
  'Cantidad',
  'Fecha Ingreso',
  'Rut',
  'NoFactura',
  'Estado',
  'Responsable',
  'Ubicacion',
  'Notas',
  'Imagen',
];
const TABLE_FIELD_KEYS = [
  'NoSerie',
  'Nombre',
  'Categoria',
  'Proveedor',
  'Tipo',
  'Subvencion',
  'Nivel Educativo',
  'Cantidad',
  'Estado',
  'Ubicacion',
];

const singleImageContext = {
  input: imageInput,
  nameDisplay: imageNameDisplay,
  preview: imagePreview,
  container: imagePreviewContainer,
  dataUrl: '',
};
const batchImageContext = {
  input: document.getElementById('batch-input-imagen'),
  nameDisplay: document.getElementById('batch-input-imagen-name'),
  preview: document.getElementById('batch-image-preview'),
  container: document.getElementById('batch-image-preview-container'),
  dataUrl: '',
};
const batchCountInput = document.getElementById('batch-count');
const batchSerialPrefixInput = document.getElementById('batch-serial-prefix');
const batchStartIndexInput = document.getElementById('batch-start-index');
const batchRutInput = document.getElementById('batch-rut');

let activeLocation = loadStoredActiveLocation();
let locationUsage = loadLocationUsageCounts();
let locationButtonsExpanded = loadStoredLocationButtonsExpanded();
let locationStats = [];
let cachedItems = [];
let displayedItems = [];
let currentDetailItem = null;
let editingState = null;
let lastLocationListPlainText = '';
let lastLocationReportEntries = [];
const selectedItems = new Map();
const filters = {};
const DETAIL_HIGHLIGHT_CLASS = 'is-detail-highlight';
let lastAction = null;
let currentSort = {
  key: null,
  direction: 'asc',
};
const TANGIBLE_TYPE = 'Tangible';
const FUNGIBLE_TYPE = 'Fungible';
const SCOPE_GENERAL = 'General';
const BAJA_STATE_LABEL = 'Dado de baja';
const BAJA_BUTTON_LABEL = 'Dar de baja';
let currentInventoryScope = SCOPE_GENERAL;
let activeFormMode = 'single';
let activeMainTab = 'register';

if (editItemButton) {
  editItemButton.disabled = true;
}

const DATA_ROW_MIN = 2;
const normalizeSerial = (value) => (value == null ? '' : String(value).trim());
const normalizeRowNumber = (value) => {
  if (Number.isInteger(value)) {
    return value >= DATA_ROW_MIN ? value : null;
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= DATA_ROW_MIN ? numeric : null;
};
const toPositiveInteger = (value, fallback = 1) => {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }
  return fallback;
};
const getItemSerial = (item) => (item ? normalizeSerial(item.NoSerie) : '');
const getItemRowNumber = (item) => normalizeRowNumber(item?._rowNumber);


function getSelectionKey(serial, rowNumber) {
  const normalizedSerial = normalizeSerial(serial);
  if (normalizedSerial) {
    return `SERIAL:${normalizedSerial}`;
  }
  const normalizedRow = normalizeRowNumber(rowNumber);
  if (normalizedRow != null) {
    return `ROW:${normalizedRow}`;
  }
  return null;
}

function normalizeText(value) {
  const text = String(value ?? '').toLowerCase();
  try {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  } catch {
    return text;
  }
}

function cloneItem(item) {
  return item ? JSON.parse(JSON.stringify(item)) : null;
}

function safeFocus(element) {
  if (!element || typeof element.focus !== 'function') {
    return;
  }
  try {
    element.focus({ preventScroll: true });
  } catch {
    try {
      element.focus();
    } catch {
      // Ignore focus failures (hidden inputs, etc.)
    }
  }
}

function normalizeFieldValue(value) {
  return String(value ?? '').trim();
}

function loadStoredActiveLocation() {
  try {
    return localStorage.getItem(ACTIVE_LOCATION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function persistActiveLocationValue(value) {
  try {
    if (value) {
      localStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY);
    }
  } catch {
    // Storage can fail silently (private mode, etc.)
  }
}

function loadLocationUsageCounts() {
  try {
    const raw = localStorage.getItem(LOCATION_USAGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return new Map();
    }
    const map = new Map();
    parsed.forEach((entry) => {
      if (!entry) {
        return;
      }
      const normalized = typeof entry.key === 'string' ? entry.key : normalizeText(entry.label);
      if (!normalized) {
        return;
      }
      const label = normalizeFieldValue(entry.label || '');
      const usage = Number.isInteger(entry.usage) && entry.usage > 0 ? entry.usage : 0;
      map.set(normalized, { label, usage });
    });
    return map;
  } catch {
    return new Map();
  }
}

function persistLocationUsageCounts(map) {
  if (!(map instanceof Map)) {
    return;
  }
  try {
    const payload = Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: value?.label || '',
      usage: Number.isInteger(value?.usage) ? value.usage : 0,
    }));
    localStorage.setItem(LOCATION_USAGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore storage failures */
  }
}

function loadStoredLocationButtonsExpanded() {
  try {
    return localStorage.getItem(LOCATION_BUTTONS_EXPANDED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistLocationButtonsExpanded(value) {
  try {
    localStorage.setItem(LOCATION_BUTTONS_EXPANDED_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore storage failures */
  }
}

function setLocationButtonsExpanded(value) {
  locationButtonsExpanded = Boolean(value);
  persistLocationButtonsExpanded(locationButtonsExpanded);
  renderLocationQuickButtons();
}

function bumpLocationUsage(label) {
  const normalized = normalizeText(label);
  const trimmed = normalizeFieldValue(label);
  if (!normalized) {
    return;
  }
  const existing = locationUsage.get(normalized) || { label: trimmed, usage: 0 };
  locationUsage.set(normalized, {
    label: trimmed || existing.label || '',
    usage: (existing.usage || 0) + 1,
  });
  persistLocationUsageCounts(locationUsage);
}

function applyActiveLocationToForms({ force = false, allowEdit = false } = {}) {
  if (!activeLocation) {
    return;
  }

  const isEditMode = form && form.dataset.mode === 'edit';
  const ubicationInput = singleFieldMap?.Ubicacion;
  if (
    ubicationInput &&
    (!isEditMode || allowEdit) &&
    (force || !ubicationInput.value)
  ) {
    ubicationInput.value = activeLocation;
  }

  const batchUbicationInput = batchFieldMap?.Ubicacion;
  if (batchUbicationInput && (force || !batchUbicationInput.value)) {
    batchUbicationInput.value = activeLocation;
  }

  const bulkUbicationInput = bulkEditFieldMap?.Ubicacion;
  if (bulkUbicationInput && (force || !bulkUbicationInput.value)) {
    bulkUbicationInput.value = activeLocation;
  }
}

function setActiveLocation(
  value,
  { persist = true, propagate = true, allowEdit = false, force = false } = {},
) {
  activeLocation = normalizeFieldValue(value);

  if (persist) {
    persistActiveLocationValue(activeLocation);
  }

  if (propagate) {
    applyActiveLocationToForms({ force, allowEdit });
  }

  renderLocationQuickButtons();
}

function renderDatalistOptions(datalist, values = []) {
  if (!datalist) {
    return;
  }

  const fragment = document.createDocumentFragment();
  datalist.innerHTML = '';
  const uniqueValues = Array.isArray(values) ? values.slice(0, SUGGESTION_LIMIT) : [];

  uniqueValues.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    fragment.appendChild(option);
  });

  datalist.appendChild(fragment);
}

function collectUniqueFieldValues(items, key) {
  const seen = new Set();
  const values = [];

  items.forEach((item) => {
    const raw = normalizeFieldValue(item?.[key]);
    if (!raw) {
      return;
    }
    const normalized = normalizeText(raw);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    values.push(raw);
  });

  return values
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .slice(0, SUGGESTION_LIMIT);
}

function updateInlineSuggestionPool(values) {
  inlineSuggestionPool = {
    ...inlineSuggestionPool,
    ...values,
  };
}

function getInlineSuggestions(key) {
  return Array.isArray(inlineSuggestionPool[key]) ? inlineSuggestionPool[key] : [];
}

function applyInlineSuggestion(input, key) {
  if (!input) {
    return;
  }
  const suggestions = getInlineSuggestions(key);
  let caret = 0;
  try {
    caret = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
  } catch {
    caret = input.value.length;
  }
  const typed = input.value.slice(0, caret);
  if (!typed) {
    input.dataset.inlineBase = '';
    input.dataset.inlineSuggestion = '';
    return;
  }

  const match = suggestions.find(
    (candidate) =>
      typeof candidate === 'string' &&
      candidate.toLowerCase().startsWith(typed.toLowerCase()) &&
      candidate.length > typed.length,
  );

  if (match) {
    input.value = match;
    const start = typed.length;
    const end = match.length;
    try {
      input.setSelectionRange(start, end);
    } catch {
      /* ignore selection errors */
    }
    input.dataset.inlineBase = typed;
    input.dataset.inlineSuggestion = match;
  } else {
    input.dataset.inlineBase = '';
    input.dataset.inlineSuggestion = '';
  }
}

function attachInlineSuggestion(input, key) {
  if (!input || !key || input.dataset.inlineSuggestionAttached === 'true') {
    return;
  }
  input.dataset.inlineSuggestionAttached = 'true';

  input.addEventListener('input', () => {
    applyInlineSuggestion(input, key);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && input.dataset.inlineSuggestion) {
      event.preventDefault();
      const suggestion = input.dataset.inlineSuggestion;
      input.value = suggestion;
      try {
        input.setSelectionRange(suggestion.length, suggestion.length);
      } catch {
        /* ignore selection errors */
      }
      input.dataset.inlineSuggestion = '';
      input.dataset.inlineBase = '';
    }
  });

  input.addEventListener('focus', () => {
    applyInlineSuggestion(input, key);
  });
}

function computeLocationStats(items) {
  const stats = new Map();

  items.forEach((item) => {
    const label = normalizeFieldValue(item?.Ubicacion);
    if (!label) {
      return;
    }
    const normalized = normalizeText(label);
    const quantity = toPositiveInteger(item?.Cantidad, 1);
    const existing = stats.get(normalized) || { label, count: 0 };
    stats.set(normalized, {
      label: existing.label,
      count: existing.count + quantity,
    });
  });

  return Array.from(stats.values()).sort(
    (a, b) =>
      b.count - a.count ||
      a.label.localeCompare(b.label, undefined, {
        sensitivity: 'base',
      }),
  );
}

function renderLocationQuickButtons() {
  try {
    if (!locationQuickButtonGroups || locationQuickButtonGroups.length === 0) {
      return;
    }

    const recordsMap = new Map();
    const addRecord = (label, count = 0) => {
      const trimmed = normalizeFieldValue(label);
      if (!trimmed) {
        return;
      }
      const normalized = normalizeText(trimmed);
      const usageRecord =
        locationUsage instanceof Map ? locationUsage.get(normalized) : null;
      const base = recordsMap.get(normalized) || { label: trimmed, count: 0, usage: 0 };
      recordsMap.set(normalized, {
        label: usageRecord?.label || base.label || trimmed,
        count: Math.max(base.count, toPositiveInteger(count, 0)),
        usage: Math.max(base.usage, toPositiveInteger(usageRecord?.usage, 0)),
      });
    };

    locationStats.forEach((entry) => addRecord(entry.label, entry.count));
    if (locationUsage instanceof Map) {
      locationUsage.forEach((value, key) => {
        addRecord(value?.label || key, 0);
      });
    }
    if (activeLocation) {
      addRecord(activeLocation, 0);
    }

    let records = Array.from(recordsMap.values()).sort(
      (a, b) =>
        b.usage - a.usage ||
        b.count - a.count ||
        a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );

    const activeNormalized = normalizeText(activeLocation);
    if (!locationButtonsExpanded && activeNormalized) {
      const index = records.findIndex(
        (entry) => normalizeText(entry.label) === activeNormalized,
      );
      if (index >= LOCATION_VISIBLE_LIMIT) {
        const [selected] = records.splice(index, 1);
        records.unshift(selected);
      }
    }

    const visibleRecords = locationButtonsExpanded
      ? records
      : records.slice(0, LOCATION_VISIBLE_LIMIT);
    const hiddenCount = locationButtonsExpanded
      ? 0
      : Math.max(records.length - visibleRecords.length, 0);
    const showToggle = records.length > LOCATION_VISIBLE_LIMIT || locationButtonsExpanded;

    locationQuickButtonGroups.forEach((group) => {
      group.innerHTML = '';
      const fragment = document.createDocumentFragment();

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className =
        'button squircle-button form-mode-button is-light location-quick-button location-quick-utility';
      addButton.innerHTML =
        '<span class="button-icon" aria-hidden="true"><i class="fa-solid fa-map-pin"></i></span><span class="button-label">Agregar ubicacion</span>';
      addButton.addEventListener('click', () => {
        if (typeof openLocationAddModal === 'function') {
          openLocationAddModal();
        }
      });

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.className =
        'button squircle-button form-mode-button is-light location-quick-button location-quick-utility';
      clearButton.innerHTML =
        '<span class="button-icon" aria-hidden="true"><i class="fa-solid fa-eraser"></i></span><span class="button-label">Limpiar</span>';
      clearButton.addEventListener('click', () => {
        setActiveLocation('');
        const ubicationInput = singleFieldMap?.Ubicacion;
        if (ubicationInput) {
          ubicationInput.value = '';
          safeFocus(ubicationInput);
        }
        const batchUbicationInput = batchFieldMap?.Ubicacion;
        if (batchUbicationInput) {
          batchUbicationInput.value = '';
        }
        const bulkUbicationInput = bulkEditFieldMap?.Ubicacion;
        if (bulkUbicationInput) {
          bulkUbicationInput.value = '';
          const bulkCheckbox = bulkEditApplyMap?.Ubicacion;
          if (bulkCheckbox) {
            bulkCheckbox.checked = false;
          }
        }
      });

      if (records.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.classList.add('location-quick-empty');
        placeholder.textContent = 'Sin ubicaciones previas.';
        fragment.appendChild(placeholder);
        fragment.appendChild(addButton);
        fragment.appendChild(clearButton);
        group.appendChild(fragment);
        return;
      }

      if (showToggle && (hiddenCount > 0 || locationButtonsExpanded)) {
        const toggleButton = document.createElement('button');
        toggleButton.type = 'button';
        toggleButton.className =
          'button squircle-button form-mode-button is-light location-quick-button location-quick-utility';
        const icon = locationButtonsExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
        const label = locationButtonsExpanded
          ? 'Ocultar ubicaciones'
          : `Mostrar ${hiddenCount} mas`;
        toggleButton.innerHTML = `<span class="button-icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></span><span class="button-label">${label}</span>`;
        toggleButton.addEventListener('click', () => {
          setLocationButtonsExpanded(!locationButtonsExpanded);
        });
        fragment.appendChild(toggleButton);
      }

      visibleRecords.forEach(({ label }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button squircle-button form-mode-button location-quick-button';
        const isActive = normalizeText(label) === normalizeText(activeLocation);
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
        button.textContent = label;
        button.addEventListener('click', () => {
          bumpLocationUsage(label);
          setActiveLocation(label, { allowEdit: true, force: true });
          const ubicationInput = singleFieldMap?.Ubicacion;
          if (ubicationInput) {
            ubicationInput.value = label;
            safeFocus(ubicationInput);
          }
          const batchUbicationInput = batchFieldMap?.Ubicacion;
          if (batchUbicationInput) {
            batchUbicationInput.value = label;
          }
          const bulkUbicationInput = bulkEditFieldMap?.Ubicacion;
          if (bulkUbicationInput) {
            bulkUbicationInput.value = label;
            const bulkCheckbox = bulkEditApplyMap?.Ubicacion;
            if (bulkCheckbox) {
              bulkCheckbox.checked = true;
            }
          }
          if (locationButtonsExpanded) {
            setLocationButtonsExpanded(false);
          }
        });
        fragment.appendChild(button);
      });

      fragment.appendChild(addButton);
      fragment.appendChild(clearButton);
      group.appendChild(fragment);
    });
  } catch (error) {
    console.error('Failed to render location buttons', error);
  }
}

function refreshFormSuggestionsFromItems(items) {
  const safeItems = Array.isArray(items) ? items : [];

  const suggestionValues = {
    Nombre: collectUniqueFieldValues(safeItems, 'Nombre'),
    Categoria: collectUniqueFieldValues(safeItems, 'Categoria'),
    Proveedor: collectUniqueFieldValues(safeItems, 'Proveedor'),
    Responsable: collectUniqueFieldValues(safeItems, 'Responsable'),
    Ubicacion: collectUniqueFieldValues(safeItems, 'Ubicacion'),
  };

  const normalizedActive = normalizeText(activeLocation);
  const hasActiveLocation = suggestionValues.Ubicacion.some(
    (value) => normalizeText(value) === normalizedActive,
  );
  if (activeLocation && !hasActiveLocation) {
    suggestionValues.Ubicacion.unshift(activeLocation);
  }

  Object.entries(suggestionLists).forEach(([field, datalist]) => {
    renderDatalistOptions(datalist, suggestionValues[field]);
  });

  updateInlineSuggestionPool(suggestionValues);
  inlineSuggestionTargets.forEach(({ element, key }) => attachInlineSuggestion(element, key));

  locationStats = computeLocationStats(safeItems);
  renderLocationQuickButtons();
  applyActiveLocationToForms();
}

function resetBulkEditForm() {
  if (!bulkEditForm) {
    return;
  }
  bulkEditForm.reset();
  bulkEditApplyControls.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

function openLocationAddModal() {
  if (!locationAddModal || !locationAddForm) {
    return;
  }
  locationAddModal.classList.add('is-active');
  locationAddModal.setAttribute('aria-hidden', 'false');
  if (locationAddInput) {
    locationAddInput.value = activeLocation || '';
    try {
      locationAddInput.focus({ preventScroll: true });
    } catch {
      locationAddInput.focus();
    }
  }
}

function closeLocationAddModal() {
  if (!locationAddModal) {
    return;
  }
  locationAddModal.classList.remove('is-active');
  locationAddModal.setAttribute('aria-hidden', 'true');
}

function openBulkEditModal() {
  if (!bulkEditModal || !bulkEditButton) {
    return;
  }
  bulkEditModal.classList.add('is-active');
  bulkEditModal.setAttribute('aria-hidden', 'false');
  applyActiveLocationToForms({ force: true, allowEdit: true });
  const focusTarget = bulkEditModal.querySelector('input, select, textarea');
  if (focusTarget) {
    try {
      focusTarget.focus({ preventScroll: true });
    } catch {
      focusTarget.focus();
    }
  }
}

function closeBulkEditModal() {
  if (!bulkEditModal) {
    return;
  }
  resetBulkEditForm();
  bulkEditModal.classList.remove('is-active');
  bulkEditModal.setAttribute('aria-hidden', 'true');
}

function setActiveMainTab(tab) {
  const normalized = tab === 'saved' ? 'saved' : 'register';
  activeMainTab = normalized;

  mainTabTriggers.forEach((trigger) => {
    const target = trigger.dataset.mainTab;
    const listItem = trigger.closest('li');
    const isActive = target === normalized;
    if (listItem) {
      listItem.classList.toggle('is-active', isActive);
    }
    trigger.setAttribute('aria-selected', String(isActive));
  });

  mainTabPanels.forEach((panel) => {
    const panelKey = panel.dataset.mainPanel;
    const isActive = panelKey === normalized;
    panel.classList.toggle('is-active', isActive);
    panel.setAttribute('aria-hidden', String(!isActive));
  });

  if (normalized === 'register') {
    setActiveFormMode(activeFormMode);
  } else {
    updateSelectionUI();
    updateSortIndicators();
  }
}

function setFormMode(mode) {
  if (!form) {
    return;
  }

  if (mode === 'edit') {
    form.dataset.mode = 'edit';
    if (formSubmitButton) {
      formSubmitButton.textContent = "Guardar cambios";
    }
  } else {
    delete form.dataset.mode;
    delete form.dataset.serial;
    delete form.dataset.rowNumber;
    if (formSubmitButton) {
      formSubmitButton.textContent = "Guardar Item";
    }
  }
}

function stopEditing() {
  editingState = null;
  setFormMode('create');
}

function setActiveFormMode(mode) {
  const normalizedMode = mode === 'batch' ? 'batch' : 'single';
  activeFormMode = normalizedMode;

  formModeTriggers.forEach((trigger) => {
    const triggerMode = trigger.dataset.formModeTrigger;
    const isActive = triggerMode === normalizedMode;
    trigger.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));
    trigger.setAttribute('aria-pressed', String(isActive));
  });

  formModePanels.forEach((panel) => {
    const panelMode = panel.dataset.formModePanel;
    const isActive = panelMode === normalizedMode;
    panel.classList.toggle('is-active', isActive);
    panel.setAttribute('aria-hidden', String(!isActive));
  });

  const activePanel =
    Array.from(formModePanels).find((panel) => panel.dataset.formModePanel === normalizedMode) ||
    null;
  if (activePanel) {
    const focusTarget = activePanel.querySelector('input, select, textarea');
    if (focusTarget) {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
    }
  }
}

function setInventoryScope(scope) {
  const normalized =
    scope === TANGIBLE_TYPE || scope === FUNGIBLE_TYPE ? scope : SCOPE_GENERAL;

  currentInventoryScope = normalized;

  scopeTriggers.forEach((trigger) => {
    const triggerScope = trigger.dataset.scopeTrigger;
    const isActive =
      (triggerScope === SCOPE_GENERAL && normalized === SCOPE_GENERAL) ||
      triggerScope === normalized;
    trigger.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));
    trigger.setAttribute('aria-pressed', String(isActive));
  });

  renderItems();
}

function populateFormWithItem(item) {
  Object.entries(singleFieldMap).forEach(([key, element]) => {
    if (!element || element.type === 'file') {
      return;
    }

    let value = item?.[key] ?? '';
    if (element.type === 'date' && value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        value = parsed.toISOString().slice(0, 10);
      }
    }

    if (element.type === 'number') {
      element.value = value === '' ? '' : Number(value);
    } else {
      element.value = value;
    }
  });

  if (serialInput) {
    serialInput.value = item?.NoSerie ?? '';
  }
  if (item?.image) {
    setImagePreviewFromDataUrl(singleImageContext, item.image, 'image actual');
  } else {
    resetImageInput(singleImageContext);
  }
}

function startEditingItem(item) {
  if (!form || !item) {
    return;
  }

  const source =
    findCachedItem(item.NoSerie, item._rowNumber) || item;

  const serial = getItemSerial(source);
  const rowNumber = getItemRowNumber(source);
  const originalItem = cloneItem(source) || {};
  if (serial) {
    originalItem.NoSerie = serial;
  }
  if (rowNumber != null) {
    originalItem._rowNumber = rowNumber;
  }

  editingState = {
    serial,
    rowNumber,
    originalItem,
  };

  form.dataset.serial = editingState.serial || '';
  form.dataset.rowNumber =
    editingState.rowNumber != null ? String(editingState.rowNumber) : '';
  setFormMode('edit');
  setActiveMainTab('register');
  setActiveFormMode('single');
  populateFormWithItem(source);
  if (!source.Imagen) {
    resetImageInput(singleImageContext);
  }

  if (qrContainer) {
    qrContainer.classList.add('is-hidden');
  }
  if (qrSection) {
    qrSection.classList.add('is-hidden');
  }

  closeDetailModal();
  setActiveFormMode('single');
  showStatus(
    'Editando item seleccionado. Actualiza los campos y guarda los cambios.',
    'is-info',
  );
}

function hasActiveFilters() {
  return Object.values(filters).some((value) => value);
}

function updateFilterUIState() {
  if (!clearFiltersButton) {
    return;
  }
  clearFiltersButton.disabled = !hasActiveFilters();
}

function itemMatchesFilters(item) {
  return Object.entries(filters).every(([key, needle]) => {
    if (!needle) {
      return true;
    }
    const haystack = normalizeText(item?.[key]);
    return haystack.includes(needle);
  });
}

function filterItems(items) {
  return items.filter((item) => itemMatchesFilters(item));
}

function getSortValue(item, key) {
  const value = item?.[key];

  if (key === 'Cantidad') {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? Number.NEGATIVE_INFINITY : numeric;
  }

  if (key === 'image') {
    return value ? 1 : 0;
  }

  if (key === 'Fecha Ingreso') {
    const timestamp = Date.parse(value);
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  if (typeof value === 'number') {
    return value;
  }

  return normalizeText(value);
}

function sortItems(items) {
  if (!currentSort.key) {
    return [...items];
  }

  const direction = currentSort.direction === 'desc' ? -1 : 1;
  const key = currentSort.key;

  return [...items].sort((a, b) => {
    const valueA = getSortValue(a, key);
    const valueB = getSortValue(b, key);

    if (valueA < valueB) {
      return -1 * direction;
    }
    if (valueA > valueB) {
      return 1 * direction;
    }

    const fallbackA = normalizeText(a?.Nombre);
    const fallbackB = normalizeText(b?.Nombre);
    if (fallbackA < fallbackB) {
      return -1;
    }
    if (fallbackA > fallbackB) {
      return 1;
    }
    return 0;
  });
}

function filterByScope(items) {
  if (currentInventoryScope === SCOPE_GENERAL) {
    return items;
  }
  const targetType = currentInventoryScope.toLowerCase();
  return items.filter((item) => (item?.Tipo || '').toLowerCase() === targetType);
}

function applyFiltersAndSort(items) {
  const scopedItems = filterByScope(items);
  const filtered = filterItems(scopedItems);
  return sortItems(filtered);
}

function updateSortIndicators() {
  sortButtons.forEach((button) => {
    const sortKey = button.dataset.sortKey;
    if (!sortKey) {
      return;
    }
    const isActive = currentSort.key === sortKey;
    button.dataset.sortActive = isActive ? 'true' : 'false';
    if (isActive) {
      button.dataset.sortDirection = currentSort.direction;
    } else {
      delete button.dataset.sortDirection;
    }
  });
}

function updateSelectionUI() {
  const totalItems = displayedItems.length;
  const visibleSelectedCount = displayedItems.reduce((accumulator, item) => {
    const key = getSelectionKey(getItemSerial(item), getItemRowNumber(item));
    if (key && selectedItems.has(key)) {
      return accumulator + 1;
    }
    return accumulator;
  }, 0);
  const hasSelection = selectedItems.size > 0;

  if (deleteSelectedButton) {
    deleteSelectedButton.disabled = !hasSelection;
  }
  if (decommissionButton) {
    decommissionButton.disabled = !hasSelection;
  }
  if (printLabelsButton) {
    printLabelsButton.disabled = !hasSelection;
  }
  if (bulkEditButton) {
    bulkEditButton.disabled = !hasSelection;
  }
  if (locationListButton) {
    locationListButton.disabled = !hasSelection;
  }

  if (selectAllCheckbox) {
    if (totalItems === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.disabled = true;
    } else {
      selectAllCheckbox.disabled = false;
      selectAllCheckbox.checked = visibleSelectedCount > 0 && visibleSelectedCount === totalItems;
      selectAllCheckbox.indeterminate =
        visibleSelectedCount > 0 && visibleSelectedCount < totalItems;
    }
  }
}

mainTabTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    const tab = trigger.dataset.mainTab || 'register';
    setActiveMainTab(tab);
  });
});

formModeTriggers.forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    const mode = trigger.dataset.formModeTrigger || 'single';
    setActiveFormMode(mode);
  });
});

scopeTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const scope = trigger.dataset.scopeTrigger;
    setInventoryScope(scope);
  });
});

filterInputs.forEach((input) => {
  const key = input.dataset.filterKey;
  if (!key) {
    return;
  }

  if (!(key in filters)) {
    filters[key] = '';
  }

  input.addEventListener('input', () => {
    filters[key] = normalizeText(input.value).trim();
    updateFilterUIState();
    renderItems();
  });
});

if (clearFiltersButton) {
  clearFiltersButton.addEventListener('click', () => {
    let hasChanges = false;

    filterInputs.forEach((input) => {
      if (input.value !== '') {
        hasChanges = true;
      }
      input.value = '';
    });

    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        hasChanges = true;
      }
      filters[key] = '';
    });

    updateFilterUIState();
    if (hasChanges) {
      renderItems();
    }
  });
}

if (exportButton) {
  exportButton.addEventListener('click', async () => {
    try {
      exportButton.disabled = true;
      showStatus('Generando exportacion...', 'is-info');
      const result = await window.api.exportItems();

      if (result?.canceled) {
        showStatus('Exportacion cancelada.', 'is-warning');
      } else {
        const message = result?.filePath
          ? `Inventario exportado en ${result.filePath}`
          : 'Inventario exportado correctamente.';
        showStatus(message, 'is-success');
      }
    } catch (error) {
      console.error('Failed to export items', error);
      showStatus('No se pudo exportar el inventario.', 'is-danger');
    } finally {
      exportButton.disabled = false;
    }
  });
}
if (importButton) {
  importButton.addEventListener('click', async () => {
    try {
      importButton.disabled = true;
      showStatus('Importando inventario...', 'is-info');
      const result = await window.api.importItems();

      if (result?.canceled) {
        showStatus('Importacion cancelada.', 'is-warning');
        return;
      }

      const importedCount = Number(result?.imported ?? 0);
      await refreshItems();

      const message =
        importedCount > 0
          ? `Se importaron ${importedCount} items.`
          : 'No se importaron items.';
      showStatus(message, importedCount > 0 ? 'is-success' : 'is-warning');
    } catch (error) {
      console.error('Failed to import items', error);
      showStatus('No se pudo importar el inventario.', 'is-danger');
    } finally {
      importButton.disabled = false;
    }
  });
}



if (editItemButton) {
  editItemButton.addEventListener('click', () => {
    if (!currentDetailItem) {
      return;
    }
    startEditingItem(currentDetailItem);
  });
}

sortButtons.forEach((button) => {
  const sortKey = button.dataset.sortKey;
  if (!sortKey) {
    return;
  }

  button.addEventListener('click', () => {
    if (currentSort.key === sortKey) {
      if (currentSort.direction === 'asc') {
        currentSort.direction = 'desc';
      } else if (currentSort.direction === 'desc') {
        currentSort = {
          key: null,
          direction: 'asc',
        };
      } else {
        currentSort.direction = 'asc';
      }
    } else {
      currentSort = {
        key: sortKey,
        direction: 'asc',
      };
    }

    renderItems();
  });
});

function updateUndoUI() {
  if (!undoDeleteButton) {
    return;
  }

  const hasUndo = lastAction != null;
  undoDeleteButton.disabled = !hasUndo;
}

function stripInternalFields(item) {
  if (!item || typeof item !== 'object') {
    return {};
  }
  const { _rowNumber, ...rest } = item;
  return { ...rest };
}

function findCachedItem(serial, rowNumber) {
  const normalizedSerial = normalizeSerial(serial);
  const normalizedRow = normalizeRowNumber(rowNumber);

  if (normalizedSerial) {
    const bySerial = cachedItems.find((item) => getItemSerial(item) === normalizedSerial);
    if (bySerial) {
      return bySerial;
    }
  }

  if (normalizedRow != null) {
    return cachedItems.find((item) => getItemRowNumber(item) === normalizedRow);
  }

  return undefined;
}

updateUndoUI();
updateFilterUIState();
updateSortIndicators();
setFormMode('create');

function toggleSelection(serial, rowNumber, shouldSelect, row) {
  const key = getSelectionKey(serial, rowNumber);
  if (!key) {
    if (row) {
      row.classList.toggle('is-selected', shouldSelect);
    }
    updateSelectionUI();
    return;
  }

  if (shouldSelect) {
    selectedItems.set(key, {
      serial: normalizeSerial(serial),
      rowNumber: normalizeRowNumber(rowNumber),
    });
    if (row) {
      row.classList.add('is-selected');
    }
  } else {
    selectedItems.delete(key);
    if (row) {
      row.classList.remove('is-selected');
    }
  }

  updateSelectionUI();
}

function buildLocationListSummary(entries = []) {
  const selection = Array.isArray(entries) ? entries : [];
  const locationMap = new Map();
  let totalUnits = 0;

  selection.forEach((entry) => {
    if (!entry) {
      return;
    }
    const candidate = findCachedItem(entry.serial, entry.rowNumber);
    if (!candidate) {
      return;
    }
    const locationValue = candidate.Ubicacion ?? '';
    const location = String(locationValue).trim() || 'Ubicacion sin especificar';
    const locationKey = location.toLowerCase();
    const nameValue = candidate.Nombre ?? '';
    const name = String(nameValue).trim() || 'Item sin nombre';
    const quantity = toPositiveInteger(candidate.Cantidad ?? 1, 1);

    let locationRecord = locationMap.get(locationKey);
    if (!locationRecord) {
      locationRecord = {
        location,
        items: new Map(),
      };
      locationMap.set(locationKey, locationRecord);
    }

    const itemKey = name.toLowerCase();
    const aggregatedItem = locationRecord.items.get(itemKey) || { name, quantity: 0 };
    aggregatedItem.quantity += quantity;
    locationRecord.items.set(itemKey, aggregatedItem);
    totalUnits += quantity;
  });

  const summary = Array.from(locationMap.values())
    .map((group) => ({
      location: group.location,
      items: Array.from(group.items.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => a.location.localeCompare(b.location, undefined, { sensitivity: 'base' }));

  const plainText = summary
    .map((group) => {
      const lines = [group.location.toUpperCase()];
      group.items.forEach((item) => {
        lines.push(`- ${item.quantity} x ${item.name}`);
      });
      return lines.join('\n');
    })
    .join('\n\n');

  return {
    summary,
    plainText,
    totalUnits,
  };
}

function updateLocationListDescription(summary, totalUnits) {
  if (!locationListDescription) {
    return;
  }
  if (!Array.isArray(summary) || summary.length === 0) {
    locationListDescription.textContent = DEFAULT_LOCATION_LIST_MESSAGE;
    return;
  }
  const locationCount = summary.length;
  const locationLabel = locationCount === 1 ? 'ubicacion' : 'ubicaciones';
  const unitsLabel = totalUnits === 1 ? 'unidad' : 'unidades';
  locationListDescription.textContent = `Resumen de ${totalUnits} ${unitsLabel} en ${locationCount} ${locationLabel}.`;
}

function renderLocationList(summary = []) {
  if (!locationListContainer || !locationListEmpty) {
    return;
  }

  locationListContainer.innerHTML = '';

  if (!Array.isArray(summary) || summary.length === 0) {
    locationListContainer.classList.add('is-hidden');
    locationListEmpty.classList.remove('is-hidden');
    return;
  }

  locationListEmpty.classList.add('is-hidden');
  locationListContainer.classList.remove('is-hidden');

  summary.forEach((group) => {
    const card = document.createElement('article');
    card.classList.add('location-list-card');

    const header = document.createElement('div');
    header.classList.add('location-list-card-header');

    const title = document.createElement('h3');
    title.classList.add('location-list-title');
    title.textContent = group.location;
    header.appendChild(title);

    const meta = document.createElement('span');
    meta.classList.add('location-list-meta');
    meta.textContent =
      group.items.length === 1 ? '1 linea' : `${group.items.length} lineas`;
    header.appendChild(meta);

    card.appendChild(header);

    const list = document.createElement('ul');
    list.classList.add('location-list-items');

    group.items.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.classList.add('location-list-item');

      const name = document.createElement('span');
      name.classList.add('location-list-item-name');
      name.textContent = item.name;
      listItem.appendChild(name);

      const quantity = document.createElement('span');
      quantity.classList.add('location-list-item-qty');
      quantity.textContent = String(item.quantity);
      listItem.appendChild(quantity);

      list.appendChild(listItem);
    });

    card.appendChild(list);
    locationListContainer.appendChild(card);
  });
}

function openLocationListModalWithSummary(summary, plainText, totalUnits, entriesPayload = []) {
  if (!locationListModal) {
    return;
  }
  renderLocationList(summary);
  updateLocationListDescription(summary, totalUnits);
  lastLocationListPlainText = plainText || '';
  lastLocationReportEntries = Array.isArray(entriesPayload) ? entriesPayload : [];
  if (copyLocationListButton) {
    copyLocationListButton.disabled = !lastLocationListPlainText;
  }
  if (downloadLocationListButton) {
    downloadLocationListButton.disabled = lastLocationReportEntries.length === 0;
  }
  locationListModal.classList.add('is-active');
}

function closeLocationListModal() {
  if (!locationListModal) {
    return;
  }
  locationListModal.classList.remove('is-active');
  lastLocationReportEntries = [];
  lastLocationListPlainText = '';
  if (copyLocationListButton) {
    copyLocationListButton.disabled = true;
  }
  if (downloadLocationListButton) {
    downloadLocationListButton.disabled = true;
  }
}

async function handleDecommissionAction(entries, options = {}) {
  const payload = Array.isArray(entries) ? entries.filter(Boolean) : [];
  if (payload.length === 0) {
    return;
  }

  const normalized = payload
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

  if (normalized.length === 0) {
    return;
  }

  const { silentOnSuccess = false, skipDisable = false } = options;

  try {
    if (!skipDisable && decommissionButton) {
      decommissionButton.disabled = true;
    }
    const result = await window.api.decommissionItems(normalized, {
      estado: BAJA_STATE_LABEL,
    });

    const updatedCount = Number(result?.updated ?? 0);
    if (updatedCount > 0) {
      if (!silentOnSuccess) {
        const message =
          updatedCount === 1
            ? 'Se dio de baja 1 item.'
            : `Se dieron de baja ${updatedCount} items.`;
        showStatus(message, 'is-success');
      }

      normalized.forEach((entry) => {
        const key = getSelectionKey(entry.serial, entry.rowNumber);
        if (key) {
          selectedItems.delete(key);
        }
      });

      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
      }

      await refreshItems();
    } else if (!silentOnSuccess) {
      showStatus('Los items seleccionados ya estaban dados de baja.', 'is-info');
    }
  } catch (error) {
    console.error('Failed to mark items as baja', error);
    showStatus('No se pudo dar de baja los items seleccionados.', 'is-danger');
  } finally {
    updateSelectionUI();
  }
}

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', () => {
    if (displayedItems.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    if (selectAllCheckbox.checked) {
      displayedItems.forEach((item) => {
        const serial = getItemSerial(item);
        const rowNumber = getItemRowNumber(item);
        const key = getSelectionKey(serial, rowNumber);
        if (key) {
          selectedItems.set(key, {
            serial,
            rowNumber,
          });
        }
      });
    } else {
      displayedItems.forEach((item) => {
        const serial = getItemSerial(item);
        const rowNumber = getItemRowNumber(item);
        const key = getSelectionKey(serial, rowNumber);
        if (key) {
          selectedItems.delete(key);
        }
      });
    }

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row) => {
      const serial = row.dataset.serial || '';
      const rowNumber = row.dataset.rowNumber ? Number(row.dataset.rowNumber) : null;
      const key = getSelectionKey(serial, rowNumber);
      const shouldSelect = key ? selectedItems.has(key) : false;
      row.classList.toggle('is-selected', shouldSelect);
      const checkbox = row.querySelector('input[data-row-select]');
      if (checkbox) {
        checkbox.checked = shouldSelect;
      }
    });

    updateSelectionUI();
  });
}

function getSelectedEntries() {
  return Array.from(selectedItems.values())
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

if (deleteSelectedButton) {
  deleteSelectedButton.addEventListener('click', async () => {
    if (selectedItems.size === 0) {
      return;
    }

    const confirmation = window.confirm('Seguro que deseas eliminar los items seleccionados?');
    if (!confirmation) {
      return;
    }

    const itemsToDelete = Array.from(selectedItems.values());
    try {
      deleteSelectedButton.disabled = true;
      const result = await window.api.deleteItems(itemsToDelete);
      const deletedCount = Number(result?.deleted ?? 0);
      const deletedItemsSnapshot = Array.isArray(result?.items)
        ? result.items
        : itemsToDelete
            .map((entry) => {
              const item = findCachedItem(entry.serial, entry.rowNumber);
              return item ? stripInternalFields(item) : null;
            })
            .filter(Boolean);

      if (deletedCount > 0) {
        showStatus(`Se eliminaron ${deletedCount} +�tems.`, 'is-success');
        showStatus(`Se eliminaron ${deletedCount} items.`, 'is-success');
        highlightRowBySerial(null);
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
        lastAction = {
          type: 'delete',
          items: deletedItemsSnapshot.map((entry) => ({ ...entry })),
        };
        updateUndoUI();
        await refreshItems();
      } else {
        showStatus('No se elimin+� ning+�n +�tem.', 'is-warning');
        lastAction = null;
        updateUndoUI();
      }
    } catch (error) {
      console.error('Failed to delete selected items', error);
      showStatus('No se pudieron eliminar los +�tems seleccionados.', 'is-danger');
      showStatus('No se pudieron eliminar los items seleccionados.', 'is-danger');
      updateUndoUI();
    } finally {
      updateSelectionUI();
    }
  });
}

if (decommissionButton) {
  decommissionButton.addEventListener('click', async () => {
    if (selectedItems.size === 0) {
      return;
    }
    const entries = Array.from(selectedItems.values());
    showStatus('Marcando items como dados de baja...', 'is-info');
    await handleDecommissionAction(entries);
  });
}

if (bulkEditButton) {
  bulkEditButton.addEventListener('click', () => {
    if (selectedItems.size === 0) {
      showStatus('Selecciona al menos un item para editar.', 'is-warning');
      return;
    }
    openBulkEditModal();
  });
}

if (printLabelsButton) {
  printLabelsButton.addEventListener('click', async () => {
    const entries = getSelectedEntries();
    if (entries.length === 0) {
      showStatus('Selecciona al menos un item para imprimir etiquetas.', 'is-warning');
      return;
    }

    try {
      printLabelsButton.disabled = true;
      showStatus('Generando etiquetas en PDF...', 'is-info');
      const result = await window.api.printLabels(entries);
      if (result?.canceled) {
        if (result.reason && result.reason !== 'user-cancelled') {
          showStatus('No se generaron etiquetas.', 'is-warning');
        }
        return;
      }

      const printedCount = Number(result?.printed ?? 0);
      const totalRequested = Number(result?.totalRequested ?? printedCount);
      const missingCount = Number(result?.missing ?? 0);

      if (printedCount > 0) {
        let message =
          printedCount === 1
            ? 'Se gener+� un PDF con 1 etiqueta.'
            : `Se gener+� un PDF con ${printedCount} etiquetas.`;
        if (missingCount > 0 || totalRequested > printedCount) {
          const notFound = missingCount > 0 ? missingCount : totalRequested - printedCount;
          message += ` No se pudieron incluir ${notFound} item(s).`;
          showStatus(message, 'is-warning');
        } else {
          showStatus(message, 'is-success');
        }
      } else {
        showStatus('No se generaron etiquetas para los items seleccionados.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to generate label sheet', error);
      showStatus('No se pudieron generar las etiquetas.', 'is-danger');
    } finally {
      updateSelectionUI();
    }
  });
}

if (locationListButton) {
  locationListButton.addEventListener('click', () => {
    const entries = getSelectedEntries();
    if (entries.length === 0) {
      showStatus('Selecciona al menos un item para generar el listado.', 'is-warning');
      return;
    }
    const { summary, plainText, totalUnits } = buildLocationListSummary(entries);
    if (!Array.isArray(summary) || summary.length === 0) {
      showStatus('No se pudo generar el listado de ubicaciones.', 'is-warning');
      return;
    }
    openLocationListModalWithSummary(summary, plainText, totalUnits, entries);
  });
}

if (copyLocationListButton) {
  copyLocationListButton.addEventListener('click', async () => {
    if (!lastLocationListPlainText) {
      return;
    }
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(lastLocationListPlainText);
      showStatus('Listado copiado al portapapeles.', 'is-success');
    } catch (error) {
      console.error('Failed to copy location list', error);
      showStatus('No se pudo copiar el listado.', 'is-danger');
    }
  });
}

if (downloadLocationListButton) {
  downloadLocationListButton.addEventListener('click', async () => {
    if (!Array.isArray(lastLocationReportEntries) || lastLocationReportEntries.length === 0) {
      return;
    }
    try {
      downloadLocationListButton.disabled = true;
      showStatus('Generando PDF del listado...', 'is-info');
      const result = await window.api.generateLocationReport(lastLocationReportEntries);
      if (result?.canceled) {
        showStatus('Generacion cancelada.', 'is-warning');
        return;
      }
      const groupedCount = Number(result?.groupedLocations ?? 0);
      const unitsCount = Number(result?.totalUnits ?? 0);
      const baseMessage =
        groupedCount > 0
          ? `Se genero un PDF con ${groupedCount} ubicacion(es) y ${unitsCount} unidad(es).`
          : 'Se genero un PDF con el listado seleccionado.';
      const location = result?.filePath ? ` Guardado en ${result.filePath}.` : '';
      showStatus(`${baseMessage}${location}`, 'is-success');
      const missingCount = Number(result?.missing ?? 0);
      if (missingCount > 0) {
        showStatus(`No se pudieron incluir ${missingCount} registro(s).`, 'is-warning');
      }
    } catch (error) {
      console.error('Failed to generate location report PDF', error);
      showStatus('No se pudo generar el PDF del listado.', 'is-danger');
    } finally {
      if (Array.isArray(lastLocationReportEntries) && lastLocationReportEntries.length > 0) {
        downloadLocationListButton.disabled = false;
      }
    }
  });
}

if (loadDemoItemsButton) {
  loadDemoItemsButton.addEventListener('click', async () => {
    try {
      loadDemoItemsButton.disabled = true;
      showStatus('Agregando items de demostraci+�n...', 'is-info');
      const result = await window.api.loadDemoItems();
      const addedCount = Number(result?.added ?? 0);
      if (addedCount > 0) {
        showStatus(
          addedCount === 1
            ? 'Se agreg+� 1 item de demostraci+�n.'
            : `Se agregaron ${addedCount} items de demostraci+�n.`,
          'is-success',
        );
      } else {
        showStatus('No se agregaron nuevos items de demostraci+�n.', 'is-warning');
      }
      await refreshItems();
    } catch (error) {
      console.error('Failed to load demo items', error);
      showStatus('No se pudieron agregar los items de demostraci+�n.', 'is-danger');
    } finally {
      loadDemoItemsButton.disabled = false;
    }
  });
}

if (undoDeleteButton) {
  undoDeleteButton.addEventListener('click', async () => {
    if (!lastAction) {
      return;
    }

    try {
      undoDeleteButton.disabled = true;

      if (lastAction.type === 'delete') {
        const items = Array.isArray(lastAction.items) ? lastAction.items : [];
        if (items.length === 0) {
          showStatus('No hay acciones para deshacer.', 'is-warning');
        } else {
          const result = await window.api.restoreItems(items);
          const restoredCount = Number(result?.restored ?? 0);

          if (restoredCount > 0) {
            showStatus(`Se restauraron ${restoredCount} +�tems.`, 'is-success');
            await refreshItems();
          } else {
            showStatus('No se restaur+� ning+�n +�tem.', 'is-warning');
          }
        }
      } else if (lastAction.type === 'edit') {
        const previousItem = lastAction.before;
        if (!previousItem) {
          showStatus('No hay cambios para deshacer.', 'is-warning');
        } else {
          const targetSerial = getItemSerial(previousItem);
          const targetRowNumber = getItemRowNumber(previousItem);
          const result = await window.api.updateItem({
            target: {
              serial: targetSerial,
              rowNumber: targetRowNumber,
            },
            item: previousItem,
          });

          const updatedCount = Number(result?.updated ?? 0);
          if (updatedCount > 0) {
            showStatus('Se revirtieron los cambios del +�tem.', 'is-success');
            await refreshItems();
            const revertedItem =
              findCachedItem(targetSerial, targetRowNumber) ||
              result?.item ||
              previousItem;
            await openDetailModal(revertedItem, result?.qrDataUrl);
          } else {
            showStatus('No se pudo revertir el +�tem.', 'is-warning');
          }
        }
      } else {
        showStatus('No hay acciones para deshacer.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to undo last action', error);
      showStatus('No se pudo deshacer la acci+�n.', 'is-danger');
      showStatus('No se pudo deshacer la accion.', 'is-danger');
      lastAction = null;
      selectedItems.clear();
      updateSelectionUI();
      updateUndoUI();
    }
  });
}

function showStatus(message, tone = 'is-info') {
  statusNotification.textContent = message;
  statusNotification.className = `notification ${tone}`;
  statusNotification.classList.remove('is-hidden');
}

function hideStatus() {
  statusNotification.classList.add('is-hidden');
  statusNotification.textContent = '';
}

const SERIAL_SUFFIX_PAD = 3;

function getExistingSerialsSet() {
  const serials = new Set();
  const items = Array.isArray(cachedItems) ? cachedItems : [];
  items.forEach((entry) => {
    const serial = normalizeSerialValue(entry?.NoSerie);
    if (serial) {
      serials.add(serial);
    }
  });
  return serials;
}

function generateSerialNumber(item) {
  const base = deriveSerialBase(item);
  if (!base) {
    return '';
  }

  const existingSerials = getExistingSerialsSet();
  let suffix = 1;
  let candidate = `${base}-${String(suffix).padStart(SERIAL_SUFFIX_PAD, '0')}`;

  while (existingSerials.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${String(suffix).padStart(SERIAL_SUFFIX_PAD, '0')}`;
  }

  return candidate;
}
function resetImageInput(context) {
  if (!context) {
    return;
  }

  context.dataUrl = '';

  if (context.input) {
    context.input.value = '';
  }

  if (context.nameDisplay) {
    context.nameDisplay.textContent = 'No se ha seleccionado una image';
  }

  if (context.preview) {
    context.preview.removeAttribute('src');
  }

  if (context.container) {
    context.container.classList.add('is-hidden');
  }
}

function setImagePreviewFromDataUrl(context, dataUrl, label) {
  if (!context) {
    return;
  }

  if (!dataUrl) {
    resetImageInput(context);
    return;
  }

  context.dataUrl = dataUrl;
  if (context.preview) {
    context.preview.src = dataUrl;
  }
  if (context.container) {
    context.container.classList.remove('is-hidden');
  }
  if (context.nameDisplay) {
    context.nameDisplay.textContent = label || 'image cargada';
  }
  if (context.input) {
    context.input.value = '';
  }
}

function attachImageInput(context) {
  if (!context?.input) {
    return;
  }

  context.input.addEventListener('change', () => {
    if (!context.input.files || context.input.files.length === 0) {
      resetImageInput(context);
      return;
    }

    const [file] = context.input.files;
    if (!file.type.startsWith('image/')) {
      showStatus('Seleccione un archivo de imagen valido.', 'is-warning');
      resetImageInput(context);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showStatus('La image debe pesar menos de 2 MB.', 'is-warning');
      resetImageInput(context);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('error', () => {
      console.error('Failed to read selected image', reader.error);
      showStatus('No se pudo leer la image seleccionada.', 'is-danger');
      resetImageInput(context);
    });

    reader.addEventListener('load', () => {
      const result = reader.result;
      if (typeof result === 'string' && result.startsWith('data:image')) {
        setImagePreviewFromDataUrl(context, result, file.name);
        if (
          statusNotification.classList.contains('is-warning') ||
          statusNotification.classList.contains('is-danger')
        ) {
          hideStatus();
        }
      } else {
        showStatus('El archivo seleccionado no es una image valida.', 'is-warning');
        resetImageInput(context);
      }
    });

    reader.readAsDataURL(file);
  });
}

attachImageInput(singleImageContext);
attachImageInput(batchImageContext);

if (form) {
  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      resetImageInput(singleImageContext);
      if (serialInput) {
        serialInput.value = '';
      }
    }, 0);
  });
}

if (batchForm) {
  batchForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      resetImageInput(batchImageContext);
    }, 0);
  });
}

function collectItemFromForm() {
  const item = {};

  singleFieldElements.forEach((element) => {
    const key = element.dataset.field;
    if (!key) {
      return;
    }

    if (element.type === 'file') {
      item[key] = singleImageContext.dataUrl || '';
      return;
    }

    let value = element.value ?? '';
    if (typeof value === 'string') {
      value = value.trim();
    }

    if (element.type === 'number' && value !== '') {
      const parsed = Number(value);
      value = Number.isNaN(parsed) ? value : parsed;
    }

    item[key] = value;
  });

  if (!item.NoSerie) {
    const generated = generateSerialNumber(item);
    item.NoSerie = generated;
    if (serialInput) {
      serialInput.value = generated;
    }
  }

  return item;
}

function resetForm() {
  if (form) {
    form.reset();
  }
  stopEditing();
  resetImageInput(singleImageContext);
  if (serialInput) {
    serialInput.value = '';
  }
  applyActiveLocationToForms({ force: true });
}

function collectBatchBaseItem() {
  const base = {};

  batchFieldElements.forEach((element) => {
    const key = element.dataset.batchField;
    if (!key) {
      return;
    }

    if (element.type === 'file') {
      base[key] = batchImageContext.dataUrl || '';
      return;
    }

    let value = element.value ?? '';
    if (typeof value === 'string') {
      value = value.trim();
    }

    if (element.type === 'number' && value !== '') {
      const parsed = Number(value);
      value = Number.isNaN(parsed) ? value : parsed;
    }

    base[key] = value;
  });

  if (batchImageContext.dataUrl) {
    base.Imagen = batchImageContext.dataUrl;
  }

  return base;
}

function resetBatchForm() {
  if (batchForm) {
    batchForm.reset();
  }
  resetImageInput(batchImageContext);
  applyActiveLocationToForms({ force: true });
}

function highlightRowBySerial(serial) {
  const rows = tableBody.querySelectorAll('tr');
  rows.forEach((row) => row.classList.remove(DETAIL_HIGHLIGHT_CLASS));
  if (!serial) {
    return;
  }

  const target = Array.from(rows).find((row) => row.dataset.serial === serial);
  if (target) {
    target.classList.add(DETAIL_HIGHLIGHT_CLASS);
  }
}

function populateDetailFields(item) {
  detailFields.innerHTML = '';
  FORM_FIELD_KEYS.forEach((key) => {
    const dt = document.createElement('dt');
    dt.textContent = key;
    const dd = document.createElement('dd');

    if (key === 'Imagen') {
      if (item[key]) {
        const image = document.createElement('img');
        image.src = item[key];
        image.alt = `Imagen de ${item.Nombre || 'item'}`;
        image.classList.add('detail-image');
        dd.appendChild(image);
      } else {
        dd.textContent = 'N/A';
      }
    } else {
      const value = item[key];
      dd.textContent = value !== undefined && value !== null ? String(value) : '';
    }

    detailFields.appendChild(dt);
    detailFields.appendChild(dd);
  });
}

async function openDetailModal(item, cachedQr) {
  if (!detailModal) {
    return;
  }

  const resolvedItem =
    findCachedItem(item?.NoSerie, item?._rowNumber) || item;

  currentDetailItem = resolvedItem;
  if (editItemButton) {
    editItemButton.disabled = false;
  }

  highlightRowBySerial(resolvedItem.NoSerie);
  populateDetailFields(resolvedItem);
  detailTitle.textContent = resolvedItem.Nombre || 'Detalle del item';
  detailModal.classList.add('is-active');

  let qrDataUrl = cachedQr;
  if (!qrDataUrl) {
    try {
      qrDataUrl = await window.api.generateQr(resolvedItem);
    } catch (error) {
      console.error('Failed to generate QR for item', error);
      showStatus('No se pudo generar el codigo QR para este item.', 'is-warning');
    }
  }

  if (qrDataUrl) {
    detailQr.src = qrDataUrl;
  } else {
    detailQr.removeAttribute('src');
  }

  return resolvedItem;
}

function closeDetailModal() {
  if (!detailModal) {
    return;
  }
  detailModal.classList.remove('is-active');
  highlightRowBySerial(null);
  currentDetailItem = null;
  if (editItemButton) {
    editItemButton.disabled = true;
  }
}

modalCloseControls.forEach((control) => {
  control.addEventListener('click', closeDetailModal);
});

locationListCloseControls.forEach((control) => {
  control.addEventListener('click', closeLocationListModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (locationListModal && locationListModal.classList.contains('is-active')) {
    closeLocationListModal();
    return;
  }
  closeDetailModal();
});

function createItemRow(item) {
  const row = document.createElement('tr');
  const serial = getItemSerial(item);
  const rowNumber = getItemRowNumber(item);

  row.dataset.serial = serial;
  row.dataset.rowNumber = rowNumber != null ? String(rowNumber) : '';

  const selectionKey = getSelectionKey(serial, rowNumber);

  const selectionCell = document.createElement('td');
  selectionCell.classList.add('table-selection-cell');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.rowSelect = 'true';

  const isSelected = selectionKey ? selectedItems.has(selectionKey) : false;
  checkbox.checked = isSelected;
  if (isSelected) {
    row.classList.add('is-selected');
  }

  checkbox.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSelection(serial, rowNumber, checkbox.checked, row);
  });

  selectionCell.appendChild(checkbox);
  row.appendChild(selectionCell);

  TABLE_FIELD_KEYS.forEach((key) => {
    const cell = document.createElement('td');
    let value = item?.[key];

    if (key === 'Cantidad') {
      const numeric = Number(value);
      value = Number.isFinite(numeric) ? numeric.toString() : value || '';
    }

    if (key === 'NoSerie' && !value) {
      value = 'Sin serie';
    }

    const textValue =
      value !== undefined && value !== null && value !== '' ? String(value) : 'N/A';

    cell.textContent = textValue;
    cell.title = textValue === 'N/A' ? '' : textValue;
    row.appendChild(cell);
  });

  const actionsCell = document.createElement('td');
  actionsCell.classList.add('is-narrow', 'table-actions-cell');

  const detailButton = document.createElement('button');
  detailButton.type = 'button';
  detailButton.className = 'button is-small is-link is-light';
  detailButton.textContent = 'Ver';
  detailButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openDetailModal(item).catch((error) => {
      console.error('Failed to open detail modal', error);
    });
  });
  actionsCell.appendChild(detailButton);

  const estado = (item?.Estado || '').trim();
  if (estado && estado.toLowerCase() !== BAJA_STATE_LABEL.toLowerCase()) {
    const bajaButton = document.createElement('button');
    bajaButton.type = 'button';
    bajaButton.className = 'button is-small is-warning is-light';
    bajaButton.textContent = BAJA_BUTTON_LABEL;
    bajaButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      await handleDecommissionAction(
        [
          {
            serial,
            rowNumber,
          },
        ],
        { silentOnSuccess: false, skipDisable: true },
      );
    });
    actionsCell.appendChild(bajaButton);
  }

  row.appendChild(actionsCell);

  row.addEventListener('click', () => {
    openDetailModal(item).catch((error) => {
      console.error('Failed to open detail modal', error);
    });
  });

  return row;
}

function renderItems(items) {
  if (Array.isArray(items)) {
    cachedItems = items;
  }

  const normalizedItems = Array.isArray(cachedItems) ? cachedItems : [];
  refreshFormSuggestionsFromItems(normalizedItems);
  const availableKeys = new Set();

  normalizedItems.forEach((item) => {
    const serial = getItemSerial(item);
    const rowNumber = getItemRowNumber(item);
    const key = getSelectionKey(serial, rowNumber);
    if (key) {
      availableKeys.add(key);
    }
  });

  Array.from(selectedItems.keys()).forEach((key) => {
    if (!availableKeys.has(key)) {
      selectedItems.delete(key);
    }
  });

  displayedItems = applyFiltersAndSort(normalizedItems);
  tableBody.innerHTML = '';

  if (normalizedItems.length === 0) {
    highlightRowBySerial(null);
    selectedItems.clear();
    displayedItems = [];
    updateSelectionUI();

    tableContainer.classList.add('is-hidden');
    if (emptyState) {
      emptyState.textContent = 'Aun no hay items guardados.';
      emptyState.classList.remove('is-hidden');
    }

    updateUndoUI();
    updateSortIndicators();
    updateFilterUIState();
    return;
  }

  tableContainer.classList.remove('is-hidden');
  if (emptyState) {
    emptyState.classList.add('is-hidden');
  }

  if (displayedItems.length === 0) {
    highlightRowBySerial(null);
    const columnCount = TABLE_FIELD_KEYS.length + 2;
    tableBody.innerHTML = `
      <tr class="table-empty-row">
        <td colspan="${columnCount}" class="has-text-centered has-text-grey">
          No hay items que coincidan con los filtros actuales.
        </td>
      </tr>
    `;
  } else {
    const fragment = document.createDocumentFragment();
    displayedItems.forEach((item) => {
      fragment.appendChild(createItemRow(item));
    });
    tableBody.appendChild(fragment);
  }

  updateSelectionUI();
  updateUndoUI();
  updateSortIndicators();
  updateFilterUIState();
}

async function refreshItems() {
  try {
    const items = await window.api.listItems();
    renderItems(items);
  } catch (error) {
    console.error('Failed to load items', error);
    showStatus('No se pudo cargar el inventario.', 'is-danger');
  }
}

function computeRutCheckDigit(rawBody) {
  const body = String(rawBody || '').replace(/\D/g, '');
  if (!body) {
    return '';
  }

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) {
    return '0';
  }
  if (remainder === 10) {
    return 'K';
  }
  return String(remainder);
}

function formatRutValue(raw) {
  const sanitized = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (sanitized.length < 2) {
    return sanitized;
  }

  const body = sanitized.slice(0, -1).replace(/\D/g, '');
  if (!body) {
    return sanitized;
  }

  const expectedCheckDigit = computeRutCheckDigit(body);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (!expectedCheckDigit) {
    return formattedBody;
  }

  return `${formattedBody}-${expectedCheckDigit}`;
}

const ubicacionInput = singleFieldMap?.Ubicacion;
if (ubicacionInput) {
  ubicacionInput.addEventListener('input', () => {
    if (form && form.dataset.mode === 'edit') {
      return;
    }
    setActiveLocation(ubicacionInput.value || '', { propagate: false });
  });
}

const batchUbicacionInput = batchFieldMap?.Ubicacion;
if (batchUbicacionInput) {
  batchUbicacionInput.addEventListener('input', () => {
    setActiveLocation(batchUbicacionInput.value || '');
  });
}

const bulkUbicacionInput = bulkEditFieldMap?.Ubicacion;
if (bulkUbicacionInput) {
  bulkUbicacionInput.addEventListener('input', () => {
    setActiveLocation(bulkUbicacionInput.value || '', { allowEdit: true, propagate: false });
  });
}

bulkEditApplyControls.forEach((checkbox) => {
  const key = checkbox.dataset.bulkApply;
  const targetField = key ? bulkEditFieldMap?.[key] : null;
  if (targetField) {
    targetField.addEventListener('input', () => {
      checkbox.checked = true;
    });
  }
});

if (bulkEditCloseControls && bulkEditCloseControls.length > 0) {
  bulkEditCloseControls.forEach((control) => {
    control.addEventListener('click', () => {
      closeBulkEditModal();
    });
  });
}

if (locationAddCloseControls && locationAddCloseControls.length > 0) {
  locationAddCloseControls.forEach((control) => {
    control.addEventListener('click', () => {
      closeLocationAddModal();
    });
  });
}

if (locationAddForm) {
  locationAddForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = locationAddInput ? locationAddInput.value.trim() : '';
    if (!value) {
      showStatus('Ingresa un nombre de ubicacion.', 'is-warning');
      return;
    }
    setActiveLocation(value, { allowEdit: true, force: true });
    closeLocationAddModal();
  });
}

if (bulkEditForm) {
  bulkEditForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (selectedItems.size === 0) {
      showStatus('Selecciona al menos un item para editar.', 'is-warning');
      return;
    }

    const updates = {};
    Object.entries(bulkEditFieldMap).forEach(([key, element]) => {
      const checkbox = bulkEditApplyMap[key];
      if (!checkbox || !checkbox.checked) {
        return;
      }
      let value = element.value ?? '';
      if (typeof value === 'string') {
        value = value.trim();
      }
      updates[key] = value;
    });

    if (Object.keys(updates).length === 0) {
      showStatus('Activa y completa al menos un campo para editar.', 'is-warning');
      return;
    }

    const entries = getSelectedEntries();
    if (entries.length === 0) {
      showStatus('No se encontraron items seleccionados.', 'is-warning');
      return;
    }

    try {
      if (bulkEditButton) {
        bulkEditButton.disabled = true;
      }
      const submitButton = bulkEditForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
      }
      showStatus('Actualizando items seleccionados...', 'is-info');

      let updatedCount = 0;
      for (const entry of entries) {
        const currentItem = findCachedItem(entry.serial, entry.rowNumber);
        if (!currentItem) {
          continue;
        }
        const nextItem = { ...currentItem, ...updates };
        if (entry.serial) {
          nextItem.NoSerie = entry.serial;
        }
        const result = await window.api.updateItem({
          target: entry,
          item: nextItem,
        });
        const count = Number(result?.updated ?? 0);
        if (count > 0) {
          updatedCount += 1;
        }
      }

      if (updates.Ubicacion) {
        setActiveLocation(updates.Ubicacion, { allowEdit: true, force: true });
      }

      if (updatedCount > 0) {
        showStatus(
          `Se actualizaron ${updatedCount} ${updatedCount === 1 ? 'item' : 'items'}.`,
          'is-success',
        );
        closeBulkEditModal();
        await refreshItems();
      } else {
        showStatus('No se actualizaron items seleccionados.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to apply bulk edit', error);
      showStatus('No se pudo aplicar la edicion masiva.', 'is-danger');
    } finally {
      if (bulkEditButton) {
        bulkEditButton.disabled = selectedItems.size === 0;
      }
      const submitButton = bulkEditForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

if (rutInput) {
  rutInput.addEventListener('input', () => {
    rutInput.value = rutInput.value.replace(/[^0-9kK]/g, '').toUpperCase();
  });

  rutInput.addEventListener('blur', () => {
    const formatted = formatRutValue(rutInput.value);
    if (formatted) {
      rutInput.value = formatted;
    }
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const item = collectItemFromForm();
  const isEditMode = form.dataset.mode === 'edit';

  if (!item.Nombre) {
    showStatus('El campo "Nombre" es obligatorio.', 'is-warning');
    return;
  }

  try {
    hideStatus();
    if (isEditMode) {
      const targetSerial =
        form.dataset.serial || editingState?.serial || item.NoSerie || '';
      const targetRowNumber = normalizeRowNumber(
        form.dataset.rowNumber ?? editingState?.rowNumber,
      );

      const previousItem =
        cloneItem(editingState?.originalItem) ||
        cloneItem(findCachedItem(targetSerial, targetRowNumber));
      if (previousItem) {
        previousItem.NoSerie = getItemSerial(previousItem) || targetSerial;
        if (targetRowNumber != null && previousItem._rowNumber == null) {
          previousItem._rowNumber = targetRowNumber;
        }
      }

      item.NoSerie = targetSerial || item.NoSerie;

      const result = await window.api.updateItem({
        target: {
          serial: targetSerial,
          rowNumber: targetRowNumber,
        },
        item,
      });

      const updatedCount = Number(result?.updated ?? 0);

      if (updatedCount > 0) {
        showStatus('+�tem actualizado correctamente.', 'is-success');
        await refreshItems();
        const refreshedItem =
          findCachedItem(targetSerial, targetRowNumber) ||
          result?.item || {
            ...item,
            NoSerie: targetSerial,
            _rowNumber: targetRowNumber ?? undefined,
          };

        if (previousItem) {
          lastAction = {
            type: 'edit',
            before: cloneItem(previousItem),
            after: cloneItem(refreshedItem),
          };
        } else {
          lastAction = null;
        }
        updateUndoUI();

        resetForm();
        await openDetailModal(refreshedItem, result?.qrDataUrl);
      } else {
        showStatus('No se encontro el item a actualizar.', 'is-warning');
        lastAction = null;
        updateUndoUI();
      }
    } else {
      const qrDataUrl = await window.api.saveItem(item);
      showStatus('Item guardado correctamente.', 'is-success');
      qrImage.src = qrDataUrl;
      qrContainer.classList.remove('is-hidden');
      if (qrSection) {
        qrSection.classList.remove('is-hidden');
      }
      resetForm();
      await refreshItems();
      await openDetailModal(item, qrDataUrl);
    }
  } catch (error) {
    if (isEditMode) {
      console.error('Failed to update item', error);
      showStatus('No se pudo actualizar el item.', 'is-danger');
      lastAction = null;
      updateUndoUI();
    } else {
      console.error('Failed to save item', error);
      showStatus('Ocurrio un error al guardar el item.', 'is-danger');
    }
  }
});
}

if (batchForm) {
  batchForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const baseItem = collectBatchBaseItem();
    if (!baseItem.Nombre) {
      showStatus('El campo "Nombre" es obligatorio para el lote.', 'is-warning');
      batchFieldMap.Nombre?.focus();
      return;
    }

    const count = toPositiveInteger(batchCountInput?.value ?? 0, 0);
    if (count <= 0) {
      showStatus('Ingresa una cantidad valida de items a crear.', 'is-warning');
      batchCountInput?.focus();
      return;
    }

    const prefix = (batchSerialPrefixInput?.value || '').trim();
    const startIndex = toPositiveInteger(batchStartIndexInput?.value ?? 1, 1);

    const items = [];
    for (let index = 0; index < count; index += 1) {
      const copy = cloneItem(baseItem) || { ...baseItem };
      if (prefix) {
        const suffix = (startIndex + index).toString().padStart(3, '0');
        copy.NoSerie = `${prefix}-${suffix}`;
      } else {
        copy.NoSerie = copy.NoSerie || '';
      }
      if (!copy.Cantidad) {
        copy.Cantidad = baseItem.Cantidad || 1;
      }
      if (batchImageContext.dataUrl) {
        copy.Imagen = batchImageContext.dataUrl;
      }
      items.push(copy);
    }

    try {
      if (batchSubmitButton) {
        batchSubmitButton.disabled = true;
      }
      showStatus('Guardando lote de items...', 'is-info');
      const result = await window.api.saveItemsBatch(items);
      const savedCount = Number(result?.saved ?? 0);

      if (savedCount > 0) {
        const message = prefix
          ? `Se guardaron ${savedCount} items con el prefijo ${prefix}.`
          : `Se guardaron ${savedCount} items.`;
        showStatus(message, 'is-success');
        resetBatchForm();
        setActiveFormMode('single');
        await refreshItems();
      } else {
        showStatus('No se guardaron items del lote.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to save batch of items', error);
      showStatus('No se pudo guardar el lote de items.', 'is-danger');
    } finally {
      if (batchSubmitButton) {
        batchSubmitButton.disabled = false;
      }
    }
  });
}

setActiveMainTab('register');
setActiveFormMode('single');
setInventoryScope(SCOPE_GENERAL);
renderLocationQuickButtons();
applyActiveLocationToForms({ force: true });
refreshItems();



























