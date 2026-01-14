/**
 * Format date to Indonesian locale
 */
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

/**
 * Format currency to Indonesian Rupiah
 */
const formatRupiah = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format time string (HH:MM:SS to HH:MM)
 */
const formatWaktu = (time) => {
  if (!time) return "";
  return time.substring(0, 5);
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Get day name in Indonesian
 */
const getHariIndonesia = (date) => {
  const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
  const d = new Date(date);
  return days[d.getDay()];
};

/**
 * Calculate duration between two times
 */
const calculateDuration = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes - startMinutes;
};

/**
 * Add minutes to time string
 */
const addMinutesToTime = (time, minutes) => {
  const [hour, min] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + min + minutes;

  const newHour = Math.floor(totalMinutes / 60);
  const newMin = totalMinutes % 60;

  return `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(
    2,
    "0"
  )}`;
};

/**
 * Check if date is today
 */
const isToday = (date) => {
  const today = new Date();
  const d = new Date(date);
  return d.toDateString() === today.toDateString();
};

/**
 * Check if date is in the past
 */
const isPast = (date, time = null) => {
  const now = new Date();
  let d = new Date(date);

  if (time) {
    const [hour, min] = time.split(":").map(Number);
    d.setHours(hour, min, 0, 0);
  }

  return d < now;
};

/**
 * Get dates between two dates
 */
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

/**
 * Slugify string
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

/**
 * Mask email for privacy
 */
const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  const maskedLocal = local.charAt(0) + "***" + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * Mask phone number for privacy
 */
const maskPhone = (phone) => {
  if (!phone) return "";
  const len = phone.length;
  return phone.substring(0, 4) + "****" + phone.substring(len - 4);
};

/**
 * Clean object by removing undefined/null values
 */
const cleanObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

/**
 * Pagination helper
 */
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  return { page: pageNum, limit: limitNum, offset };
};

/**
 * Build pagination response
 */
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
