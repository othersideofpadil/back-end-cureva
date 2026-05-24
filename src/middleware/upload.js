const path = require("path");
const multer = require("multer");

const layananStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/layanan"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(ext, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeName || "layanan"}-${unique}${ext}`);
  },
});

const imageOnly = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("File harus berupa gambar"));
  }
  cb(null, true);
};

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads/profile"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${unique}${ext}`);
  },
});

const uploadLayananImage = multer({
  storage: layananStorage,
  fileFilter: imageOnly,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("gambar");

const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: imageOnly,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("avatar");

module.exports = {
  uploadLayananImage,
  uploadProfileImage,
};
