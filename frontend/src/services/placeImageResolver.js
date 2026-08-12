export const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
  'https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=1200',
];

function normalizeUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseImagesJson(imagesJson) {
  if (Array.isArray(imagesJson)) {
    return imagesJson
      .map((item) => {
        if (typeof item === 'string') return normalizeUrl(item);
        if (item && typeof item === 'object') {
          return normalizeUrl(item.url || item.src || item.image_url || item.imageUrl || item.path);
        }
        return null;
      })
      .filter(Boolean);
  }

  if (typeof imagesJson !== 'string') {
    return [];
  }

  const raw = imagesJson.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return parseImagesJson(parsed);
  } catch {
    const one = normalizeUrl(raw);
    return one ? [one] : [];
  }
}

export function getFallbackImage(placeId, fallbackImages = FALLBACK_IMAGES) {
  if (!Array.isArray(fallbackImages) || fallbackImages.length === 0) return '';
  const safeId = Math.abs(Number(placeId) || 0);
  return fallbackImages[safeId % fallbackImages.length];
}

export function resolvePlaceImages(place, fallbackImages = FALLBACK_IMAGES) {
  const imagesFromJson = parseImagesJson(place?.images_json);
  if (imagesFromJson.length > 0) {
    return imagesFromJson;
  }

  const imageUrl = normalizeUrl(place?.image_url);
  if (imageUrl) {
    return [imageUrl];
  }

  const fallback = getFallbackImage(place?.id, fallbackImages);
  return fallback ? [fallback] : [];
}

export function resolvePlaceImage(place, fallbackImages = FALLBACK_IMAGES) {
  const images = resolvePlaceImages(place, fallbackImages);
  return images[0] || '';
}