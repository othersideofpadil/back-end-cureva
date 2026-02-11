// Helper functions untuk formatting dan utility

// Format tanggal ke format Indonesia (contoh: Senin, 11 Februari 2026)
const formatTanggal = (date, options = {}) => {
  const d = new Date(date);
  return d.toLocaleDateString("id-ID", {
    weekday: options.weekday || "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
};

// Format angka ke format mata uang Rupiah (contoh: Rp 150.000)
const formatRupiah = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format waktu dari HH:MM:SS menjadi HH:MM
const formatWaktu = (time) => {
  if (!time) return "";
  return time.substring(0, 5);
};

// Generate string random (untuk token, kode unik, dll)
const generateRandomString = (length = 32) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Ambil nama hari dalam bahasa Indonesia dari tanggal
const getHariIndonesia = (date) => {
  const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  const d = new Date(date);
  return days[d.getDay()];
};

// Hitung durasi dalam menit antara dua waktu
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
};

// Tambah menit ke waktu (contoh: 08:00 + 60 menit = 09:00)
const addMinutesToTime = (time, minutes) => {
  const [hour, min] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + min + minutes;

  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;

  return `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(
    2,
    "0",
  )}`;
};

// Cek apakah tanggal adalah hari ini
const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

// Cek apakah tanggal (dan waktu) sudah lewat
const isPast = (date, time = null) => {
  const now = new Date();
  let d = new Date(date);

  if (time) {
    const [hour, min] = time.split(":").map(Number);
    d.setHours(hour, min, 0, 0);
  }

  return d < now;
};

// Ambil array tanggal antara dua tanggal
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// Ubah text menjadi slug URL-friendly (contoh: "Home Care" -> "home-care")
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

// Mask email untuk privasi (contoh: j***n@email.com)
const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  const maskedLocal = local.charAt(0) + "***" + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};

// Mask nomor telepon untuk privasi (contoh: 0812****5678)
const maskPhone = (phone) => {
  if (!phone) return "";
  const len = phone.length;
  return phone.substring(0, 4) + "****" + phone.substring(len - 4);
};

// Bersihkan object dari value undefined/null
const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Helper untuk pagination (hitung page, limit, offset)
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

// Build response pagination lengkap dengan metadata
const paginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

// Export semua helper functions
module.exports = {
  formatTanggal,
  formatRupiah,
  formatWaktu,
  generateRandomString,
  getHariIndonesia,
  calculateDuration,
  addMinutesToTime,
  isToday,
  isPast,
  getDatesBetween,
  slugify,
  maskEmail,
  maskPhone,
  cleanObject,
  paginate,
  paginationResponse,
};
