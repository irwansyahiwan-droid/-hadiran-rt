import { supabase } from './supabase';

/** Setelan ringan tersimpan di tabel `pengaturan` (key-value JSONB). */

export interface TargetKasRT {
  nominal: number;
  keterangan: string;
  tanggal: string | null; // batas waktu (opsional, YYYY-MM-DD)
}

const KEY_TARGET = 'target_kas_rt';

export async function getTargetKasRT(): Promise<TargetKasRT | null> {
  const { data } = await supabase
    .from('pengaturan')
    .select('value')
    .eq('key', KEY_TARGET)
    .maybeSingle();
  const v = data?.value as Partial<TargetKasRT> | undefined;
  if (!v || !v.nominal) return null;
  return {
    nominal: Number(v.nominal),
    keterangan: v.keterangan ?? '',
    tanggal: v.tanggal ?? null,
  };
}

export async function setTargetKasRT(t: TargetKasRT): Promise<boolean> {
  const { error } = await supabase
    .from('pengaturan')
    .upsert({ key: KEY_TARGET, value: t, updated_at: new Date().toISOString() });
  return !error;
}

export async function clearTargetKasRT(): Promise<boolean> {
  const { error } = await supabase.from('pengaturan').delete().eq('key', KEY_TARGET);
  return !error;
}
