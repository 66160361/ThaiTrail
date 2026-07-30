// Client-side storage and sync manager for liked & saved places

const LIKED_KEY = 'thaitrail_liked_places';
const SAVED_KEY = 'thaitrail_saved_places';

export const interactionStorage = {
  getLikedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]');
    } catch {
      return [];
    }
  },

  getSavedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    } catch {
      return [];
    }
  },

  isLiked(placeId) {
    if (!placeId) return false;
    const list = this.getLikedPlaces();
    return list.some((p) => String(p.id) === String(placeId));
  },

  isSaved(placeId) {
    if (!placeId) return false;
    const list = this.getSavedPlaces();
    return list.some((p) => String(p.id) === String(placeId));
  },

  toggleLike(place) {
    if (!place || !place.id) return false;
    const list = this.getLikedPlaces();
    const index = list.findIndex((p) => String(p.id) === String(place.id));
    let isLikedNow = false;

    if (index > -1) {
      list.splice(index, 1);
      isLikedNow = false;
    } else {
      list.unshift(place);
      isLikedNow = true;
    }

    localStorage.setItem(LIKED_KEY, JSON.stringify(list));
    return isLikedNow;
  },

  toggleSave(place) {
    if (!place || !place.id) return false;
    const list = this.getSavedPlaces();
    const index = list.findIndex((p) => String(p.id) === String(place.id));
    let isSavedNow = false;

    if (index > -1) {
      list.splice(index, 1);
      isSavedNow = false;
    } else {
      list.unshift(place);
      isSavedNow = true;
    }

    localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    return isSavedNow;
  },

  syncBackend(likedPlacesBackend = [], savedPlacesBackend = []) {
    if (Array.isArray(likedPlacesBackend)) {
      const current = this.getLikedPlaces();
      const map = new Map();
      likedPlacesBackend.forEach((p) => map.set(String(p.id), p));
      current.forEach((p) => {
        if (!map.has(String(p.id))) map.set(String(p.id), p);
      });
      localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(map.values())));
    }

    if (Array.isArray(savedPlacesBackend)) {
      const current = this.getSavedPlaces();
      const map = new Map();
      savedPlacesBackend.forEach((p) => map.set(String(p.id), p));
      current.forEach((p) => {
        if (!map.has(String(p.id))) map.set(String(p.id), p);
      });
      localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(map.values())));
    }
  }
};
