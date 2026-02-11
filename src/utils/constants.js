// File constants - menyimpan semua konstanta/nilai tetap aplikasi

// Daftar status pemesanan/booking
const BOOKING_STATUS = {
  MENUNGGU_KONFIRMASI: "menunggu_konfirmasi",
  DIKONFIRMASI: "dikonfirmasi",
  DIJADWALKAN: "dijadwalkan",
  DALAM_PERJALANAN: "dalam_perjalanan",
  SEDANG_BERLANGSUNG: "sedang_berlangsung",
  SELESAI: "selesai",
  DITOLAK: "ditolak",
  DIBATALKAN_PASIEN: "dibatalkan_pasien",
  DIBATALKAN_SISTEM: "dibatalkan_sistem",
};

// Daftar status pembayaran
const PAYMENT_STATUS = {
  MENUNGGU: "menunggu",
  DIBAYAR: "dibayar",
  GAGAL: "gagal",
};

// Daftar metode pembayaran
const PAYMENT_METHOD = {
  CASH_ON_VISIT: "cash_on_visit",
  TRANSFER_ON_VISIT: "transfer_on_visit",
};

// Daftar status slot jadwal
const SLOT_STATUS = {
  TERSEDIA: "tersedia",
  DIPESAN: "dipesan",
  DIBLOCK_ADMIN: "diblock_admin",
  LIBUR: "libur",
};

// Daftar role user
const USER_ROLE = {
  PASIEN: "pasien",
  ADMIN: "admin",
};

// Daftar tipe notifikasi
const NOTIFICATION_TYPE = {
  PEMESANAN: "pemesanan",
  PEMBAYARAN: "pembayaran",
  JADWAL: "jadwal",
  RATING: "rating",
  SISTEM: "sistem",
  PROMO: "promo",
};

// Daftar tipe email
const EMAIL_TYPE = {
  PEMESANAN_BARU: "pemesanan_baru",
  KONFIRMASI: "konfirmasi",
  PENOLAKAN: "penolakan",
  PENGINGAT: "pengingat",
  LAPORAN: "laporan",
};

// Daftar hari dalam seminggu
const HARI = {
  SENIN: "senin",
  SELASA: "selasa",
  RABU: "rabu",
  KAMIS: "kamis",
  JUMAT: "jumat",
  SABTU: "sabtu",
  MINGGU: "minggu",
};

// Label status dalam bahasa Indonesia (untuk ditampilkan ke user)
const STATUS_LABELS = {
  [BOOKING_STATUS.MENUNGGU_KONFIRMASI]: "Menunggu Konfirmasi",
  [BOOKING_STATUS.DIKONFIRMASI]: "Dikonfirmasi",
  [BOOKING_STATUS.DIJADWALKAN]: "Dijadwalkan",
  [BOOKING_STATUS.DALAM_PERJALANAN]: "Dalam Perjalanan",
  [BOOKING_STATUS.SEDANG_BERLANGSUNG]: "Sedang Berlangsung",
  [BOOKING_STATUS.SELESAI]: "Selesai",
  [BOOKING_STATUS.DITOLAK]: "Ditolak",
  [BOOKING_STATUS.DIBATALKAN_PASIEN]: "Dibatalkan Pasien",
  [BOOKING_STATUS.DIBATALKAN_SISTEM]: "Dibatalkan Sistem",
};

const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.MENUNGGU]: "Menunggu Pembayaran",
  [PAYMENT_STATUS.DIBAYAR]: "Sudah Dibayar",
  [PAYMENT_STATUS.GAGAL]: "Gagal",
};

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH_ON_VISIT]: "Bayar Cash Saat Kunjungan",
  [PAYMENT_METHOD.TRANSFER_ON_VISIT]: "Transfer Saat Kunjungan",
};

// Mapping perpindahan status yang valid (status flow)
const VALID_STATUS_TRANSITIONS = {
  [BOOKING_STATUS.MENUNGGU_KONFIRMASI]: [
    BOOKING_STATUS.DIKONFIRMASI,
    BOOKING_STATUS.DITOLAK,
    BOOKING_STATUS.DIBATALKAN_PASIEN,
    BOOKING_STATUS.DIBATALKAN_SISTEM,
  ],
  [BOOKING_STATUS.DIKONFIRMASI]: [
    BOOKING_STATUS.DIJADWALKAN,
    BOOKING_STATUS.DIBATALKAN_PASIEN,
    BOOKING_STATUS.DIBATALKAN_SISTEM,
  ],
  [BOOKING_STATUS.DIJADWALKAN]: [
    BOOKING_STATUS.DALAM_PERJALANAN,
    BOOKING_STATUS.DIBATALKAN_PASIEN,
    BOOKING_STATUS.DIBATALKAN_SISTEM,
  ],
  [BOOKING_STATUS.DALAM_PERJALANAN]: [
    BOOKING_STATUS.SEDANG_BERLANGSUNG,
    BOOKING_STATUS.DIBATALKAN_SISTEM,
  ],
  [BOOKING_STATUS.SEDANG_BERLANGSUNG]: [BOOKING_STATUS.SELESAI],
  [BOOKING_STATUS.SELESAI]: [],
  [BOOKING_STATUS.DITOLAK]: [],
  [BOOKING_STATUS.DIBATALKAN_PASIEN]: [],
  [BOOKING_STATUS.DIBATALKAN_SISTEM]: [],
};

// Export semua constants
module.exports = {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  SLOT_STATUS,
  USER_ROLE,
  NOTIFICATION_TYPE,
  EMAIL_TYPE,
  HARI,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  VALID_STATUS_TRANSITIONS,
};
