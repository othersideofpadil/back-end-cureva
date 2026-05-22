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

const uploadLayananImage = multer({
  storage: layananStorage,
  fileFilter: imageOnly,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("gambar");

module.exports = {
  uploadLayananImage,
};
