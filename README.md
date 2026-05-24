# Cureva Fisioterapi Backend API

Backend API untuk sistem pemesanan layanan homecare fisioterapi Cureva. API ini menangani autentikasi pengguna, manajemen booking, jadwal, pembayaran, notifikasi real-time, dan laporan operasional untuk admin.

## 🧭 Gambaran Aplikasi

Cureva adalah platform homecare fisioterapi yang menghubungkan pasien dengan admin/fisioterapis melalui alur booking terstruktur. Backend bertugas sebagai pusat logika bisnis: validasi booking, perpindahan status pemesanan, pengiriman notifikasi ke pasien dan admin, sinkronisasi jadwal slot, serta pencatatan pembayaran dan rating.

Karakter utama backend saat ini:

- Booking dibuat pasien melalui slot waktu yang divalidasi.
- Admin mengelola status pemesanan dan melihat statistik operasional.
- Notifikasi tersimpan di database, muncul di aplikasi, dan diperbarui secara real-time.
- Data pembayaran dan jadwal dipakai untuk menjaga konsistensi status booking.

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL (MariaDB)
- **Authentication:** JWT + Google OAuth
- **Email:** Nodemailer (SMTP)
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting

## 📁 Struktur Folder

```
cureva-backend/
├── src/
│   ├── config/           # Konfigurasi app & database
│   │   ├── database.js   # MySQL connection pool
│   │   └── index.js      # Environment config
│   ├── controllers/      # Request handlers
│   │   ├── AdminController.js
│   │   ├── AuthController.js
│   │   ├── BookingController.js
│   │   ├── JadwalController.js
│   │   ├── LayananController.js
│   │   ├── NotificationController.js
│   │   └── PaymentController.js
│   ├── middleware/       # Auth, validation, error handling
│   │   ├── auth.js       # JWT authentication
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validate.js
│   ├── models/           # Database models
│   │   ├── Jadwal.js
│   │   ├── Layanan.js
│   │   ├── Notifikasi.js
│   │   ├── Pembayaran.js
│   │   ├── Pemesanan.js
│   │   ├── Settings.js
│   │   └── User.js
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── AuthService.js
│   │   ├── BookingService.js
│   │   ├── EmailService.js
│   │   ├── JadwalService.js
│   │   ├── NotificationService.js
│   │   └── PaymentService.js
│   ├── utils/            # Helper functions
│   ├── app.js            # Express app setup
│   └── server.js         # Entry point
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Instalasi

### 1. Clone & Install Dependencies

```bash
cd cureva-backend
npm install
```

### 2. Setup Database

1. Buat database MySQL dengan nama `db_cureva_fisio`
2. Import file SQL:
   ```bash
   mysql -u root -p db_cureva_fisio < ../database/db_cureva_fisio.sql
   ```

### 3. Konfigurasi Environment

```bash
# Copy template environment
cp .env.example .env

# Edit file .env sesuai konfigurasi Anda
```

Konfigurasi penting di `.env`:

```env
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=db_cureva_fisio

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ADMIN_EMAIL=admin@cureva.com

# Google OAuth (opsional)
GOOGLE_CLIENT_ID=your-google-client-id
```

### 4. Jalankan Server

```bash
# Development mode (dengan hot reload)
npm run dev

# Production mode
npm start
```

Server akan berjalan di `http://localhost:3000`

## 📡 API Endpoints

API dirancang dengan pola resource yang konsisten agar mudah dipakai frontend. Endpoint utama berfokus pada booking, jadwal, pembayaran, notifikasi, dan dashboard admin.

Base URL: `/api`

### Authentication (`/api/auth`)

| Method | Endpoint           | Auth | Description                 |
| ------ | ------------------ | ---- | --------------------------- |
| POST   | `/register`        | ❌   | Register user baru          |
| POST   | `/login`           | ❌   | Login dengan email/password |
| POST   | `/google`          | ❌   | Login dengan Google OAuth   |
| GET    | `/verify-email`    | ❌   | Verifikasi email            |
| POST   | `/forgot-password` | ❌   | Request reset password      |
| POST   | `/reset-password`  | ❌   | Reset password dengan token |
| POST   | `/refresh-token`   | ❌   | Refresh access token        |
| GET    | `/profile`         | ✅   | Get profile user            |
| PUT    | `/profile`         | ✅   | Update profile              |
| POST   | `/change-password` | ✅   | Ganti password              |
| POST   | `/logout`          | ✅   | Logout                      |

### Layanan (`/api/layanan`)

| Method | Endpoint    | Auth  | Description           |
| ------ | ----------- | ----- | --------------------- |
| GET    | `/`         | ❌    | List semua layanan    |
| GET    | `/kategori` | ❌    | List kategori layanan |
| GET    | `/:id`      | ❌    | Detail layanan        |
| POST   | `/`         | Admin | Tambah layanan baru   |
| PUT    | `/:id`      | Admin | Update layanan        |
| DELETE | `/:id`      | Admin | Hapus layanan         |

### Jadwal (`/api/jadwal`)

| Method | Endpoint              | Auth  | Description                      |
| ------ | --------------------- | ----- | -------------------------------- |
| GET    | `/default`            | ❌    | Jadwal default per hari          |
| GET    | `/available-dates`    | ❌    | Tanggal yang tersedia            |
| GET    | `/available/:tanggal` | ❌    | Slot tersedia untuk tanggal      |
| GET    | `/slots/:tanggal`     | Admin | Semua slot untuk tanggal (admin) |
| PUT    | `/default/:hari`      | Admin | Update jadwal default            |
| POST   | `/generate`           | Admin | Generate slots untuk range       |
| POST   | `/slot/:id/block`     | Admin | Block slot tertentu              |
| POST   | `/slot/:id/unblock`   | Admin | Unblock slot                     |
| POST   | `/libur/:tanggal`     | Admin | Set tanggal libur                |
| DELETE | `/libur/:tanggal`     | Admin | Batalkan libur                   |

### Booking (`/api/bookings`)

| Method | Endpoint           | Auth  | Description              |
| ------ | ------------------ | ----- | ------------------------ |
| GET    | `/ratings`         | ❌    | List semua rating publik |
| POST   | `/`                | ✅    | Buat booking baru        |
| GET    | `/me`              | ✅    | List booking user        |
| GET    | `/upcoming`        | ✅    | Booking mendatang        |
| GET    | `/kode/:kode`      | ✅    | Detail by kode booking   |
| GET    | `/:id`             | ✅    | Detail by ID             |
| POST   | `/:id/cancel`      | ✅    | Batalkan booking         |
| POST   | `/:id/rating`      | ✅    | Berikan rating & review  |
| GET    | `/`                | Admin | List semua booking       |
| GET    | `/admin/statistik` | Admin | Statistik booking        |
| PUT    | `/:id/status`      | Admin | Update status booking    |
| POST   | `/:id/confirm`     | Admin | Konfirmasi booking       |
| POST   | `/:id/reject`      | Admin | Tolak booking            |
| POST   | `/:id/complete`    | Admin | Selesaikan booking       |
| DELETE | `/:id`             | Admin | Hapus booking            |

### Pembayaran (`/api/payments`)

| Method | Endpoint                   | Auth  | Description            |
| ------ | -------------------------- | ----- | ---------------------- |
| GET    | `/pemesanan/:id`           | ✅    | Detail pembayaran      |
| PUT    | `/pemesanan/:id/method`    | ✅    | Ubah metode pembayaran |
| GET    | `/`                        | Admin | List semua pembayaran  |
| GET    | `/statistik`               | Admin | Statistik pembayaran   |
| PUT    | `/pemesanan/:id/status`    | Admin | Update status          |
| POST   | `/pemesanan/:id/mark-paid` | Admin | Tandai lunas           |

### Notifikasi (`/api/notifications`)

| Method | Endpoint         | Auth | Description                    |
| ------ | ---------------- | ---- | ------------------------------ |
| GET    | `/`              | ✅   | List notifikasi user           |
| GET    | `/unread-count`  | ✅   | Jumlah notifikasi belum dibaca |
| POST   | `/mark-all-read` | ✅   | Tandai semua sudah dibaca      |
| POST   | `/:id/read`      | ✅   | Tandai satu notifikasi dibaca  |
| DELETE | `/:id`           | ✅   | Hapus notifikasi               |

### Admin (`/api/admin`)

| Method | Endpoint     | Auth  | Description         |
| ------ | ------------ | ----- | ------------------- |
| GET    | `/dashboard` | Admin | Dashboard statistik |
| GET    | `/users`     | Admin | List users          |
| GET    | `/users/:id` | Admin | Detail user         |
| PUT    | `/users/:id` | Admin | Update user         |
| DELETE | `/users/:id` | Admin | Hapus user          |

## 🔐 Authentication

API menggunakan JWT Bearer Token:

```http
Authorization: Bearer <your_access_token>
```

### Role User

- **pasien** - User biasa yang dapat membuat booking
- **admin** - Administrator dengan akses penuh

## 🧩 Alur Fitur Utama

- Pasien membuat booking berdasarkan layanan, tanggal, waktu, dan alamat.
- Sistem memvalidasi ketersediaan slot dan membuat data pembayaran otomatis.
- Admin memproses booking dengan status bertahap: konfirmasi, jadwalkan, perjalanan, selesai, atau tolak.
- Setiap perubahan status memicu notifikasi ke pasien dan tercatat sebagai aktivitas admin.
- Pengingat sesi, pembayaran diterima, dan rating juga disimpan sebagai notifikasi in-app.

## 💳 Metode Pembayaran

Sistem mendukung 2 metode pembayaran:

| Metode            | Kode                | Deskripsi                            |
| ----------------- | ------------------- | ------------------------------------ |
| Cash On Visit     | `cash_on_visit`     | Bayar tunai saat fisioterapis datang |
| Transfer On Visit | `transfer_on_visit` | Transfer saat fisioterapis datang    |

Status pembayaran:

- `menunggu` - Belum dibayar
- `dibayar` - Sudah lunas
- `gagal` - Pembayaran gagal

## 📅 Jam Operasional Default

| Hari          | Jam           |
| ------------- | ------------- |
| Senin - Kamis | 18:00 - 22:00 |
| Jumat - Sabtu | 08:00 - 22:00 |
| Minggu        | 18:00 - 22:00 |

Slot waktu: 60 menit per sesi

## 📧 Notifikasi Email

Sistem mengirim email otomatis untuk:

| Event              | Penerima | Deskripsi                   |
| ------------------ | -------- | --------------------------- |
| Booking baru       | Admin    | Notifikasi ada booking baru |
| Konfirmasi booking | Pasien   | Booking dikonfirmasi        |
| Penolakan booking  | Pasien   | Booking ditolak + alasan    |
| Pengingat sesi     | Pasien   | H-1 sebelum jadwal          |
| Booking selesai    | Pasien   | Request rating              |

## 🏗️ Status Flow Booking

```
┌─────────────────────────┐
│   menunggu_konfirmasi   │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌────────────┐  ┌──────────┐
│dikonfirmasi│  │  ditolak │
└─────┬──────┘  └──────────┘
      │
      ▼
┌────────────┐   ┌──────────────────┐
│ dijadwalkan│───│ dibatalkan_pasien│
└─────┬──────┘   └──────────────────┘
      │
      ▼
┌──────────────────┐
│ dalam_perjalanan │
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ sedang_berlangsung │
└─────────┬──────────┘
          │
          ▼
    ┌──────────┐
    │  selesai │ ──→ Rating & Review
    └──────────┘
```

## ⭐ Rating & Review

User dapat memberikan rating setelah booking selesai:

- Rating: 1-5 bintang
- Review: Text opsional
- Satu booking = satu rating

## 🛡️ Security Features

- **Helmet** - HTTP security headers
- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Prevent brute force attacks
  - General: 100 requests/15 menit
  - Auth: 5 requests/15 menit
  - Booking: 10 requests/15 menit
- **JWT** - Token-based authentication
- **Password Hashing** - bcrypt

## 🧑‍💻 Development

```bash
# Run in development mode (hot reload)
npm run dev

# Run in production mode
npm start

# Check for errors
npm run lint
```

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": [{ "field": "email", "message": "Email tidak valid" }]
}
```

## 🔧 Environment Variables

| Variable         | Required | Default     | Description            |
| ---------------- | -------- | ----------- | ---------------------- |
| PORT             | ❌       | 3000        | Server port            |
| NODE_ENV         | ❌       | development | Environment mode       |
| FRONTEND_URL     | ✅       | -           | Frontend URL for CORS  |
| DB_HOST          | ✅       | -           | Database host          |
| DB_USER          | ✅       | -           | Database user          |
| DB_PASSWORD      | ✅       | -           | Database password      |
| DB_NAME          | ✅       | -           | Database name          |
| JWT_SECRET       | ✅       | -           | JWT signing secret     |
| JWT_EXPIRES_IN   | ❌       | 7d          | Token expiration       |
| SMTP_HOST        | ✅       | -           | SMTP server host       |
| SMTP_PORT        | ❌       | 587         | SMTP server port       |
| SMTP_USER        | ✅       | -           | SMTP username          |
| SMTP_PASS        | ✅       | -           | SMTP password          |
| ADMIN_EMAIL      | ✅       | -           | Admin email for notif  |
| GOOGLE_CLIENT_ID | ❌       | -           | Google OAuth client ID |

## 📄 License

MIT License - Cureva Fisioterapi © 2024-2026
