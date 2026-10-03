# tabsipakarcinta

Landing page dan demo backend untuk ruang konsultasi serta sharing mental health issue Gen Z.

## Jalankan lokal

Prasyarat: Node.js 18 atau lebih baru.

```bash
npm start
```

Buka [http://localhost:3000](http://localhost:3000).

Mode development dengan auto-reload:

```bash
npm run dev
```

## Isi proyek

- `public/index.html` — struktur landing page dan copy utama.
- `public/styles.css` — visual system, responsive layout, form states.
- `public/app.js` — interaksi menu, check-in, sharing, konsultasi, dan API calls.
- `server.mjs` — static server + API endpoint tanpa dependency eksternal.
- `data/*.json` — penyimpanan demo lokal.
- `schema.sql` — rancangan tabel SQLite untuk tahap produksi.
- `docs/web-flow.md` — user flow, arsitektur, API contract, dan guardrail.

## Endpoint

| Method | Route | Kegunaan |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/resources` | Materi singkat |
| GET | `/api/stories` | Cerita anonim terbaru |
| POST | `/api/check-ins` | Simpan check-in |
| POST | `/api/share` | Simpan cerita anonim |
| POST | `/api/consultations` | Simpan request konsultasi |

Penyimpanan JSON sengaja dipakai supaya prototype bisa langsung dijalankan. Untuk deployment publik, migrasikan ke database, tambah moderation queue, auth dashboard, rate limiting, dan kontrol privasi seperti yang dicatat di `docs/web-flow.md`.
# tabsipakarcinta
# tabsipakarcinta
