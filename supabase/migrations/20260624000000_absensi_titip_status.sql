/*
  # Tambah status 'titip' pada absensi

  Sebelumnya status hanya 'hadir' | 'tidak_hadir', sehingga setiap yang tidak
  hadir PASTI kena talangan. Kenyataannya ada anggota yang tidak hadir fisik
  tapi iurannya tetap masuk (dititipkan lewat orang lain) → TIDAK kena talangan.

  Status baru:
  - hadir       : hadir fisik, bayar          → tidak talangan
  - titip       : tidak hadir, iuran masuk     → tidak talangan
  - tidak_hadir : tidak hadir, iuran tidak ada → kena talangan Rp50.000

  CHECK constraint inline pada CREATE TABLE diberi nama otomatis oleh Postgres
  (`absensi_status_check`); drop-if-exists aman bila namanya sudah berbeda.
*/

ALTER TABLE absensi DROP CONSTRAINT IF EXISTS absensi_status_check;

ALTER TABLE absensi
  ADD CONSTRAINT absensi_status_check
  CHECK (status IN ('hadir', 'titip', 'tidak_hadir'));
