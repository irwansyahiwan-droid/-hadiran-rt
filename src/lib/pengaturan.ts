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

// ── Pengumuman / Info Penting (dikelola bendahara, dilihat semua warga) ──

export type PengumumanTipe = 'info' | 'penting' | 'sukses';

export interface Pengumuman {
  judul: string;
  isi: string;
  aktif: boolean;
  tipe: PengumumanTipe;
  updated_at?: string;
}

const KEY_PENGUMUMAN = 'pengumuman';

export async function getPengumuman(): Promise<Pengumuman | null> {
  const { data } = await supabase
    .from('pengaturan')
    .select('value')
    .eq('key', KEY_PENGUMUMAN)
    .maybeSingle();
  const v = data?.value as Partial<Pengumuman> | undefined;
  if (!v || (!v.isi && !v.judul)) return null;
  return {
    judul: v.judul ?? '',
    isi: v.isi ?? '',
    aktif: v.aktif ?? false,
    tipe: (v.tipe as PengumumanTipe) ?? 'info',
    updated_at: v.updated_at,
  };
}

export async function setPengumuman(p: Pengumuman): Promise<boolean> {
  const payload = { ...p, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('pengaturan')
    .upsert({ key: KEY_PENGUMUMAN, value: payload, updated_at: payload.updated_at });
  return !error;
}

export async function clearPengumuman(): Promise<boolean> {
  const { error } = await supabase.from('pengaturan').delete().eq('key', KEY_PENGUMUMAN);
  return !error;
}
