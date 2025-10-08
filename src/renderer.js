const statusNotification = document.getElementById('status-notification');
const form = document.getElementById('item-form');
const qrContainer = document.getElementById('qr-container');
const qrSection = document.getElementById('qr-section');
const qrImage = document.getElementById('qr-image');
const tabTriggers = document.querySelectorAll('[data-tab-target]');
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
const selectAllCheckbox = document.getElementById('select-all-rows');
const undoDeleteButton = document.getElementById('undo-delete');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
let imageDataUrl = '';

const fieldElements = Array.from(document.querySelectorAll('[data-field]'));
const FIELD_KEYS = fieldElements.map((element) => element.dataset.field);
let cachedItems = [];
const selectedItems = new Map();
const DETAIL_HIGHLIGHT_CLASS = 'is-detail-highlight';
let lastDeletedItems = [];

const DATA_ROW_MIN = 2;
const normalizeSerial = (value) => (value == null ? '' : String(value).trim());
const normalizeRowNumber = (value) => {
  if (Number.isInteger(value)) {
    return value >= DATA_ROW_MIN ? value : null;
  }
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= DATA_ROW_MIN ? numeric : null;
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

function updateSelectionUI() {
  const totalItems = cachedItems.length;
  const selectedCount = selectedItems.size;
  const hasSelection = selectedCount > 0;

  if (deleteSelectedButton) {
    deleteSelectedButton.disabled = !hasSelection;
  }

  if (selectAllCheckbox) {
    if (totalItems === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.disabled = true;
    } else {
      selectAllCheckbox.disabled = false;
      selectAllCheckbox.checked = selectedCount > 0 && selectedCount === totalItems;
      selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalItems;
    }
  }
}

function updateUndoUI() {
  if (!undoDeleteButton) {
    return;
  }

  const hasUndo = Array.isArray(lastDeletedItems) && lastDeletedItems.length > 0;
  undoDeleteButton.disabled = !hasUndo;
  undoDeleteButton.classList.toggle('is-hidden', !hasUndo);
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

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', () => {
    if (cachedItems.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    if (selectAllCheckbox.checked) {
      selectedItems.clear();
      cachedItems.forEach((item) => {
        const serial = item && item.NoSerie != null ? String(item.NoSerie).trim() : '';
        const rowNumber = Number.isInteger(item?._rowNumber) ? item._rowNumber : null;
        const key = getSelectionKey(serial, rowNumber);
        if (key) {
          selectedItems.set(key, {
            serial,
            rowNumber,
          });
        }
      });
    } else {
      selectedItems.clear();
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

if (deleteSelectedButton) {
  deleteSelectedButton.addEventListener('click', async () => {
    if (selectedItems.size === 0) {
      return;
    }

    const confirmation = window.confirm('¿Quieres eliminar los ítems seleccionados?');
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
        selectedItems.clear();
        highlightRowBySerial(null);
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
        lastDeletedItems = deletedItemsSnapshot;
        updateUndoUI();
        await refreshItems();
      } else {
        showStatus('No se eliminó ningún ítem.', 'is-warning');
        lastDeletedItems = [];
        updateUndoUI();
      }
    } catch (error) {
      console.error('Failed to delete selected items', error);
      showStatus('No se pudieron eliminar los ítems seleccionados.', 'is-danger');
      lastDeletedItems = [];
      updateUndoUI();
    } finally {
      updateSelectionUI();
    }
  });
}

if (undoDeleteButton) {
  undoDeleteButton.addEventListener('click', async () => {
    if (!Array.isArray(lastDeletedItems) || lastDeletedItems.length === 0) {
      return;
    }

    try {
      undoDeleteButton.disabled = true;
      const result = await window.api.restoreItems(lastDeletedItems);
      const restoredCount = Number(result?.restored ?? 0);

      if (restoredCount > 0) {
        showStatus(`Se restauraron ${restoredCount} ítems.`, 'is-success');
        await refreshItems();
      } else {
        showStatus('No se restauró ningún ítem.', 'is-warning');
      }
    } catch (error) {
      console.error('Failed to restore deleted items', error);
      showStatus('No se pudieron restaurar los ítems.', 'is-danger');
    } finally {
      selectedItems.clear();
      updateSelectionUI();
      lastDeletedItems = [];
      updateUndoUI();
    }
  });
}

function setActiveTab(targetId) {
  tabTriggers.forEach((trigger) => {
    const panelId = trigger.dataset.tabTarget;
    const isActive = panelId === targetId;

    trigger.classList.toggle('is-active', isActive);
    trigger.setAttribute('aria-selected', String(isActive));

    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    }
  });
}

tabTriggers.forEach((trigger) => {
  trigger.addEventListener('click', () => setActiveTab(trigger.dataset.tabTarget));
});

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

function resetImageInput() {
  imageDataUrl = '';

  if (imageInput) {
    imageInput.value = '';
  }

  if (imageNameDisplay) {
    imageNameDisplay.textContent = 'No se ha seleccionado una imagen';
  }

  if (imagePreview) {
    imagePreview.removeAttribute('src');
  }

  if (imagePreviewContainer) {
    imagePreviewContainer.classList.add('is-hidden');
  }
}

if (imageInput) {
  imageInput.addEventListener('change', () => {
    if (!imageInput.files || imageInput.files.length === 0) {
      resetImageInput();
      return;
    }

    const [file] = imageInput.files;
    if (!file.type.startsWith('image/')) {
      showStatus('Seleccione un archivo de imagen valido.', 'is-warning');
      resetImageInput();
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      showStatus('La imagen debe pesar menos de 2 MB.', 'is-warning');
      resetImageInput();
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('error', () => {
      console.error('Failed to read selected image', reader.error);
      showStatus('No se pudo leer la imagen seleccionada.', 'is-danger');
      resetImageInput();
    });

    reader.addEventListener('load', () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        showStatus('No se pudo leer la imagen seleccionada.', 'is-danger');
        resetImageInput();
        return;
      }

      imageDataUrl = result;

      if (
        statusNotification.classList.contains('is-warning') ||
        statusNotification.classList.contains('is-danger')
      ) {
        hideStatus();
      }

      if (imagePreview) {
        imagePreview.src = imageDataUrl;
      }

      if (imagePreviewContainer) {
        imagePreviewContainer.classList.remove('is-hidden');
      }

      if (imageNameDisplay) {
        imageNameDisplay.textContent = file.name;
      }
    });

    reader.readAsDataURL(file);
  });
}

function collectItemFromForm() {
  const item = fieldElements.reduce((acc, element) => {
    const key = element.dataset.field;
    if (!key) {
      return acc;
    }

    if (element.type === 'file') {
      acc[key] = imageDataUrl || '';
      return acc;
    }

    let value = element.value ?? '';
    if (typeof value === 'string') {
      value = value.trim();
    }

    if (element.type === 'number' && value !== '') {
      const parsed = Number(value);
      value = Number.isNaN(parsed) ? value : parsed;
    }

    acc[key] = value;
    return acc;
  }, {});

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
  form.reset();
  resetImageInput();
  if (serialInput) {
    serialInput.value = '';
  }
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
  FIELD_KEYS.forEach((key) => {
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

  highlightRowBySerial(item.NoSerie);
  populateDetailFields(item);
  detailTitle.textContent = item.Nombre || 'Detalle del item';
  detailModal.classList.add('is-active');

  let qrDataUrl = cachedQr;
  if (!qrDataUrl) {
    try {
      qrDataUrl = await window.api.generateQr(item);
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
}

function closeDetailModal() {
  if (!detailModal) {
    return;
  }
  detailModal.classList.remove('is-active');
  highlightRowBySerial(null);
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

  FIELD_KEYS.forEach((key) => {
    const cell = document.createElement('td');
    if (key === 'Imagen') {
      if (item[key]) {
        const image = document.createElement('img');
        image.src = item[key];
        image.alt = `Imagen de ${item.Nombre || 'item'}`;
        image.classList.add('table-image');
        cell.appendChild(image);
      } else {
        cell.textContent = 'N/A';
      }
    } else {
      const value = item[key];
      cell.textContent = value !== undefined && value !== null ? String(value) : '';
    }
    row.appendChild(cell);
  });

  row.addEventListener('click', () => {
    openDetailModal(item).catch((error) => {
      console.error('Failed to open detail modal', error);
    });
  });

  return row;
}

function renderItems(items) {
  const normalizedItems = Array.isArray(items) ? items : [];
  cachedItems = normalizedItems;
  tableBody.innerHTML = '';

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

  if (normalizedItems.length === 0) {
    highlightRowBySerial(null);
    selectedItems.clear();
    updateSelectionUI();

    tableContainer.classList.remove('is-hidden');
    emptyState.classList.add('is-hidden');

    const columnCount = FIELD_KEYS.length + 1;
    tableBody.innerHTML = `
      <tr class="table-empty-row">
        <td colspan="${columnCount}" class="has-text-centered has-text-grey">
          Aun no hay items guardados.
        </td>
      </tr>
    `;

    updateUndoUI();
    return;
  }

  emptyState.classList.add('is-hidden');
  tableContainer.classList.remove('is-hidden');

  const fragment = document.createDocumentFragment();
  normalizedItems.forEach((item) => {
    fragment.appendChild(createItemRow(item));
  });

  tableBody.appendChild(fragment);

  updateSelectionUI();
  updateUndoUI();
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const item = collectItemFromForm();

  if (!item.Nombre) {
    showStatus('El campo "Nombre" es obligatorio.', 'is-warning');
    return;
  }

  try {
    hideStatus();
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
  } catch (error) {
    console.error('Failed to save item', error);
    showStatus('Ocurrio un error al guardar el item.', 'is-danger');
  }
});

setActiveTab('tab-form');
refreshItems();










