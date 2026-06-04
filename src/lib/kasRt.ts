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
  const { data } = await supabase
    .from('kas_rt')
    .select('id, tipe, nominal, saldo_setelah')
    .order('tanggal', { ascending: true })
    .order('created_at', { ascending: true });

  let running = 0;
  for (const row of (data ?? []) as Row[]) {
    running += row.tipe === 'masuk' ? row.nominal : -row.nominal;
    if (row.saldo_setelah !== running) {
      await supabase.from('kas_rt').update({ saldo_setelah: running }).eq('id', row.id);
    }
  }
}
