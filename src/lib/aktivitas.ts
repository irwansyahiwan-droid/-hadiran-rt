import { supabase } from './supabase';
import { formatRupiahPlain } from './utils';
import type { AktivitasLog } from './types';

/**
 * Mengubah baris audit_log mentah (lihat migrasi 20260605000000_audit_log.sql)
 * menjadi teks Indonesia yang enak dibaca warga awam. Semua di sini murni
 * presentasi — tidak ada akses DB selain fetchAktivitas().
 */

export type Accent = 'emerald' | 'rose' | 'amber' | 'blue';

/* Baris audit `talangan` menyimpan UUID saja — `warga_id` & `tarikan_id`, tak
   ada nama & tak ada nomor. Akibatnya barisnya YATIM di layar: warga melihat
   "Tandai talangan lunas" tanpa tahu milik siapa, sementara baris kas
   pasangannya menyebut nama lengkap di keterangannya. Kamus ini yang
   menutupnya. Obatnya sengaja MENAMBAH keterangan, bukan menyembunyikan baris
   yang mubazir: layar ini dibuka ke warga justru demi transparansi, jadi
   menghilangkan entri audit demi kerapian bertentangan dgn alasan ia ada. */
export interface KamusNama {
  warga: Record<string, string>;
  tarikan: Record<string, number>;
}

export interface AktivitasView {
  title: string;                 // baris utama, mis. "Tambah Setoran"
  detail: string | null;         // keterangan / nama
  amount: number | null;         // nominal untuk ditampilkan (null bila tak relevan)
  changes: { label: string; from: string; to: string }[]; // diff untuk UPDATE
  actor: string;                 // siapa yang melakukan
  accent: Accent;
  actionLabel: string;           // Tambah / Ubah / Hapus
  tableLabel: string;            // Kas Hadiran / Kas RT / Tarikan / Talangan
  penjelasan: string | null;     // narasi alur/proses/pencatatan utk warga awam
}

/* Nama PERISTIWA — bukan nama kolom (1 Sep 2026).
 *
 * Sampai hari ini judul baris dirakit `${actionLabel} ${TIPE_KAS[enum]}`,
 * sehingga berbunyi "Tambah Talangan Masuk": nama OPERASI TABEL, bukan yang
 * terjadi. Riwayat jadi satu-satunya layar yang bicara bahasa database —
 * padahal app di layar lain sudah lama memakai kata manusia: "Pemasukan" (5×),
 * "Pengeluaran" (6×), "Setor ke Kas RT" (3×), dan toast "Iuran tersimpan &
 * dihitung". Jadi ini BUKAN kosakata baru; ini menyamakan Riwayat dengan
 * bahasa app sendiri (kanon: yang muncul sesudahnya memakai kata yang sama).
 *
 * DUA bentuk per peristiwa, dan itu keharusan bahasa Indonesia, bukan
 * kerapian: `judul` berdiri sendiri saat peristiwanya dicatat ("Setor ke Kas
 * RT"), sedangkan `benda` dipakai SETELAH kata kerja — "Hapus setor ke Kas RT"
 * janggal, yang benar "Hapus setoran ke Kas RT".
 *
 * Sebaran nyata 1 Sep 2026: talangan_masuk 175 · kas_masuk 75 · setor_kas_rt 4
 * · kas_keluar 0 · talangan_keluar 0. Dua yang nol tetap dinamai — nol hari ini
 * bukan nol selamanya, dan baris tanpa nama akan jatuh ke label generik persis
 * saat seseorang pertama kali memakainya. */
const PERISTIWA_KAS: Record<string, { judul: string; benda: string }> = {
  kas_masuk:       { judul: 'Iuran tarikan',            benda: 'iuran tarikan' },
  kas_keluar:      { judul: 'Pengeluaran Kas Hadiran',  benda: 'pengeluaran Kas Hadiran' },
  setor_kas_rt:    { judul: 'Setor ke Kas RT',          benda: 'setoran ke Kas RT' },
  talangan_masuk:  { judul: 'Pelunasan talangan',       benda: 'pelunasan talangan' },
  talangan_keluar: { judul: 'Talangan keluar',          benda: 'talangan keluar' },
};

/** INSERT: peristiwanya menamai dirinya — "Tambah" cuma mengulang apa yang
 *  sudah dikatakan ikon `+` di sebelahnya. UBAH/HAPUS tetap berkata kerja,
 *  karena di situ kata kerjanya justru inti beritanya. */
function judulPeristiwa(
  action: AktivitasLog['action'],
  p: { judul: string; benda: string },
): string {
  return action === 'INSERT' ? p.judul : `${ACTION_LABEL[action] ?? action} ${p.benda}`;
}

const STATUS_TARIKAN: Record<string, string> = {
  dijadwalkan: 'Dijadwalkan',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
};

const TABLE_LABEL: Record<string, string> = {
  transaksi_kas: 'Kas Hadiran',
  kas_rt: 'Kas RT',
  tarikan: 'Tarikan',
  talangan: 'Talangan',
  warga: 'Anggota',
};

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** Nama aktor yang ramah: pakai nama → bagian depan email → "Sistem". */
export function namaAktor(row: AktivitasLog): string {
  if (row.actor_name && row.actor_name.trim()) return row.actor_name.trim();
  const email = (row.actor_email ?? '').trim();
  if (!email || email === 'sistem') return 'Sistem';
  return email.split('@')[0];
}

export function formatWaktu(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatWaktuRelatif(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const hari = Math.floor(h / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return formatWaktu(dateStr);
}

const ACTION_LABEL: Record<AktivitasLog['action'], string> = {
  INSERT: 'Tambah',
  UPDATE: 'Ubah',
  DELETE: 'Hapus',
};

export function formatAktivitas(row: AktivitasLog, kamus?: KamusNama): AktivitasView {
  const data = (row.new_data ?? row.old_data ?? {}) as Record<string, unknown>;
  const old = (row.old_data ?? {}) as Record<string, unknown>;
  const baru = (row.new_data ?? {}) as Record<string, unknown>;
  const actor = namaAktor(row);
  const tableLabel = TABLE_LABEL[row.table_name] ?? row.table_name;
  const actionLabel = ACTION_LABEL[row.action] ?? row.action;
  const accent: Accent =
    row.action === 'INSERT' ? 'emerald' : row.action === 'DELETE' ? 'rose' : 'amber';

  const changes: AktivitasView['changes'] = [];

  // Helper diff untuk UPDATE
  const diffNominal = () => {
    const a = num(old.nominal), b = num(baru.nominal);
    if (row.action === 'UPDATE' && a != null && b != null && a !== b)
      changes.push({ label: 'Nominal', from: formatRupiahPlain(a), to: formatRupiahPlain(b) });
  };
  const diffText = (key: string, label: string) => {
    const a = str(old[key]), b = str(baru[key]);
    if (row.action === 'UPDATE' && a !== b)
      changes.push({ label, from: a || '—', to: b || '—' });
  };

  switch (row.table_name) {
    // Arsip pemulihan yang ditulis fungsi batalkan_tarikan() SEBELUM data
    // dihapus — berisi seluruh absensi + talangan (dgn nama warga). Bila
    // terjadi salah-batal, pemulihan manual membaca entri ini, bukan kertas.
    case 'tarikan_snapshot': {
      const snap = old as { tarikan?: Record<string, unknown>; absensi?: unknown[]; talangan?: unknown[]; mode?: string };
      const nomor = str((snap.tarikan ?? {}).nomor);
      const nAbs = Array.isArray(snap.absensi) ? snap.absensi.length : 0;
      const nTal = Array.isArray(snap.talangan) ? snap.talangan.length : 0;
      const modeLabel = snap.mode === 'hapus' ? 'dihapus' : 'dibatalkan';
      return {
        title: `Arsip Pemulihan Tarikan #${nomor}`,
        detail: `${nAbs} absensi & ${nTal} talangan terarsip`,
        amount: num((snap.tarikan ?? {}).total_terkumpul),
        changes, actor, accent: 'blue', actionLabel, tableLabel: 'Tarikan',
        penjelasan: `Tarikan #${nomor} ${modeLabel}. Sebelum data dihapus, seluruh daftar hadir & talangan diarsipkan di sini secara permanen — bila perlu pemulihan, datanya lengkap di arsip ini (bukan lagi dari catatan kertas).`,
      };
    }
    // Arsip yang ditulis fungsi pulihkan_backup() SEBELUM seluruh data ditimpa
    // file backup. Atomisitas menjaga dari koneksi putus; entri INI yang
    // menjaga dari file yang SALAH dipulihkan — di situ transaksi tetap sukses
    // dan data lama tetap hilang. Tanpa case ini arsipnya ada tapi tak terbaca
    // siapa pun, alias sama saja tidak ada.
    case 'backup_snapshot': {
      const snap = old as { tables?: Record<string, unknown>; exportedAt?: string };
      const tabel = snap.tables ?? {};
      const cacah = (k: string) => (Array.isArray(tabel[k]) ? (tabel[k] as unknown[]).length : 0);
      const total = Object.keys(tabel).reduce((n, k) => n + cacah(k), 0);
      const tglFile = str(snap.exportedAt).slice(0, 10);
      return {
        title: 'Arsip Sebelum Pemulihan Backup',
        detail: `${total} baris data lama terarsip · ${cacah('warga')} anggota`,
        amount: null,
        changes, actor, accent: 'blue', actionLabel, tableLabel: 'Backup',
        penjelasan: `Seluruh data lama diarsipkan permanen di sini SEBELUM ditimpa isi file backup${tglFile ? ` bertanggal ${tglFile}` : ''}. Kalau ternyata file yang dipulihkan keliru, isi lama masih lengkap di entri ini — pemulihannya tidak bergantung pada catatan kertas.`,
      };
    }
    case 'transaksi_kas': {
      const tipeRaw = str(data.tipe);
      const p = PERISTIWA_KAS[tipeRaw] ?? { judul: 'Transaksi Kas', benda: 'transaksi kas' };
      diffNominal();
      diffText('keterangan', 'Keterangan');
      let penjelasan: string;
      if (row.action === 'DELETE') penjelasan = `Transaksi ${p.benda} dihapus — saldo Kas Hadiran dihitung ulang.`;
      else if (row.action === 'UPDATE') penjelasan = 'Transaksi Kas Hadiran diubah — saldo berjalan disesuaikan otomatis.';
      else if (tipeRaw === 'setor_kas_rt') penjelasan = 'Setoran dari Kas Hadiran ke Kas RT. Dicatat ganda: saldo Kas Hadiran berkurang, Kas RT bertambah dengan nilai sama.';
      else if (tipeRaw === 'kas_masuk') penjelasan = 'Iuran satu tarikan tercatat sebagai pemasukan Kas Hadiran (Rp5.000 per pembayar). Otomatis dibuat saat tarikan ditutup.';
      else if (tipeRaw === 'kas_keluar') penjelasan = 'Pengeluaran langsung dari Kas Hadiran — saldo berkurang.';
      else if (tipeRaw === 'talangan_masuk') penjelasan = 'Pelunasan talangan tercatat. Ini mengganti dana yang sempat ditalangi panitia, bukan pendapatan kas baru.';
      else penjelasan = 'Transaksi Kas Hadiran tercatat.';
      return {
        title: judulPeristiwa(row.action, p),
        detail: str(data.keterangan) || null,
        amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    case 'kas_rt': {
      const isKeluar = str(data.tipe) === 'keluar';
      const p = isKeluar
        ? { judul: 'Pengeluaran Kas RT', benda: 'pengeluaran Kas RT' }
        : { judul: 'Pemasukan Kas RT',   benda: 'pemasukan Kas RT' };
      diffNominal();
      diffText('keterangan', 'Keterangan');
      let penjelasan: string;
      if (row.action === 'DELETE') penjelasan = 'Transaksi Kas RT dihapus — saldo Kas RT dihitung ulang.';
      else if (row.action === 'UPDATE') penjelasan = 'Transaksi Kas RT diubah — saldo berjalan disesuaikan otomatis.';
      else if (isKeluar) penjelasan = 'Pengeluaran Kas RT (mis. kegiatan/operasional RT) — saldo Kas RT berkurang.';
      else penjelasan = 'Pemasukan Kas RT — bisa setoran dari Kas Hadiran atau iuran manual dari anggota di luar hadiran. Saldo Kas RT bertambah.';
      return {
        title: judulPeristiwa(row.action, p),
        detail: str(data.keterangan) || null,
        amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    case 'tarikan': {
      const nomor = str(data.nomor);
      if (row.action === 'UPDATE') {
        const sOld = str(old.status), sNew = str(baru.status);
        if (sOld !== sNew) {
          const keSelesai = sNew === 'selesai';
          return {
            title: `Tarikan #${nomor}: ${STATUS_TARIKAN[sOld] ?? sOld} → ${STATUS_TARIKAN[sNew] ?? sNew}`,
            detail: null, amount: num(baru.total_terkumpul),
            changes, actor, accent, actionLabel, tableLabel,
            penjelasan: keSelesai
              ? 'Tarikan ditutup. Iuran Rp5.000/pembayar masuk Kas Hadiran; anggota yang tidak hadir otomatis ditalangi panitia Rp50.000; Sohibul Bait menerima jatah dari para pembayar.'
              : 'Tarikan dikembalikan ke status terjadwal. Absensi, talangan, & kas masuk yang terkait tarikan ini ikut dihapus.',
          };
        }
        diffText('tanggal', 'Tanggal');
      }
      return {
        title: `${actionLabel} Tarikan #${nomor}`,
        detail: null,
        amount: num(data.total_terkumpul),
        changes, actor, accent, actionLabel, tableLabel,
        penjelasan:
          row.action === 'INSERT' ? 'Jadwal tarikan baru dibuat (status terjadwal). Belum ada iuran sampai tarikan ditutup.'
          : row.action === 'DELETE' ? 'Tarikan dihapus beserta absensi, talangan, & kas masuk turunannya.'
          : 'Jadwal/tanggal tarikan diperbarui.',
      };
    }
    case 'warga': {
      const nama = str(data.nama);
      /* Bukan "Data anggota diperbarui": judul entri SUDAH menyebut namanya
         ("Ubah Anggota: …") dan daftar `changes` sudah merinci kolom mana yang
         berubah, jadi kalimat itu tak menambah apa pun. Tetangganya di berkas
         ini semua berpola "X diubah — konsekuensinya" ("Transaksi Kas RT
         diubah — saldo Kas RT dihitung ulang"); yang hilang di sini justru
         konsekuensinya, dan itu pertanyaan sebenarnya orang yang membaca log
         audit: apakah ini mengubah hitungan uang yang sudah lewat? Tidak. */
      let penjelasan = 'Keterangan anggota diubah — perhitungan iuran tarikan yang sudah berjalan tidak berubah.';
      if (row.action === 'INSERT') penjelasan = 'Anggota baru terdaftar. Mulai ikut perhitungan iuran pada tarikan berikutnya.';
      else if (row.action === 'DELETE') penjelasan = 'Anggota dihapus dari master anggota.';
      if (row.action === 'UPDATE') {
        diffText('nama', 'Nama');
        diffText('no_rumah', 'No. Rumah');
        diffText('no_hp', 'No. HP');
        diffText('role', 'Peran');
        const aktifOld = old.status_aktif === true ? 'Aktif' : 'Nonaktif';
        const aktifNew = baru.status_aktif === true ? 'Aktif' : 'Nonaktif';
        if (aktifOld !== aktifNew) {
          changes.push({ label: 'Status', from: aktifOld, to: aktifNew });
          penjelasan = aktifNew === 'Nonaktif'
            ? 'Anggota dinonaktifkan (mis. mengundurkan diri). Tidak lagi dihitung di tarikan berikutnya — jumlah pembayar & iuran ikut menyesuaikan.'
            : 'Anggota diaktifkan kembali. Kembali masuk perhitungan iuran tarikan berikutnya.';
        }
      }
      return {
        title: `${actionLabel} Anggota${nama ? `: ${nama}` : ''}`,
        detail: str(data.no_rumah) || null,
        amount: null,
        changes, actor, accent, actionLabel, tableLabel, penjelasan,
      };
    }
    /* Baris ini PERUBAHAN STATUS, bukan perpindahan uang — dan itu sebabnya ia
       tak lagi bernominal (1 Sep 2026). `talangan.nominal` adalah besar UTANG,
       properti catatannya, bukan yang bergerak saat status dibalik. Uangnya
       dicatat terpisah di `transaksi_kas` tipe `talangan_masuk`
       (Talangan.tsx) — dan pasangan itulah yang jadi masalah: satu ketukan
       "tandai lunas" menulis DUA baris audit, dan dulu keduanya mencetak
       Rp50.000 hijau berturut-turut. Warga yang membacanya wajar menyimpulkan
       Rp100.000 bergerak. Di app kas itu bukan soal rasa.

       Yang dibuang cuma ANGKAnya, bukan barisnya: perbuatannya nyata dan tetap
       layak terlihat di riwayat — nominalnya sudah diwakili baris kas
       pasangannya, lengkap dgn nama & nomor tarikan di keterangannya.
       Berlaku untuk kedua arah: membatalkan pelunasan juga menghapus baris kas
       pasangannya, dan penghapusan itu punya entri auditnya sendiri. */
    case 'talangan': {
      const lunas = baru.status_lunas === true;
      /* Identitas baris dirakit dari UUID lewat kamus. Tanpa kamus (uji, atau
         pemanggil yang belum menyediakannya) hasilnya `null` — sama seperti
         sebelumnya, jadi ketiadaan kamus MENURUNKAN mutu, tak pernah memecah.
         Huruf kalimat, sejajar judul peristiwa lain sesudah pass kata 1 Sep. */
      const namaWarga = kamus?.warga[str(data.warga_id)];
      const nomorTarikan = kamus?.tarikan[str(data.tarikan_id)];
      const jejak = [
        namaWarga || null,
        nomorTarikan != null ? `Tarikan #${nomorTarikan}` : null,
      ].filter(Boolean).join(' · ');
      return {
        title: lunas ? 'Tandai talangan lunas' : 'Batalkan pelunasan talangan',
        detail: jejak || null,
        amount: null,
        changes, actor,
        accent: lunas ? 'emerald' : 'amber',
        actionLabel, tableLabel,
        penjelasan: lunas
          ? 'Anggota melunasi talangan Rp50.000. Dana panitia yang sempat menalangi terganti — dicatat agar utang anggota nol.'
          : 'Pelunasan talangan dibatalkan. Status anggota kembali "belum lunas".',
      };
    }
    default:
      return {
        title: `${actionLabel} ${tableLabel}`,
        detail: null, amount: num(data.nominal),
        changes, actor, accent, actionLabel, tableLabel, penjelasan: null,
      };
  }
}

/* Kolom disebut SATU-SATU, bukan '*' — dan ini syarat, bukan kerapian.
   `actor_email` & `actor_id` DICABUT dari peran `anon` di database (izin
   per-kolom, lihat 20260901010000_audit_log_sembunyikan_email.sql): warga
   berhak tahu SIAPA yang mengubah kas, bukan alamat email pengurusnya —
   garis yang sama yang sudah dipakai mengecualikan tabel `warga` karena
   diff-nya memuat no_hp. Dgn izin per-kolom terpasang, `select=*` melebar ke
   kolom yang ditolak dan SELURUH Riwayat warga gagal muat; menyebut kolom di
   sini yang membuatnya tetap jalan. Nama aktor datang dari `actor_name`
   (lihat `namaAktor`), yang diisi trigger dari user_metadata. */
/* Kamus UUID → nama/nomor untuk memberi identitas pada baris `talangan`.
   Dua tabel kecil (69 warga, puluhan tarikan) & keduanya memang sudah terbuka
   untuk warga — nama sohibul bait & daftar hadir tampil di layar lain.
   MELEMPAR saat gagal, bukan mengembalikan kamus kosong: `.select()` Supabase
   tidak melempar sendiri, dan `?? []` diam-diam mengubah kegagalan jadi "tak
   ada data" (jebakan yang sudah tercatat di CLAUDE.md). Yang memutuskan boleh
   atau tidaknya berjalan tanpa kamus adalah PEMANGGIL, bukan helper ini. */
export async function fetchKamus(): Promise<KamusNama> {
  const [w, t] = await Promise.all([
    supabase.from('warga').select('id, nama'),
    supabase.from('tarikan').select('id, nomor'),
  ]);
  if (w.error) throw w.error;
  if (t.error) throw t.error;

  const warga: Record<string, string> = {};
  for (const r of (w.data ?? []) as { id: string; nama: string }[]) warga[r.id] = r.nama;
  const tarikan: Record<string, number> = {};
  for (const r of (t.data ?? []) as { id: string; nomor: number }[]) tarikan[r.id] = r.nomor;
  return { warga, tarikan };
}

export async function fetchAktivitas(limit = 200): Promise<AktivitasLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, table_name, record_id, action, actor_name, old_data, new_data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AktivitasLog[]) ?? [];
}
