import { AlertTriangle } from 'lucide-react';

/**
 * Pesan galat di BAWAH kolom isian yang kosong/salah — pengganti tombol Simpan
 * yang dulu MATI tanpa penjelasan (13 Sep 2026, temuan audit Web Interface
 * Guidelines). Tombol mati tak mengatakan apa pun: bendahara menekan, tak
 * terjadi apa-apa, dan satu-satunya petunjuk (toast "Nama anggota wajib diisi")
 * justru tak pernah bisa muncul karena tombolnya tak bisa ditekan.
 *
 * Pasangkan dgn `aria-invalid` + `aria-describedby={id}` di kolomnya, lalu
 * pindahkan fokus ke kolom itu saat submit. Pesannya dibacakan lewat
 * `aria-describedby` saat fokus mendarat — SENGAJA tanpa `role="alert"`, yang
 * akan membacakannya dua kali.
 *
 * Warna = pasangan toast galat (`text-neg` / `rose-400`): permukaan ini hanya
 * lahir saat galat, jadi sapuan kontras mana pun tak pernah merendernya. Ia
 * WAJIB memakai pasangan yang sudah terukur, bukan warna baru.
 *
 * `permukaan="hero"` untuk kolom yang duduk di atas hijau pekat di KEDUA tema
 * (Login). Merah tua `text-neg` di sana praktis tenggelam; tintanya pasangan
 * kotak galat server Login (`rose-200` di keluarga `rose-100` miliknya), jadi
 * tetap tak ada warna baru. Diputuskan di sini, bukan lewat `className` di
 * pemanggil — pelajaran `AvatarPeci`.
 */
export default function GalatKolom({
  id,
  pesan,
  permukaan = 'kartu',
}: {
  id: string;
  pesan: string | null;
  permukaan?: 'kartu' | 'hero';
}) {
  if (!pesan) return null;
  const tinta = permukaan === 'hero' ? 'text-rose-200' : 'text-neg dark:text-rose-400';
  return (
    <p id={id} className={`mt-2 flex items-start gap-1 text-caption font-medium ${tinta}`}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{pesan}</span>
    </p>
  );
}
