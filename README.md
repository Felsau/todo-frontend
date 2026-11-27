# Todo Frontend

หน้าเว็บของแอป Todo List ทำด้วย Vue.js 3 + TypeScript ทุกการกระทำส่ง Request ไปที่ [todo-api](../todo-api)

## ฟีเจอร์

- เพิ่มรายการ todo
- ลบรายการ todo
- ทำเครื่องหมายว่าเสร็จแล้ว / ยกเลิก
- รีเฟรชหน้าแล้วรายการยังอยู่ (ดึงจาก API)
- Responsive ทั้ง Mobile และ Desktop

## Tech Stack

- Vue.js 3 (Composition API) + TypeScript
- Vite
- CSS Framework: _(Tailwind / Bootstrap)_

## การติดตั้งและรัน

```bash
npm install
cp .env.example .env   # ตั้งค่า VITE_API_URL ให้ชี้ไปที่ API Server
npm run dev
```

## Environment Variables

| ตัวแปร | ตัวอย่าง | คำอธิบาย |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3333` | URL ของ RESTful API Server |
