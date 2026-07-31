import { supabase } from './supabase';

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
    .order('created_at', { ascending: true });

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
      const { error: errUpd } = await supabase
        .from('kas_rt')
        .update({ saldo_setelah: running })
        .eq('id', row.id);
      if (errUpd) throw errUpd;
    }
  }
}
