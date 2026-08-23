import { supabase } from './supabase';
import { wajibBerubah } from './tulisAman';

interface Row {
  id: string;
  tipe: 'masuk' | 'keluar';
  nominal: number;
  saldo_setelah: number;
}

/**
 * Hitung ulang `saldo_setelah` semua baris kas_rt secara kronologis
 * (saldo berjalan), lalu perbarui baris yang berubah. Dipanggil setelah
 * tambah/edit/hapus agar saldo per baris selalu konsisten.
 */
export async function recomputeKasRTSaldo(): Promise<void> {
  const { data, error } = await supabase
    .from('kas_rt')
    .select('id, tipe, nominal, saldo_setelah')
    .order('tanggal', { ascending: true })
    .order('created_at', { ascending: true })
    /* Pemecah SERI wajib, dan `id` dipilih karena selalu ada & unik.
       Tanpa ini urutan baris yang `tanggal` DAN `created_at`-nya sama tidak
       ditentukan — Postgres boleh memulangkannya dalam urutan mana pun. Total
       saldo tetap benar, tapi `saldo_setelah` PER BARIS bisa BERTUKAR antar
       pemanggilan, jadi dua baris yang sama menampilkan saldo berjalan berbeda
       di layar & Excel dari satu hitung-ulang ke hitung-ulang berikutnya.
       Bukan hipotesis: data produksi (19 Agu 2026) punya satu grup seri —
       dua baris 2026-02-08 dgn created_at identik. Rantainya konsisten, tapi
       hanya untuk SATU dari dua urutan yang mungkin. */
    .order('id', { ascending: true });

  /* Supabase TIDAK melempar saat gagal — ia memulangkan { data: null, error }.
     Tanpa cek ini, query gagal berubah jadi `?? []`, perulangan tak berjalan,
     dan fungsi PULANG NORMAL seolah saldo sudah dihitung ulang. Akibatnya bukan
     sekadar kosmetik: kolom "Saldo:" tiap baris Kas RT dan saldo berjalan yang
     ikut ke Excel jadi basi, sementara app menampilkan toast "tersimpan". Pada
     buku kas bertanggung jawab, angka basi yang terlihat sah lebih berbahaya
     daripada pesan gagal. */
  if (error) throw error;

  let running = 0;
  for (const row of (data ?? []) as Row[]) {
    running += row.tipe === 'masuk' ? row.nominal : -row.nominal;
    if (row.saldo_setelah !== running) {
      // Alasan sama untuk jalur TULIS: UPDATE yang ditolak (mis. policy RLS
      // belum aktif) dulu lewat diam-diam → sebagian baris tersimpan, sisanya
      // tidak, dan saldo berjalan jadi tak konsisten tanpa ada yang tahu.
      /* `.select('id')` + wajibBerubah: UPDATE yang kena NOL baris dibalas 204
         kosong, identik dgn yang berhasil. Di loop ini akibatnya paling jahat —
         sebagian baris tersimpan, sisanya tidak, dan saldo berjalan jadi tak
         konsisten tanpa satu pun galat muncul. */
      wajibBerubah(await supabase
        .from('kas_rt')
        .update({ saldo_setelah: running })
        .eq('id', row.id)
        .select('id'), 'memperbarui saldo berjalan Kas RT');
    }
  }
}
