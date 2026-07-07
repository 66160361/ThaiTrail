# ThaiTrail

ThaiTrail เป็นโปรเจกต์แสดงข้อมูลสถานที่ท่องเที่ยวและแหล่งเรียนรู้แบบเว็บแอปที่แบ่งเป็น Frontend (React + Vite) และ Backend (PHP + MySQL)

## โครงสร้างโปรเจกต์ที่แนะนำ

```text
ThaiTrail/
├── backend/
│   ├── api/
│   │   └── Places.php
│   ├── config/
│   │   └── database.php
│   ├── controller/
│   ├── import/
│   │   ├── places.php
│   │   ├── travel.php
│   │   └── places.json
│   ├── middleware/
│   ├── models/
│   ├── services/
│   │   ├── MappingService.php
│   │   ├── PlaceService.php
│   │   └── ReviewService.php
│   ├── utils/
│   └── public/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── pages/
│   │   └── routes/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── database/
│   └── schema.sql
├── docs/
├── uploads/
├── index.php
├── .env.example
└── README.md
```

## ข้อกำหนดเบื้องต้น

- PHP 8.x
- Composer (ถ้าต้องการใช้จัดการ dependency ภายหลัง)
- MySQL/MariaDB
- Node.js 18+

## การติดตั้ง

### 1. ตั้งค่าฐานข้อมูล

สร้างฐานข้อมูล MySQL และ import schema หากมี:

```bash
mysql -u root -p < database/schema.sql
```

### 2. ตั้งค่า environment

คัดลอกไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

แก้ค่าในไฟล์ .env ให้ถูกต้องตาม environment ของคุณ

### 3. รัน Backend

ใช้ PHP built-in server แบบ entrypoint ที่สะอาดขึ้นจากโฟลเดอร์ backend/public:

```bash
cd /Applications/MAMP/htdocs/ThaiTrail
php -S 127.0.0.1:8000 -t backend/public
```

เมื่อรันแล้ว API จะอยู่ที่:

```text
http://127.0.0.1:8000/api/places
```

ทดสอบด้วย curl:

```bash
curl "http://127.0.0.1:8000/api/places"
```

หรือเรียกไฟล์ import โดยตรง:

```bash
php backend/import/places.php
php backend/import/travel.php
```

### 4. รัน Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend จะรันที่:

```text
http://127.0.0.1:5173
```

## API ตัวอย่าง

- ดึงข้อมูลทั้งหมด:
  - /api/places
  - /api/places?category_id=1
  - /api/places?mode=group

## ข้อแนะนำสำหรับการส่งต่อ

### ควรปรับต่อไป

- แยก API endpoint ออกจากไฟล์ index.php ให้เป็น router ชัดเจน
- ย้ายการเชื่อมฐานข้อมูลไปใช้ env config แทนค่าคงที่
- แยก import script ออกจาก logic รายการสถานที่
- เพิ่มการจัดการ error, logging, และ validation
- เพิ่ม tests สำหรับ backend และ frontend
- แยกไฟล์ schema, seed data, migration

### ไฟล์ที่ควรปรับหรือย้ายในอนาคต

- [index.php](index.php) → ควรย้ายเป็น API entrypoint ที่ชัดเจน เช่น backend/public/index.php
- [backend/config/database.php](backend/config/database.php) → ควรใช้ env config และไม่ hardcode ค่าความปลอดภัย
- [backend/api/Places.php](backend/api/Places.php) → ควรย้ายเป็น controller หรือ route handler
- [backend/import/places.php](backend/import/places.php) และ [backend/import/travel.php](backend/import/travel.php) → ควรแยกเป็น command / service ที่ชัดเจน
- [database/schema.sql](database/schema.sql) → ควรเติม schema เต็มและเพิ่ม migration
