import { ArrowLeft, BookOpen, Coins, Users, Link2, Heart, ShieldCheck } from 'lucide-react';
import { useBackDismiss } from '../hooks/useBackDismiss';
import { useDialog } from '../hooks/useDialog';
import { haptic } from '../lib/utils';
import AvatarPeci from '../components/AvatarPeci';
import logoRt from '../assets/logo-rt.svg';

interface Props {
  open: boolean;
  onClose: () => void;
}

const IURAN = [
  { b: 'Anggota non-Sohibul Bait', t: 'bayar Rp50.000 per tarikan = Rp45.000 (untuk Sohibul Bait) + Rp5.000 (untuk Kas)' },
  { b: 'Sohibul Bait', t: 'tidak bayar, menerima total = (N−1) × Rp45.000' },
  { b: 'Tidak hadir / belum bayar', t: 'ditalangi panitia Rp50.000, dicatat di Talangan Anggota' },
  { b: 'Titip', t: 'dianggap bayar (tidak ditalangi)' },
];

const PENGURUS = [
  { jabatan: 'Ketua RT', nama: "Saman Ma'arif" },
  { jabatan: 'Sekretaris', nama: 'M. Aryanto' },
  { jabatan: 'Bendahara', nama: 'Irwansyah' },
];

const SUMBER = [
  { b: 'Master Anggota', t: '70 KK aktif RT 004/006' },
  { b: 'Spreadsheet Hadiran', t: 'Jadwal, Absensi, Kas, Talangan' },
  { b: 'Spreadsheet Laporan Kas RT', t: 'sinkron real-time; sumber dana setoran = Iuran Anggota Hadiran' },
];

const KEAMANAN = [
  { b: 'Hanya Bendahara yang bisa mengubah data', t: 'penambahan, perubahan & penghapusan dikunci di level database (Supabase RLS) untuk akun Bendahara terverifikasi — warga tidak bisa mengubah apa pun' },
  { b: 'Warga hanya bisa melihat (read-only)', t: 'mode warga dibuat untuk transparansi: lihat saldo, jadwal & talangan, tanpa akses ubah' },
  { b: 'Setiap perubahan tercatat', t: 'fitur Riwayat Aktivitas menyimpan jejak siapa mengubah apa & kapan, sehingga setiap tindakan dapat ditelusuri' },
  { b: 'Transparan secara sengaja', t: 'kas RT memang terbuka untuk seluruh warga — keterbukaan ini tujuan, bukan kebocoran' },
];

function Section({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800/60 lift p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </span>
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function TentangApp({ open, onClose }: Props) {
  useBackDismiss(open, onClose);
  const dlg = useDialog(open, { onClose, label: 'Tentang aplikasi' });
  if (!open) return null;

  return (
    <div ref={dlg.panelRef} {...dlg.panelProps} className="fixed inset-0 z-50 bg-sunken dark:bg-gray-950 page-in-right overflow-y-auto">
      <header
        className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-line dark:border-gray-800"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-2 max-w-lg mx-auto px-4 py-3">
          <button
            onClick={() => { haptic(); onClose(); }}
            className="press w-11 h-11 flex items-center justify-center -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">Tentang Aplikasi</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        {/* Hero */}
        <div className="text-center pt-2 pb-1">
          <img src={logoRt} alt="Logo RT 004/006" className="w-20 h-20 rounded-3xl object-cover mx-auto mb-3 lift ring-1 ring-black/[0.08] dark:ring-white/10" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Hadiran RT</h2>
          <p className="text-caption text-gray-500 dark:text-gray-400 mt-0.5">RT 004/006 · Tanah Baru Beji · Depok</p>
        </div>

        {/* Tentang */}
        <Section icon={BookOpen} title="TENTANG APLIKASI">
          <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300">
            Aplikasi Hadiran RT 004/006 adalah sistem digital untuk mengelola iuran tarikan bergilir antar warga
            (sistem <b>Sohibul Bait</b>), kas hadiran, talangan anggota, serta sinkronisasi setoran ke Kas Besar RT 004/006.
            Tujuannya: <b>transparansi penuh</b> bagi seluruh warga &amp; <b>kemudahan kerja Bendahara</b>.
          </p>
        </Section>

        {/* Logika Iuran */}
        <Section icon={Coins} title="LOGIKA IURAN">
          <ul className="space-y-2.5">
            {IURAN.map((i) => (
              <li key={i.b} className="flex gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300">
                  <b className="text-gray-900 dark:text-gray-100">{i.b}:</b> {i.t}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Pengurus */}
        <Section icon={Users} title="STRUKTUR PENGURUS RT 004/006">
          <div className="space-y-2">
            {PENGURUS.map((p) => (
              <div key={p.jabatan} className="flex items-center gap-3 rounded-2xl inset-soft p-2.5">
                <AvatarPeci nama={p.nama} className="w-10 h-10 rounded-xl" />
                <div className="min-w-0">
                  <p className="text-micro font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{p.jabatan}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.nama}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Sumber Data */}
        <Section icon={Link2} title="SUMBER DATA">
          <ul className="space-y-2.5">
            {SUMBER.map((s) => (
              <li key={s.b} className="flex gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300">
                  <b className="text-gray-900 dark:text-gray-100">{s.b}:</b> {s.t}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Model Keamanan & Data */}
        <Section icon={ShieldCheck} title="MODEL KEAMANAN & DATA">
          <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300 mb-3">
            Keamanan data dirancang sejak awal, bukan tambalan:
          </p>
          <ul className="space-y-2.5">
            {KEAMANAN.map((k) => (
              <li key={k.b} className="flex gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-caption leading-relaxed text-gray-600 dark:text-gray-300">
                  <b className="text-gray-900 dark:text-gray-100">{k.b}:</b> {k.t}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        {/* Footer */}
        <div className="text-center pt-2 pb-1 space-y-1.5">
          <p className="text-micro text-ink-faint dark:text-gray-400">© 2026 RT 004/006 Tanah Baru, Beji, Kota Depok</p>
          <p className="text-caption text-gray-500 dark:text-gray-400 inline-flex items-center justify-center gap-1">
            Dibuat oleh <b className="text-gray-700 dark:text-gray-200">Irwansyah (Bendahara)</b>, untuk warga
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>

        <button
          onClick={() => { haptic(); onClose(); }}
          className="btn-brand w-full min-h-[44px] py-3 font-semibold text-sm"
        >
          Tutup
        </button>
      </main>
    </div>
  );
}
