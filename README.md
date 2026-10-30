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

## ย้ายไป Cloudflare D1

1. `wrangler d1 create lba-replace` แล้วเพิ่ม binding `DB` ใน `wrangler.jsonc`
2. `wrangler d1 migrations apply lba-replace --remote` โดยใช้ไฟล์ใน `drizzle/`
3. ใน `src/lib/server/db/index.ts` ใช้ `drizzle(platform.env.DB, { schema })` จาก `drizzle-orm/d1`
4. `npm run build` แล้ว deploy ผ่าน Cloudflare Pages (output `.svelte-kit/cloudflare`)
