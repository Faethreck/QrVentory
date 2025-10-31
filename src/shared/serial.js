export function normalizeSerialValue(value) {
  return value == null ? '' : String(value).trim();
}

function sanitizeSegment(value, fallback, length) {
  const source = typeof value === 'string' ? value : '';
  const normalizedSource = source.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const normalizedFallback = (fallback || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  let clean = normalizedSource || normalizedFallback;
  if (!clean) {
    clean = '';
  }

  if (clean.length >= length) {
    return clean.slice(0, length);
  }

  const filler = normalizedFallback || 'X';
  return (clean + filler.repeat(length)).slice(0, length);
}

export function buildSerialSegment(value, fallback, length) {
  return sanitizeSegment(value, fallback, length);
}

export function deriveSerialBase(item = {}, options = {}) {
  if (!item || typeof item !== 'object') {
    return '';
  }

  const {
    nameFallback = 'ITEM',
    categoryFallback = 'CAT',
    locationFallback = 'LOC',
    typeFallback = 'TIP',
  } = options;

  const nameSegment = buildSerialSegment(item.Nombre, nameFallback, 4);
  const categorySegment = buildSerialSegment(item.Categoria, categoryFallback, 3);
  const locationSegment = buildSerialSegment(item.Ubicacion, locationFallback, 3);
  const typeSegment = buildSerialSegment(item.Tipo, typeFallback, 3);

  const segments = [nameSegment, categorySegment, locationSegment];

  // Include type segment only when it provides additional distinction (e.g., Tangible vs Fungible)
  if (typeSegment && typeSegment !== categorySegment) {
    segments.push(typeSegment);
  }

  return segments.filter(Boolean).join('-');
}
