import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths ที่ Vite/Webpack มักทำให้หาย
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom green marker icon ให้ตรง design system
const greenIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #0D330E;
      border: 3px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 14px;
        line-height: 1;
        display: block;
        text-align: center;
        margin-top: 2px;
      ">📍</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -40],
});

/**
 * PlaceMap — แสดงแผนที่ OpenStreetMap ด้วย Leaflet
 * @param {{ lat: number, lng: number, name: string }} props
 */
function PlaceMap({ lat, lng, name }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // สร้าง Leaflet map
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false, // ปิด scroll zoom เพื่อไม่รบกวนการ scroll หน้า
      attributionControl: true,
    });

    // OpenStreetMap tiles (ฟรี ไม่ต้องใช้ API Key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // วาง marker พร้อม popup ชื่อสถานที่
    L.marker([lat, lng], { icon: greenIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:'Prompt',sans-serif;font-size:13px;font-weight:600;color:#0D330E;min-width:120px;">${name}</div>`,
        { maxWidth: 240, closeButton: false }
      )
      .openPopup();

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, name]);

  // อัปเดต center ถ้า lat/lng เปลี่ยน
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([lat, lng], 14);
  }, [lat, lng]);

  return <div ref={containerRef} className="place-map-container" />;
}

export default PlaceMap;
