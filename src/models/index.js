const User = require("./User");
const Layanan = require("./Layanan");
const Pemesanan = require("./Pemesanan");
const Pembayaran = require("./Pembayaran");
const { JadwalDefault, JadwalAktif } = require("./Jadwal");
const Notifikasi = require("./Notifikasi");
const Settings = require("./Settings");

module.exports = {
  User,
  Layanan,
  Pemesanan,
  Pembayaran,
  JadwalDefault,
  JadwalAktif,
  Notifikasi,
  Settings,
};
