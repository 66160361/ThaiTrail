import { api } from './api';

const USER_CACHE_KEY = 'thaitrail_auth_user';

function getUserId() {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      return user?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
}

function getLikedKey() {
  const userId = getUserId();
  return userId ? `thaitrail_liked_places_${userId}` : 'thaitrail_liked_places_guest';
}

function getSavedKey() {
  const userId = getUserId();
  return userId ? `thaitrail_saved_places_${userId}` : 'thaitrail_saved_places_guest';
}

export const interactionStorage = {
  getLikedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(getLikedKey()) || '[]');
    } catch {
      return [];
    }
  },

  getSavedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(getSavedKey()) || '[]');
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

    localStorage.setItem(getLikedKey(), JSON.stringify(list));

    // Send signal to MySQL backend if user is logged in
    if (getUserId()) {
      try {
        api.signals.log({
          place_id: Number(place.id),
          signal_type: 'like',
        }).catch(() => { });
      } catch (e) {
        console.log('Signal log note:', e);
      }
    }

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

    localStorage.setItem(getSavedKey(), JSON.stringify(list));

    // Send signal to MySQL backend if user is logged in
    if (getUserId()) {
      try {
        api.signals.log({
          place_id: Number(place.id),
          signal_type: 'save',
        }).catch(() => { });
      } catch (e) {
        console.log('Signal log note:', e);
      }
    }

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
      localStorage.setItem(getLikedKey(), JSON.stringify(Array.from(map.values())));
    }

    if (Array.isArray(savedPlacesBackend)) {
      const current = this.getSavedPlaces();
      const map = new Map();
      savedPlacesBackend.forEach((p) => map.set(String(p.id), p));
      current.forEach((p) => {
        if (!map.has(String(p.id))) map.set(String(p.id), p);
      });
      localStorage.setItem(getSavedKey(), JSON.stringify(Array.from(map.values())));
    }
  }
};
