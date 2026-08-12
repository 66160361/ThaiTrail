import { api } from './api';

const USER_CACHE_KEY = 'thaitrail_auth_user';

// ดึง user id ของผู้ใช้ที่ล็อกอินอยู่จาก local cache
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

// แยก key ของรายการถูกใจตามผู้ใช้ เพื่อไม่ให้ข้อมูลปนกันในเครื่องเดียวกัน
function getLikedKey() {
  const userId = getUserId();
  return userId ? `thaitrail_liked_places_${userId}` : 'thaitrail_liked_places_guest';
}

// แยก key ของรายการบันทึกตามผู้ใช้ เพื่อไม่ให้ข้อมูลปนกันในเครื่องเดียวกัน
function getSavedKey() {
  const userId = getUserId();
  return userId ? `thaitrail_saved_places_${userId}` : 'thaitrail_saved_places_guest';
}

export const interactionStorage = {
  // อ่านรายการสถานที่ที่กดถูกใจจาก localStorage (ถ้าอ่านไม่ได้ให้เป็นลิสต์ว่าง)
  getLikedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(getLikedKey()) || '[]');
    } catch {
      return [];
    }
  },

  // อ่านรายการสถานที่ที่บันทึกจาก localStorage (ถ้าอ่านไม่ได้ให้เป็นลิสต์ว่าง)
  getSavedPlaces() {
    try {
      return JSON.parse(localStorage.getItem(getSavedKey()) || '[]');
    } catch {
      return [];
    }
  },

  // ตรวจว่าตอนนี้สถานที่นี้อยู่ในสถานะถูกใจใน local state หรือไม่
  isLiked(placeId) {
    if (!placeId) return false;
    const list = this.getLikedPlaces();
    return list.some((p) => String(p.id) === String(placeId));
  },

  // ตรวจว่าตอนนี้สถานที่นี้อยู่ในสถานะบันทึกใน local state หรือไม่
  isSaved(placeId) {
    if (!placeId) return false;
    const list = this.getSavedPlaces();
    return list.some((p) => String(p.id) === String(placeId));
  },

  // สลับสถานะถูกใจในเครื่องก่อน เพื่อให้ UI ตอบสนองทันที แล้วค่อยส่งไป backend
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

    // ส่ง signal ไป backend เฉพาะกรณีที่ผู้ใช้ล็อกอินอยู่
    if (getUserId()) {
      try {
        api.signals.log({
          place_id: Number(place.id),
          signal_type: isLikedNow ? 'like' : 'unlike',
        }).catch(() => { });
      } catch (e) {
        console.log('Signal log note:', e);
      }
    }

    return isLikedNow;
  },

  // สลับสถานะบันทึกในเครื่องก่อน เพื่อให้ UI ตอบสนองทันที แล้วค่อยส่งไป backend
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

    // ส่ง signal ไป backend เฉพาะกรณีที่ผู้ใช้ล็อกอินอยู่
    if (getUserId()) {
      try {
        api.signals.log({
          place_id: Number(place.id),
          signal_type: isSavedNow ? 'save' : 'unsave',
        }).catch(() => { });
      } catch (e) {
        console.log('Signal log note:', e);
      }
    }

    return isSavedNow;
  },

  // รวมข้อมูลจาก backend กับ local cache เพื่อไม่ให้ interaction หายหลัง refresh/login
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
