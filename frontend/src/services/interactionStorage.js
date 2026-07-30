import { api } from './api';

const getStorageKey = (prefix, userIdentifier) => {
  if (userIdentifier) {
    return `${prefix}_${userIdentifier}`;
  }
  return `${prefix}_guest`;
};

export const interactionStorage = {
  getLikedPlaces(userIdentifier) {
    try {
      const key = getStorageKey('thaitrail_liked_places', userIdentifier);
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  getSavedPlaces(userIdentifier) {
    try {
      const key = getStorageKey('thaitrail_saved_places', userIdentifier);
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  isLiked(placeId, userIdentifier) {
    if (!placeId) return false;
    const list = this.getLikedPlaces(userIdentifier);
    return list.some((p) => String(p.id) === String(placeId));
  },

  isSaved(placeId, userIdentifier) {
    if (!placeId) return false;
    const list = this.getSavedPlaces(userIdentifier);
    return list.some((p) => String(p.id) === String(placeId));
  },

  toggleLike(place, userIdentifier) {
    if (!place || !place.id) return false;
    const list = this.getLikedPlaces(userIdentifier);
    const index = list.findIndex((p) => String(p.id) === String(place.id));
    let isLikedNow = false;

    if (index > -1) {
      list.splice(index, 1);
      isLikedNow = false;
    } else {
      list.unshift(place);
      isLikedNow = true;
    }

    const key = getStorageKey('thaitrail_liked_places', userIdentifier);
    localStorage.setItem(key, JSON.stringify(list));

    // Send signal to MySQL backend to update user_interests
    try {
      api.signals.log({
        place_id: Number(place.id),
        signal_type: isLikedNow ? 'like' : 'unlike',
      }).catch(() => {});
    } catch (e) {
      console.log('Signal log note:', e);
    }

    return isLikedNow;
  },

  toggleSave(place, userIdentifier) {
    if (!place || !place.id) return false;
    const list = this.getSavedPlaces(userIdentifier);
    const index = list.findIndex((p) => String(p.id) === String(place.id));
    let isSavedNow = false;

    if (index > -1) {
      list.splice(index, 1);
      isSavedNow = false;
    } else {
      list.unshift(place);
      isSavedNow = true;
    }

    const key = getStorageKey('thaitrail_saved_places', userIdentifier);
    localStorage.setItem(key, JSON.stringify(list));

    // Send signal to MySQL backend to update user_interests
    try {
      api.signals.log({
        place_id: Number(place.id),
        signal_type: isSavedNow ? 'save' : 'unsave',
      }).catch(() => {});
    } catch (e) {
      console.log('Signal log note:', e);
    }

    return isSavedNow;
  },

  syncBackend(likedPlacesBackend = [], savedPlacesBackend = [], userIdentifier) {
    if (!userIdentifier) return;

    if (Array.isArray(likedPlacesBackend)) {
      const likedKey = getStorageKey('thaitrail_liked_places', userIdentifier);
      localStorage.setItem(likedKey, JSON.stringify(likedPlacesBackend));
    }

    if (Array.isArray(savedPlacesBackend)) {
      const savedKey = getStorageKey('thaitrail_saved_places', userIdentifier);
      localStorage.setItem(savedKey, JSON.stringify(savedPlacesBackend));
    }
  }
};
