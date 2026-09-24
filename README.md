# Achieve

แอปจัดชีวิตส่วนตัว: งาน/การบ้าน, ตารางเรียน, นิสัย และเงิน — ออกแบบให้ใช้บน iPad และมือถือ Android เป็นหลัก

**เปิดใช้:** https://bvnixx649.github.io/DairyOptimizer/

## ติดตั้งเป็นแอป

- **iPad (Safari):** เปิดลิงก์ → ปุ่มแชร์ → *Add to Home Screen*
- **Android (Chrome):** เปิดลิงก์ → เมนู ⋮ → *Install app* / *Add to Home screen*

ใช้งานออฟไลน์ได้หลังเปิดครั้งแรก ข้อมูลเก็บในเครื่อง (localStorage) ไม่มี server หรือ analytics

## ซิงก์ iPad ↔ มือถือ

ซิงก์ผ่าน secret gist ในบัญชี GitHub ของเราเอง ข้อมูลทั้งก้อนถูกเข้ารหัส (AES-GCM, คีย์จาก "รหัสซิงก์") ก่อนออกจากเครื่อง

1. สร้าง token ที่ https://github.com/settings/tokens/new?scopes=gist (เลือกแค่สิทธิ์ `gist`)
2. ในแอป: ตั้งค่า → ซิงก์ → ใส่ token และตั้ง "รหัสซิงก์" (อย่างน้อย 8 ตัว)
3. ทำแบบเดียวกันบนอีกเครื่อง ใช้ **รหัสซิงก์เดียวกัน** (token จะใช้อันเดียวกันหรือคนละอันก็ได้)

ซิงก์อัตโนมัติหลังแก้ไข, ตอนเปิดแอป และทุก ~90 วินาที รวมข้อมูลแบบรายการต่อรายการ (อันที่แก้ล่าสุดชนะ) แก้บนสองเครื่องพร้อมกันได้ไม่หาย

## ย้ายข้อมูลจาก Achieve เดิม

ในแอปเดิม: ตั้งค่า → สำรองข้อมูล → ได้ไฟล์ `.json`
ในแอปนี้: ตั้งค่า → ข้อมูล → นำเข้า → เลือกไฟล์ (งานที่ล็อก PIN ให้ใส่ PIN เดิมเพื่อย้ายมาด้วย)

## พัฒนา

```bash
npm install
npm run dev      # http://localhost:5173/DairyOptimizer/
npm test         # unit tests: merge, ตารางว่าง, streak, เงิน, import ไฟล์เดิม, crypto
npm run build    # typecheck + build → dist/
npm run icons    # สร้างไอคอนแอปใหม่จาก SVG
npm run deploy   # test + build แล้วอัปขึ้น branch gh-pages (GitHub Pages)
```

### โครงสร้าง

| ที่ | อะไร |
| --- | --- |
| `src/data/seed.ts` | ตารางเรียนจริง, วิชา, หมวดเงิน, นิสัยเริ่มต้น |
| `src/store/store.ts` | state + บันทึกลงเครื่อง + undo + PIN |
| `src/store/sync.ts` | ซิงก์ gist แบบเข้ารหัส |
| `src/lib/merge.ts` | รวมข้อมูลสองเครื่อง (last-writer-wins ต่อรายการ) |
| `src/lib/agenda.ts` | หาเวลาว่าง / เช็กเวลาชน |
| `src/lib/legacy.ts` | แปลงไฟล์สำรองของ Achieve เดิม |
| `src/features/*` | หน้าวันนี้ งาน ตาราง นิสัย เงิน และ sheet ต่าง ๆ |

Stack: Vite · React · TypeScript · Motion · Zustand · vite-plugin-pwa · ฟอนต์ Anuphan + Geist · ไอคอน Lucide
