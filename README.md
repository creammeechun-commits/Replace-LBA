# LBA Replace — ระบบจัดการงานแทน (Spare) แผนกธุรการ LBA

Web App สำหรับบันทึก/ติดตามงานแทน (พนักงานประจำไซต์ลา → ส่งพนักงานทดแทน) แทนการทำสรุปใน Excel รายวัน

## Stack

- SvelteKit 3 (SSR, form actions) + Svelte 5 runes
- Tailwind CSS v4 + shadcn-svelte style components (`src/lib/components/ui`)
- SQLite (`local.db`) ผ่าน Drizzle ORM + `@libsql/client` → ย้ายไป Cloudflare D1 ได้โดยเปลี่ยน driver ที่ `src/lib/server/db/index.ts`
- Deploy: `@sveltejs/adapter-cloudflare` (Cloudflare Pages)

## เริ่มใช้งาน

```bash
npm install
npm run db:seed      # สร้างตาราง + นำเข้า data/lba-plan.xlsx (ล้างข้อมูลเดิมทั้งหมด)
npm run dev          # http://localhost:5173
```

บัญชีทดสอบ (รหัสผ่านตั้งใหม่ได้ที่หน้า พนักงาน)

| สิทธิ์ | username | password |
| --- | --- | --- |
| ธุรการ (Admin) | `admin` / `ice` / `pat` | `admin1234` / `1234` / `1234` |
| หัวหน้า (ดูอย่างเดียว) | `manager` | `manager1234` |
| พนักงานทดแทน | `emp001` … `emp284` | `1234` |

## โครงสร้างไฟล์

```
data/lba-plan.xlsx              ไฟล์ Excel ต้นฉบับ (ชีต "แผนงาน")
scripts/seed.ts                 อ่าน Excel → normalize → insert (npm run db:seed)
drizzle/                        SQL migrations (drizzle-kit generate)
src/
  hooks.server.ts               ตรวจ session cookie, บังคับ login, แยกสิทธิ์ตาม path
  lib/server/db/schema.ts       ตาราง users, sessions, sites, site_posts, tasks, activity_logs
  lib/server/db/index.ts        Drizzle client (libsql / สลับเป็น D1)
  lib/server/auth.ts            session (token → sha256 → DB), cookie
  lib/server/password.ts        PBKDF2 ผ่าน WebCrypto (ใช้ได้ทั้ง Node และ Workers)
  lib/server/activity.ts        logActivity() บันทึกใครแก้อะไรเมื่อไร
  lib/server/queries.ts         query งานแทนพร้อม join หน่วยงาน/คนแทน + ตัวเลือกฟอร์ม
  lib/server/task-form.ts       validate ฟอร์มงานแทน, สร้างหน่วยงาน/จุดงานอัตโนมัติ
  lib/shared/labels.ts          ป้ายภาษาไทย (สถานะ, ประเภทการแทน, สาเหตุ)
  lib/shared/format.ts          วันที่ไทย, เงินบาท, แยกชื่อ-ชื่อเล่น
  lib/components/               task-form, date-range, status-badge, pagination, ui/*
  routes/
    login, logout               เข้า/ออกระบบ
    +page                       Dashboard (รายวัน / รายคน / รายโปรเจกต์ / งานค้าง / คัดลอกสรุป)
    tasks, tasks/new, tasks/[id] รายการงานแทน, ฟอร์มกรอกอัตโนมัติ, รายละเอียด+ประวัติ
    board                       Kanban (To do / Doing / Done) ลาก-วางได้
    projects, projects/[id]     หน่วยงาน + พนักงานประจำ/จุดงาน
    employees, employees/[id]   จัดการพนักงาน (Admin)
    activity                    Activity Log
```

## โมเดลข้อมูล

- **sites** (โปรเจกต์ = หน่วยงานลูกค้า) → **site_posts** (พนักงานประจำ/จุดงานที่ต้องหาคนแทน พร้อมค่าเริ่มต้น: ตำแหน่ง, Code site, กะ)
- **tasks** (งานแทน 1 แถว = 1 วัน 1 ตำแหน่ง) — `coverageType`: spare / rotate / none_needed / unable / pending, `status`: todo / doing / done, `payStatus`: pending / claimed / no_pay
- **users** — role: admin / manager / employee, `staffType` EX/WL/HO/HS, `defaultWage`
- **activity_logs** — ทุกการสร้าง/แก้ไข/ลบ/เปลี่ยนสถานะ/login

## Build

```bash
npm run build        # output: .svelte-kit/cloudflare (Cloudflare Pages)
npm run preview      # ทดสอบด้วย wrangler pages dev
```

หมายเหตุ: บน Windows เครื่องนี้ rolldown (bundler ของ Vite 8) ล่มด้วย access violation ระหว่าง build ฝั่ง client เมื่อใช้หลาย thread
จึงตั้ง `TOKIO_WORKER_THREADS=1` ไว้ใน `vite.config.ts` (ลบออกได้เมื่อ Vite/rolldown แก้บั๊กแล้ว)

## Deploy บน Cloudflare Workers + D1

โค้ดเลือกฐานข้อมูลอัตโนมัติ: ในเครื่องใช้ SQLite (libsql) บน Cloudflare ใช้ D1 binding ชื่อ `DB`
(`src/lib/server/db/index.ts` + `hooks.server.ts`) ไม่ต้องแก้ query

ทำครั้งแรก (ในเครื่อง ต้อง `npx wrangler login` ก่อน):

```bash
npx wrangler d1 create replace-lba
```

นำ `database_id` ที่ได้ไปแทนค่า `REPLACE_WITH_YOUR_D1_DATABASE_ID` ใน `wrangler.jsonc` แล้ว

```bash
npm run db:migrate:remote   # สร้างตารางบน D1 จาก drizzle/*.sql
npm run db:seed             # (ถ้ายังไม่ได้ทำ) นำเข้า Excel ลง local.db
npm run db:export           # local.db -> drizzle/seed-data.sql
npm run db:seed:remote      # นำข้อมูลเข้า D1
npm run deploy              # build + wrangler deploy
```

ถ้าใช้ Workers Builds (เชื่อม GitHub ใน dashboard): Build command = `npm run build`, Deploy command = `npx wrangler deploy`
ไม่ต้องตั้ง `DATABASE_URL` บน Cloudflare (เว้นว่างได้ ระบบจะใช้ D1)

หลังเปลี่ยน `wrangler.jsonc` ให้รัน `npm run gen` เพื่ออัปเดต type ของ binding
