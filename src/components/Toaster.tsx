import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';
import { durasiTampil, subscribeToast, subscribeUmum, type ToastItem } from '../lib/toast';
import { haptic } from '../lib/utils';

const STYLES = {
  success: { icon: Check, ring: 'ring-emerald-200 dark:ring-emerald-800/50', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertCircle, ring: 'ring-rose-200 dark:ring-rose-800/50', dot: 'bg-rose-500', text: 'text-neg dark:text-rose-400' },
  info: { icon: Info, ring: 'ring-gray-200 dark:ring-gray-700', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-300' },
} as const;

const EXIT_MS = 200; // selaras durasi .toast-out

/* Jam per toast yang bisa DIJEDA. `mulai` null = sedang dijeda. */
type Jam = {
  sisa: number;
  mulai: number | null;
  pewaktu: ReturnType<typeof setTimeout> | null;
  pemicu: Element | null;
  onExpire?: () => void;
};

/* Tujuan fokus yang sah: masih di dokumen, terlihat, aktif, dan tak berada di
   balik lapisan `inert`/`aria-hidden` yang terbuka sesudahnya. */
function bisaDifokus(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el !== document.body && el.isConnected
    && el.getClientRects().length > 0 && !el.closest('[inert],[aria-hidden="true"]')
    && !(el as HTMLButtonElement).disabled;
}

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  /* Pengumuman untuk pembaca layar SENGAJA dipisah dari toast yang terlihat.
     Sebelumnya `role="status"` menempel di wadah toast yang baru DIRENDER saat
     toast pertama muncul — pembaca layar butuh region-nya sudah ada di DOM
     SEBELUM isinya berubah, jadi VoiceOver/TalkBack sering diam sama sekali:
     bendahara menekan simpan lalu hening, tak ada cara tahu berhasil.
     Dipisah juga melindungi dari dua hal lain: animasi keluar mencabut teks di
     tengah pembacaan, dan galat yang butuh `assertive` tak bisa dibedakan
     kalau semua toast berbagi satu region `polite`. */
  const [umumSopan, setUmumSopan] = useState('');
  const [umumPenting, setUmumPenting] = useState('');
  // id toast yg sedang memainkan exit (slide naik + fade) sebelum dilepas.
  // id = number (counter di lib/toast) — Set<number> selaras dgn ToastItem.id.
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  /* ── Toast BERHENTI selama dipegang (WCAG §2.2.1) ────────────────────────
     Dulu hitung mundur jalan terus saat kursor di atas toast atau fokus di
     tombol "Urungkan": habis waktu, aksi yang mau dibatalkan justru DIJALANKAN
     di bawah jari pengguna, dan tombol yang difokus lenyap → fokus jatuh ke
     <body>. Semua toast dijeda bersama selama kursor ATAU fokus ada di
     tumpukan, dan jalan lagi dgn SISA waktunya saat keduanya pergi (pola
     Gmail/Sonner). Kursor sentuh sengaja tak dihitung: di HP ketukan langsung
     beraksi, dan `:hover` iOS yang nyangkut akan menahan toast selamanya.
     Dijaga `audit:toast` T1 & T2. */
  const jam = useRef(new Map<number, Jam>());
  const dipegang = useRef({ kursor: false, fokus: false });
  const tumpukan = useRef<HTMLDivElement>(null);
  /* Fokus TERAKHIR di luar tumpukan — cadangan kalau pemicu toast sudah hilang
     (mis. tombol konfirmasi hapus yang ikut tertutup bersama dialognya). */
  const fokusLuar = useRef<Element | null>(null);

  const ditahan = () => dipegang.current.kursor || dipegang.current.fokus;

  const jalankan = (id: number, j: Jam) => {
    j.mulai = Date.now();
    j.pewaktu = setTimeout(() => dismiss(id, j.onExpire), j.sisa);
  };

  const pegang = (sumber: 'kursor' | 'fokus', nilai: boolean) => {
    if (dipegang.current[sumber] === nilai) return;
    dipegang.current[sumber] = nilai;
    const tahan = ditahan();
    for (const [id, j] of jam.current) {
      if (tahan && j.mulai !== null) {
        if (j.pewaktu) clearTimeout(j.pewaktu);
        j.sisa = Math.max(0, j.sisa - (Date.now() - j.mulai));
        j.mulai = null;
        j.pewaktu = null;
      } else if (!tahan && j.mulai === null) {
        jalankan(id, j);
      }
    }
  };

  // Tandai keluar → mainkan .toast-out → lepas dari DOM setelah animasi selesai.
  const dismiss = (id: number, after?: () => void) => {
    const j = jam.current.get(id);
    if (j?.pewaktu) clearTimeout(j.pewaktu);
    jam.current.delete(id);
    /* Fokus PULANG sebelum tombolnya lenyap (§2.4.3): ke pemicu toast kalau
       masih ada, ke fokus terakhir di luar tumpukan kalau tidak. Tanpa ini
       "Urungkan" yang ditekan papan ketik meninggalkan pengguna di <body>.
       Memindah fokus memicu `focusout` tumpukan → `pegang('fokus', false)`. */
    const aktif = document.activeElement;
    if (aktif?.closest(`[data-toast="${id}"]`)) {
      const tujuan = [j?.pemicu ?? null, fokusLuar.current].find(bisaDifokus);
      if (tujuan) tujuan.focus();
      else (aktif as HTMLElement).blur();
    }
    setLeaving((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      setLeaving((prev) => { const n = new Set(prev); n.delete(id); return n; });
      after?.();
      /* Toast yang DICABUT di bawah kursor tak pernah mengirim `pointerleave`,
         jadi "kursor memegang" bisa nyangkut dan menahan toast berikutnya
         selamanya. Periksa ulang dari keadaan nyata sesudah DOM diperbarui. */
      requestAnimationFrame(() => {
        if (dipegang.current.kursor && !tumpukan.current?.matches(':hover')) pegang('kursor', false);
      });
    }, EXIT_MS);
  };

  /* Kosongkan dulu baru isi: teks yang SAMA persis dua kali tidak mengubah DOM,
     dan region live yang tak berubah tidak diumumkan ulang. */
  const umumkan = (pesan: string, penting: boolean) => {
    const set = penting ? setUmumPenting : setUmumSopan;
    set('');
    setTimeout(() => set(pesan), 60);
  };

  useEffect(() => {
    const catat = (e: FocusEvent) => {
      const t = e.target as Element | null;
      if (t && !t.closest?.('[data-toast-tumpuk]')) fokusLuar.current = t;
    };
    document.addEventListener('focusin', catat);
    const semua = jam.current;
    const lepas = subscribeToast((t) => {
      haptic(8);
      setItems((prev) => [...prev, t]);
      /* Toast beraksi (mis. "Urungkan") menutup diri sendiri. Pemakai pembaca
         layar tak melihatnya, jadi keberadaan tombol itu harus ikut diucapkan —
         kalau tidak, jalan untuk membatalkan absensi massal lewat begitu saja
         tanpa pernah diketahui. */
      umumkan(t.actionLabel ? `${t.message}. Tombol ${t.actionLabel} tersedia.` : t.message, t.type === 'error');
      // commit ditunda (guard di lib/toast mencegah jalan bila sudah di-undo)
      const j: Jam = { sisa: durasiTampil(t), mulai: null, pewaktu: null, pemicu: document.activeElement, onExpire: t.onExpire };
      semua.set(t.id, j);
      if (!ditahan()) jalankan(t.id, j);
    });
    return () => {
      lepas();
      document.removeEventListener('focusin', catat);
      for (const j of semua.values()) if (j.pewaktu) clearTimeout(j.pewaktu);
      semua.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- berlangganan SEKALI; fungsi di atas hanya membaca ref & setter stabil
  }, []);

  // Pengumuman tanpa toast terlihat (`umumkanSaja`) memakai region yang SAMA.
  useEffect(() => subscribeUmum((pesan, penting) => umumkan(pesan, penting)), []);

  const handleAction = (t: ToastItem) => {
    haptic(12);
    dismiss(t.id, () => t.onAction?.());
  };

  return (
    <>
      {/* Region live PERMANEN — harus tetap terpasang meski tak ada toast.
          Jangan gabungkan lagi ke wadah toast di bawah. */}
      <p className="sr-only" role="status" aria-live="polite">{umumSopan}</p>
      <p className="sr-only" role="alert" aria-live="assertive">{umumPenting}</p>
      {items.length > 0 && (
        <ToastStack
          items={items}
          leaving={leaving}
          onAction={handleAction}
          tumpukanRef={tumpukan}
          onPegang={pegang}
        />
      )}
    </>
  );
}

function ToastStack({
  items, leaving, onAction, tumpukanRef, onPegang,
}: {
  items: ToastItem[];
  leaving: Set<number>;
  onAction: (t: ToastItem) => void;
  tumpukanRef: RefObject<HTMLDivElement>;
  onPegang: (sumber: 'kursor' | 'fokus', nilai: boolean) => void;
}) {
  /* Tumpukan dilepas = tak ada lagi yang bisa dipegang (kursor tak sempat
     `leave`). Deps KOSONG disengaja: `onPegang` lahir ulang tiap render, dan
     efek ber-dep akan menjalankan cleanup-nya — melepas pegangan — setiap kali
     toast baru datang. Versi pertama melakukan persis itu. `onPegang` hanya
     membaca ref, jadi salinan dari render pertama tetap benar. */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { onPegang('kursor', false); onPegang('fokus', false); }, []);
  return (
    <div
      ref={tumpukanRef}
      data-toast-tumpuk=""
      onPointerEnter={(e) => { if (e.pointerType !== 'touch') onPegang('kursor', true); }}
      onPointerLeave={(e) => { if (e.pointerType !== 'touch') onPegang('kursor', false); }}
      onFocus={() => onPegang('fokus', true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onPegang('fokus', false); }}
      /* Sengaja TANPA role/aria-live: pengumuman sudah ditangani region live
         permanen di atas. Wadah ini konten biasa, jadi tak diumumkan otomatis
         (tak ada pembacaan dobel) tapi tombol aksinya tetap bisa dijelajahi. */
      className="fixed left-1/2 z-toast flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{
        top: 'calc(env(safe-area-inset-top) + 12px)',
        // translate3d + backface-hidden + will-change: paksa layer GPU stabil —
        // tanpa ini elemen fixed ber-backdrop-filter bisa "melompat" di iOS
        // Safari saat address bar muncul/sembunyi (fix yg sama dgn BottomNav).
        transform: 'translate3d(-50%, 0, 0)',
        willChange: 'transform',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {items.map((t) => {
        const s = STYLES[t.type];
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            data-toast={t.id}
            className={`${leaving.has(t.id) ? 'toast-out' : 'toast-in'} pointer-events-auto flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md ring-1 ${s.ring}`}
            style={{ boxShadow: 'var(--shadow-float)' }}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.dot}`}>
              <Icon className="w-3.5 h-3.5 text-white" />
            </span>
            <p className="flex-1 text-body font-semibold text-gray-800 dark:text-gray-100">{t.message}</p>
            {t.actionLabel && (
              <button
                onClick={() => onAction(t)}
                className="press shrink-0 -mr-1 px-3 py-2 rounded-xl text-body font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
