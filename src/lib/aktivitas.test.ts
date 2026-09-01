import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * `aktivitas.ts` menerjemahkan baris `audit_log` mentah jadi kalimat Indonesia.
 * Isinya "cuma presentasi", tapi dua hal bikin ia pantas dikunci:
 *
 *  1. `tarikan_snapshot` adalah SATU-SATUNYA jalan membaca arsip pemulihan yang
 *     ditulis `batalkan_tarikan()` sebelum data dihapus. Kalau baris ini salah
 *     dirender, bendahara yang salah membatalkan tarikan kehilangan satu-satunya
 *     petunjuk untuk memulihkan absensi & talangan. Dan uniknya baris ini
 *     membaca `old_data`, bukan `new_data` — gampang "dirapikan" jadi salah.
 *
 *  2. Baris DELETE tak punya `new_data`. Seluruh fungsi bergantung pada rantai
 *     `new_data ?? old_data ?? {}`; kalau fallback itu putus, penghapusan
 *     transaksi tampil sebagai baris kosong tanpa nominal — persis di tempat
 *     yang paling butuh jejak.
 *
 * Diuji juga: diff HANYA muncul pada UPDATE (tanpa penjaga itu, baris INSERT
 * memamerkan perubahan palsu "— → sesuatu"), nominal Postgres yang datang
 * sebagai STRING, dan `fetchAktivitas` yang wajib melempar saat query gagal.
 */

type Res = { data: unknown; error: unknown };
let hasil: Res = { data: [], error: null };
let limitTerakhir = 0;

function builder(): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.order = () => b;
  b.limit = (n: number) => { limitTerakhir = n; return b; };
  b.then = (resolve: (v: Res) => unknown) => Promise.resolve(hasil).then(resolve);
  return b;
}
vi.mock('./supabase', () => ({ supabase: { from: () => builder() } }));

const { formatAktivitas, namaAktor, formatWaktuRelatif, fetchAktivitas } = await import('./aktivitas');

type Row = Parameters<typeof formatAktivitas>[0];
const row = (p: Partial<Row>): Row => ({
  id: 'log-1',
  table_name: 'transaksi_kas',
  action: 'INSERT',
  actor_email: 'bendahara@rt.id',
  actor_name: null,
  old_data: null,
  new_data: null,
  created_at: '2026-08-01T10:00:00Z',
  ...p,
} as Row);

describe('tarikan_snapshot — arsip pemulihan, jalur paling tak boleh salah', () => {
  const snap = (mode: string) => row({
    table_name: 'tarikan_snapshot',
    action: 'DELETE',
    old_data: {
      mode,
      tarikan: { nomor: 14, total_terkumpul: 345_000 },
      absensi: [{}, {}, {}],
      talangan: [{}, {}],
    },
  });

  it('membaca old_data (bukan new_data) dan mencacah absensi + talangan', () => {
    const v = formatAktivitas(snap('batal'));
    expect(v.title).toBe('Arsip Pemulihan Tarikan #14');
    expect(v.detail).toBe('3 absensi & 2 talangan terarsip');
    expect(v.amount).toBe(345_000);
  });

  /* Cocokkan KALIMAT PEMBUKANYA, bukan sekadar kata "dihapus"/"dibatalkan":
     badan penjelasannya sendiri memuat frasa "Sebelum data dihapus", jadi
     assertion longgar tetap lulus meski kedua mode dipukul rata — versi
     pertama uji ini memang begitu, dan uji mutasi yang membongkarnya. */
  it('mode "hapus" dan "batal" dibedakan di kalimat pembuka penjelasannya', () => {
    expect(formatAktivitas(snap('hapus')).penjelasan).toMatch(/^Tarikan #14 dihapus\./);
    expect(formatAktivitas(snap('batal')).penjelasan).toMatch(/^Tarikan #14 dibatalkan\./);
  });

  it('dibedakan visual dari log biasa (accent biru) & dilabeli Tarikan', () => {
    const v = formatAktivitas(snap('batal'));
    expect(v.accent).toBe('blue');
    expect(v.tableLabel).toBe('Tarikan');
  });

  it('snapshot tanpa daftar (kolom hilang) tetap terbaca, bukan crash', () => {
    const v = formatAktivitas(row({
      table_name: 'tarikan_snapshot', action: 'DELETE',
      old_data: { tarikan: { nomor: 9 } },
    }));
    expect(v.detail).toBe('0 absensi & 0 talangan terarsip');
  });
});

/* Arsip pra-restore yang ditulis RPC pulihkan_backup(). Alasannya sama persis
   dgn tarikan_snapshot di atas: transaksi atomik menjaga dari koneksi putus,
   TIDAK dari file yang salah dipulihkan — di sana restore sukses dan data lama
   tetap hilang. Kalau baris ini tak terbaca di Riwayat Aktivitas, arsipnya ada
   tapi tak berguna bagi siapa pun. */
describe('backup_snapshot — arsip sebelum seluruh data ditimpa', () => {
  const snap = (extra: Record<string, unknown> = {}) => row({
    table_name: 'backup_snapshot',
    action: 'DELETE',
    old_data: {
      exportedAt: '2026-07-30T12:00:00.000Z',
      tables: { warga: [{}, {}, {}], tarikan: [{}], absensi: [{}, {}] },
      ...extra,
    },
  });

  it('membaca old_data & mencacah SELURUH tabel, bukan satu tabel saja', () => {
    const v = formatAktivitas(snap());
    expect(v.title).toBe('Arsip Sebelum Pemulihan Backup');
    expect(v.detail).toBe('6 baris data lama terarsip · 3 anggota');
  });

  it('tanggal file backup ikut disebut — dua arsip beruntun harus bisa dibedakan', () => {
    expect(formatAktivitas(snap()).penjelasan).toMatch(/bertanggal 2026-07-30/);
  });

  it('tanpa exportedAt tetap berkalimat wajar, bukan "bertanggal undefined"', () => {
    const v = formatAktivitas(snap({ exportedAt: undefined }));
    expect(v.penjelasan).not.toMatch(/bertanggal/);
    expect(v.penjelasan).toMatch(/^Seluruh data lama diarsipkan/);
  });

  it('dibedakan visual dari log biasa (accent biru) & dilabeli Backup', () => {
    const v = formatAktivitas(snap());
    expect(v.accent).toBe('blue');
    expect(v.tableLabel).toBe('Backup');
    expect(v.amount).toBeNull();   // ini bukan transaksi uang
  });

  it('tables hilang / bukan daftar tetap terbaca, bukan crash', () => {
    for (const jelek of [undefined, { warga: 'bukan daftar' }]) {
      const v = formatAktivitas(row({
        table_name: 'backup_snapshot', action: 'DELETE', old_data: { tables: jelek },
      }));
      expect(v.detail).toBe('0 baris data lama terarsip · 0 anggota');
    }
  });
});

describe('baris DELETE — jejak tak boleh jadi kosong', () => {
  it('nominal & keterangan diambil dari old_data saat new_data null', () => {
    const v = formatAktivitas(row({
      table_name: 'transaksi_kas', action: 'DELETE',
      old_data: { tipe: 'kas_masuk', nominal: 150_000, keterangan: 'Iuran tarikan #12' },
    }));
    expect(v.amount).toBe(150_000);
    expect(v.detail).toBe('Iuran tarikan #12');
    expect(v.title).toBe('Hapus iuran tarikan');
    expect(v.accent).toBe('rose');
  });
});

describe('nominal dari Postgres bisa berupa STRING', () => {
  it('"50000" terbaca 50000, bukan hilang', () => {
    const v = formatAktivitas(row({ table_name: 'kas_rt', new_data: { tipe: 'masuk', nominal: '50000' } }));
    expect(v.amount).toBe(50_000);
  });

  it('nominal tak masuk akal → null, bukan NaN yang bocor ke layar', () => {
    const v = formatAktivitas(row({ table_name: 'kas_rt', new_data: { tipe: 'masuk', nominal: 'entah' } }));
    expect(v.amount).toBeNull();
  });
});

describe('diff hanya untuk UPDATE', () => {
  it('INSERT tidak memunculkan perubahan palsu', () => {
    const v = formatAktivitas(row({
      table_name: 'transaksi_kas', action: 'INSERT',
      new_data: { tipe: 'kas_masuk', nominal: 10_000, keterangan: 'baru' },
    }));
    expect(v.changes).toHaveLength(0);
  });

  /* Baris non-UPDATE yang KEBETULAN membawa old_data DAN new_data sekaligus —
     mungkin saja terjadi tergantung bagaimana trigger menulis. Tanpa penjaga
     `action === 'UPDATE'`, penghapusan transaksi akan tampil membawa diff
     "Nominal: X → Y" seolah ada yang diubah. Cek null saja TIDAK menutup ini:
     kedua sisi terisi. */
  it('DELETE yang membawa old_data DAN new_data tetap tanpa diff', () => {
    const v = formatAktivitas(row({
      table_name: 'transaksi_kas', action: 'DELETE',
      old_data: { tipe: 'kas_masuk', nominal: 10_000, keterangan: 'lama' },
      new_data: { tipe: 'kas_masuk', nominal: 25_000, keterangan: 'baru' },
    }));
    expect(v.changes).toHaveLength(0);
  });

  it('UPDATE memunculkan nominal & keterangan yang benar-benar berubah saja', () => {
    const v = formatAktivitas(row({
      table_name: 'transaksi_kas', action: 'UPDATE',
      old_data: { tipe: 'kas_masuk', nominal: 10_000, keterangan: 'sama' },
      new_data: { tipe: 'kas_masuk', nominal: 25_000, keterangan: 'sama' },
    }));
    expect(v.changes).toEqual([{ label: 'Nominal', from: 'Rp10.000', to: 'Rp25.000' }]);
  });
});

describe('perubahan status yang punya akibat nyata', () => {
  it('tarikan dikembalikan ke terjadwal → penjelasannya MEMPERINGATKAN data turunan ikut dihapus', () => {
    const v = formatAktivitas(row({
      table_name: 'tarikan', action: 'UPDATE',
      old_data: { nomor: 12, status: 'selesai' },
      new_data: { nomor: 12, status: 'dijadwalkan', total_terkumpul: 0 },
    }));
    expect(v.title).toBe('Tarikan #12: Selesai → Dijadwalkan');
    expect(v.penjelasan).toContain('dihapus');
  });

  it('anggota dinonaktifkan tercatat sebagai perubahan status + akibat ke iuran', () => {
    const v = formatAktivitas(row({
      table_name: 'warga', action: 'UPDATE',
      old_data: { nama: 'Budi', status_aktif: true },
      new_data: { nama: 'Budi', status_aktif: false },
    }));
    expect(v.changes).toContainEqual({ label: 'Status', from: 'Aktif', to: 'Nonaktif' });
    expect(v.penjelasan).toMatch(/tidak lagi dihitung/i);
  });

  it('talangan: lunas vs pembatalan pelunasan tak boleh tertukar', () => {
    const lunas = formatAktivitas(row({ table_name: 'talangan', action: 'UPDATE', new_data: { status_lunas: true, nominal: 50_000 } }));
    const batal = formatAktivitas(row({ table_name: 'talangan', action: 'UPDATE', new_data: { status_lunas: false, nominal: 50_000 } }));
    expect(lunas.title).toBe('Tandai talangan lunas');
    expect(lunas.accent).toBe('emerald');
    expect(batal.title).toBe('Batalkan pelunasan talangan');
  });

  /* Baris `talangan` cuma menyimpan UUID, jadi sampai 2 Sep 2026 ia tampil
     YATIM: "Tandai talangan lunas" tanpa nama & tanpa nomor, tepat di bawah
     baris kas yang menyebut keduanya. Kamus memberinya identitas.

     Yang dikunci DUA sifat berlawanan sekaligus, dan itu disengaja: dgn kamus
     ia WAJIB menyebut orang & tarikan; TANPA kamus ia WAJIB tetap `null` dan
     tidak memuntahkan "undefined" ke layar. Sifat kedua yang menjaga jalur
     luring/gagal — kamus dimuat terpisah dan boleh gagal sendirian. */
  const kamus = {
    warga: { 'w-1': 'Ustad Saiful Hadi' },
    tarikan: { 't-9': 18 },
  };
  const barisTalangan = (extra: Record<string, unknown> = {}) => row({
    table_name: 'talangan', action: 'UPDATE',
    new_data: { status_lunas: true, nominal: 50_000, warga_id: 'w-1', tarikan_id: 't-9', ...extra },
  });

  it('dengan kamus: baris talangan menyebut nama & nomor tarikan', () => {
    expect(formatAktivitas(barisTalangan(), kamus).detail).toBe('Ustad Saiful Hadi · Tarikan #18');
  });

  it('tanpa kamus: detail null — bukan "undefined" yang bocor ke layar', () => {
    const v = formatAktivitas(barisTalangan());
    expect(v.detail).toBeNull();
  });

  it('kamus tak lengkap: sebut yang diketahui saja, jangan setengah kalimat', () => {
    // UUID asing (mis. anggota sudah dihapus) — nomor tarikan tetap berguna.
    expect(formatAktivitas(barisTalangan({ warga_id: 'entah' }), kamus).detail)
      .toBe('Tarikan #18');
    expect(formatAktivitas(barisTalangan({ tarikan_id: 'entah' }), kamus).detail)
      .toBe('Ustad Saiful Hadi');
  });

  /* Penjaga UANG, bukan penjaga tampilan. Satu ketukan "tandai lunas" menulis
     DUA baris audit — UPDATE `talangan` (status) + INSERT `transaksi_kas`
     (uangnya). Sampai 1 Sep 2026 keduanya mencetak nominal yang SAMA, jadi
     riwayat memperlihatkan Rp50.000 dua kali berturut-turut untuk satu
     perbuatan, dan warga wajar membacanya Rp100.000. Ketahuan lewat lembar
     kontak, bukan lewat sapuan mana pun: tiap sapuan menilai SATU layar, dan
     baris ini memang tak salah sendirian — ia salah karena BERPASANGAN.

     `talangan.nominal` besar UTANG, properti catatannya; yang bergerak hidup
     di baris kas. Jadi yang dikunci di sini: baris status TIDAK boleh
     bernominal, sementara baris kas pasangannya WAJIB tetap bernominal —
     memperbaiki yang pertama dgn membisukan yang kedua akan menghapus uangnya
     dari riwayat sama sekali. */
  /* Judul menyebut PERISTIWA, bukan operasi tabel (disetujui user 1 Sep 2026).
     Sampai hari itu judulnya `${actionLabel} ${TIPE_KAS[enum]}` — "Tambah
     Talangan Masuk" — nama kolom database yang dibaca warga awam. Yang dikunci
     di sini DUA sifat sekaligus, karena memperbaiki satu gampang melupakan
     yang lain:
       INSERT  → peristiwanya menamai dirinya, TANPA "Tambah"
       UBAH/HAPUS → kata kerja + bentuk BENDA ("setoran", bukan "setor")
     Kosakatanya bukan karangan: "Pemasukan"/"Pengeluaran"/"Setor ke Kas RT"
     sudah dipakai app di layar lain — ini menyamakan Riwayat dgn bahasa app
     sendiri, bukan memperkenalkan istilah baru. */
  it('judul menyebut peristiwa: INSERT tanpa kata kerja, UBAH/HAPUS pakai bentuk benda', () => {
    const kas = (tipe: string, action: 'INSERT' | 'UPDATE' | 'DELETE') =>
      formatAktivitas(row({ table_name: 'transaksi_kas', action, new_data: { tipe, nominal: 50_000 } })).title;

    expect(kas('talangan_masuk', 'INSERT')).toBe('Pelunasan talangan');
    expect(kas('kas_masuk', 'INSERT')).toBe('Iuran tarikan');
    expect(kas('setor_kas_rt', 'INSERT')).toBe('Setor ke Kas RT');
    // "Hapus setor ke Kas RT" janggal — bentuk bendanya "setoran".
    expect(kas('setor_kas_rt', 'DELETE')).toBe('Hapus setoran ke Kas RT');
    expect(kas('talangan_masuk', 'UPDATE')).toBe('Ubah pelunasan talangan');

    const rt = (tipe: string, action: 'INSERT' | 'DELETE') =>
      formatAktivitas(row({ table_name: 'kas_rt', action, new_data: { tipe, nominal: 50_000 } })).title;
    expect(rt('masuk', 'INSERT')).toBe('Pemasukan Kas RT');
    expect(rt('keluar', 'INSERT')).toBe('Pengeluaran Kas RT');
    expect(rt('keluar', 'DELETE')).toBe('Hapus pengeluaran Kas RT');

    // Tipe tak dikenal tetap punya judul — jangan pernah kosong.
    expect(kas('entah_apa', 'INSERT')).toBe('Transaksi Kas');
  });

  it('perubahan status talangan TIDAK bernominal — uangnya milik baris kas', () => {
    const lunas = formatAktivitas(row({ table_name: 'talangan', action: 'UPDATE', new_data: { status_lunas: true, nominal: 50_000 } }));
    const batal = formatAktivitas(row({ table_name: 'talangan', action: 'UPDATE', new_data: { status_lunas: false, nominal: 50_000 } }));
    expect(lunas.amount).toBeNull();
    expect(batal.amount).toBeNull();

    // Sisi lain pasangan — kalau ini ikut null, uangnya hilang dari riwayat.
    const kas = formatAktivitas(row({
      table_name: 'transaksi_kas', action: 'INSERT',
      new_data: { tipe: 'talangan_masuk', nominal: 50_000, keterangan: 'Talangan lunas — Ustad Saiful Hadi' },
    }));
    expect(kas.amount).toBe(50_000);
  });
});

describe('namaAktor — audit log tanpa pelaku yang jelas tak ada gunanya', () => {
  it('nama dipakai lebih dulu', () => {
    expect(namaAktor(row({ actor_name: 'Pak Yatmo', actor_email: 'y@rt.id' }))).toBe('Pak Yatmo');
  });
  it('tanpa nama → bagian depan email', () => {
    expect(namaAktor(row({ actor_name: null, actor_email: 'bendahara@rt.id' }))).toBe('bendahara');
  });
  it('nama kosong/spasi tidak dianggap ada', () => {
    expect(namaAktor(row({ actor_name: '   ', actor_email: 'bendahara@rt.id' }))).toBe('bendahara');
  });
  it('trigger otomatis → "Sistem", bukan string kosong', () => {
    expect(namaAktor(row({ actor_name: null, actor_email: 'sistem' }))).toBe('Sistem');
    expect(namaAktor(row({ actor_name: null, actor_email: null }))).toBe('Sistem');
  });
});

describe('formatWaktuRelatif — batas-batasnya', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-08-04T12:00:00Z')); });
  afterEach(() => vi.useRealTimers());
  const lalu = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('di bawah semenit = "Baru saja"', () => expect(formatWaktuRelatif(lalu(30_000))).toBe('Baru saja'));
  it('menit → jam → hari', () => {
    expect(formatWaktuRelatif(lalu(5 * 60_000))).toBe('5 menit lalu');
    expect(formatWaktuRelatif(lalu(3 * 3_600_000))).toBe('3 jam lalu');
    expect(formatWaktuRelatif(lalu(2 * 86_400_000))).toBe('2 hari lalu');
  });
  it('≥7 hari berhenti jadi relatif dan memakai tanggal penuh', () => {
    const t = formatWaktuRelatif(lalu(9 * 86_400_000));
    expect(t).not.toContain('hari lalu');
    expect(t).toContain('2026');
  });
});

describe('fetchAktivitas — kegagalan query tidak boleh jadi riwayat kosong', () => {
  beforeEach(() => { hasil = { data: [], error: null }; limitTerakhir = 0; });

  it('error dilempar, bukan dipulangkan sebagai daftar kosong', async () => {
    hasil = { data: null, error: { message: 'boom' } };
    await expect(fetchAktivitas()).rejects.toBeTruthy();
  });

  it('data null (tanpa error) jadi array kosong', async () => {
    hasil = { data: null, error: null };
    await expect(fetchAktivitas()).resolves.toEqual([]);
  });

  it('limit diteruskan ke query', async () => {
    await fetchAktivitas(25);
    expect(limitTerakhir).toBe(25);
  });
});
