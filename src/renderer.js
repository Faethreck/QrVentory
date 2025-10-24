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
const editItemButton = document.getElementById('edit-item');
const filterInputs = document.querySelectorAll('[data-filter-key]');
const clearFiltersButton = document.getElementById('clear-filters');
const sortButtons = document.querySelectorAll('.table-sort-button');
const formSubmitButton = singleForm ? singleForm.querySelector('button[type="submit"]') : null;
const batchSubmitButton = batchForm ? batchForm.querySelector('button[type="submit"]') : null;
const themeToggleButton = document.getElementById('theme-toggle');

const THEME_STORAGE_KEY = 'qrventory-theme';
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
const FORM_FIELD_KEYS = [
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
const TABLE_FIELD_KEYS = [
  'NoSerie',
  'Nombre',
  'Categoria',
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

let cachedItems = [];
let displayedItems = [];
let currentDetailItem = null;
let editingState = null;
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
      formSubmitButton.textContent = 'Guardar cambios';
    }
  } else {
    delete form.dataset.mode;
    delete form.dataset.serial;
    delete form.dataset.rowNumber;
    if (formSubmitButton) {
      formSubmitButton.textContent = 'Guardar ítem';
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
    trigger.parentElement?.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));
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
    trigger.parentElement?.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));
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
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
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
        showStatus(`Se eliminaron ${deletedCount} ítems.`, 'is-success');
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
        showStatus('No se eliminó ningún ítem.', 'is-warning');
        lastAction = null;
        updateUndoUI();
      }
    } catch (error) {
      console.error('Failed to delete selected items', error);
      showStatus('No se pudieron eliminar los ítems seleccionados.', 'is-danger');
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
            ? 'Se generó un PDF con 1 etiqueta.'
            : `Se generó un PDF con ${printedCount} etiquetas.`;
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

if (loadDemoItemsButton) {
  loadDemoItemsButton.addEventListener('click', async () => {
    try {
      loadDemoItemsButton.disabled = true;
      showStatus('Agregando items de demostración...', 'is-info');
      const result = await window.api.loadDemoItems();
      const addedCount = Number(result?.added ?? 0);
      if (addedCount > 0) {
        showStatus(
          addedCount === 1
            ? 'Se agregó 1 item de demostración.'
            : `Se agregaron ${addedCount} items de demostración.`,
          'is-success',
        );
      } else {
        showStatus('No se agregaron nuevos items de demostración.', 'is-warning');
      }
      await refreshItems();
    } catch (error) {
      console.error('Failed to load demo items', error);
      showStatus('No se pudieron agregar los items de demostración.', 'is-danger');
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
            showStatus(`Se restauraron ${restoredCount} ítems.`, 'is-success');
            await refreshItems();
          } else {
            showStatus('No se restauró ningún ítem.', 'is-warning');
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
            showStatus('Se revirtieron los cambios del ítem.', 'is-success');
            await refreshItems();
            const revertedItem =
              findCachedItem(targetSerial, targetRowNumber) ||
              result?.item ||
              previousItem;
            await openDetailModal(revertedItem, result?.qrDataUrl);
          } else {
            showStatus('No se pudo revertir el ítem.', 'is-warning');
          }
        }
      } else {
        showStatus('No hay acciones para deshacer.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to undo last action', error);
      showStatus('No se pudo deshacer la acción.', 'is-danger');
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

function slug(value, fallback, length) {
  const clean = (value || fallback)
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (clean.length >= length) {
    return clean.slice(0, length);
  }

  const filler = (fallback || '').toUpperCase() || 'X';
  return (clean + filler.repeat(length)).slice(0, length);
}

function generateSerialNumber(item) {
  const locationCode = slug(item.Ubicacion, 'LOC', 3);
  const categoryCode = slug(item.Categoria, 'CAT', 3);
  const providerCode = slug(item.Proveedor, 'PRV', 2);
  const rawDate = item['Fecha Ingreso']
    ? item['Fecha Ingreso'].replace(/-/g, '')
    : new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const dateSegment = rawDate.slice(-6);
  const quantitySegment = (item.Cantidad || '1').toString().padStart(2, '0').slice(-2);
  const randomSegment = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `${locationCode}${categoryCode}${providerCode}-${dateSegment}-${quantitySegment}${randomSegment}`;
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

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDetailModal();
  }
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
        showStatus('Ítem actualizado correctamente.', 'is-success');
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
        showStatus('No se encontró el ítem a actualizar.', 'is-warning');
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
      showStatus('No se pudo actualizar el ítem.', 'is-danger');
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
refreshItems();















