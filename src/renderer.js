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
const exportButton = document.getElementById('export-items');
const editItemButton = document.getElementById('edit-item');
const filterInputs = document.querySelectorAll('[data-filter-key]');
const clearFiltersButton = document.getElementById('clear-filters');
const sortButtons = document.querySelectorAll('.table-sort-button');
const formSubmitButton = form ? form.querySelector('button[type="submit"]') : null;

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
let imageDataUrl = '';

const fieldElements = Array.from(document.querySelectorAll('[data-field]'));
const FIELD_KEYS = fieldElements.map((element) => element.dataset.field);
const fieldElementMap = fieldElements.reduce((accumulator, element) => {
  const key = element.dataset.field;
  if (key) {
    accumulator[key] = element;
  }
  return accumulator;
}, {});

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

function populateFormWithItem(item) {
  FIELD_KEYS.forEach((key) => {
    const element = fieldElementMap[key];
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
}

function setImagePreviewFromDataUrl(dataUrl, label) {
  if (!imagePreview || !imagePreviewContainer || !imageNameDisplay) {
    return;
  }

  imageInput.value = '';

  if (!dataUrl) {
    resetImageInput();
    return;
  }

  imageDataUrl = dataUrl;
  imagePreview.src = dataUrl;
  imagePreviewContainer.classList.remove('is-hidden');
  imageNameDisplay.textContent = label || 'Imagen cargada';
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
  populateFormWithItem(source);

  if (source.Imagen) {
    setImagePreviewFromDataUrl(source.Imagen, 'Imagen actual');
  } else {
    resetImageInput();
  }

  if (qrContainer) {
    qrContainer.classList.add('is-hidden');
  }
  if (qrSection) {
    qrSection.classList.add('is-hidden');
  }

  closeDetailModal();
  setActiveTab('tab-form');
  showStatus(
    'Editando ítem seleccionado. Actualiza los campos y guarda los cambios.',
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

  if (key === 'Imagen') {
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

function applyFiltersAndSort(items) {
  const filtered = filterItems(items);
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
      showStatus('Generando exportación...', 'is-info');
      const result = await window.api.exportItems();

      if (result?.canceled) {
        showStatus('Exportación cancelada.', 'is-warning');
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
      lastAction = null;
      updateUndoUI();
    } finally {
      updateSelectionUI();
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
    } finally {
      lastAction = null;
      selectedItems.clear();
      updateSelectionUI();
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
  stopEditing();
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

  FIELD_KEYS.forEach((key) => {
    const cell = document.createElement('td');
    if (key === 'Imagen') {
      if (item[key]) {
        const image = document.createElement('img');
        image.src = item[key];
        image.alt = `Imagen de ${item.Nombre || 'item'}`;
        image.classList.add('table-image');
        cell.appendChild(image);
        cell.title = image.alt;
      } else {
        cell.textContent = 'N/A';
        cell.title = 'Sin imagen';
      }
    } else {
      const value = item[key];
      const textValue =
        value !== undefined && value !== null ? String(value) : '';
      cell.textContent = textValue;
      cell.title = textValue;
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
      emptyState.textContent = 'Aún no hay ítems guardados.';
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
    const columnCount = FIELD_KEYS.length + 1;
    tableBody.innerHTML = `
      <tr class="table-empty-row">
        <td colspan="${columnCount}" class="has-text-centered has-text-grey">
          No hay ítems que coincidan con los filtros actuales.
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

setActiveTab('tab-form');
refreshItems();











