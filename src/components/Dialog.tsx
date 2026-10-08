import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Jendela di atas layar.
 * - Komputer/tablet: di tengah layar, tinggi tidak pernah melebihi layar; hanya isi yang digulir.
 * - HP: muncul dari bawah (lembar bawah).
 * - Saat papan ketik HP muncul, latar mengikuti area layar yang terlihat (visualViewport),
 *   sehingga isian dan tombol utama tetap kelihatan (iOS tidak mengecilkan layout saat keyboard muncul).
 * Tutup dengan Esc atau klik di luar.
 */
export function Dialog({
  judul,
  onTutup,
  children,
  kaki,
  lebar = 480,
}: {
  judul: string;
  onTutup: () => void;
  children: ReactNode;
  /** Bagian bawah yang selalu terlihat (mis. total + tombol utama). */
  kaki?: ReactNode;
  lebar?: number;
}) {
  const latar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [onTutup]);

  useEffect(() => {
    const vv = window.visualViewport;
    const el = latar.current;
    if (!vv || !el) return;
    const sesuaikan = () => {
      el.style.top = `${vv.offsetTop}px`;
      el.style.height = `${vv.height}px`;
    };
    sesuaikan();
    vv.addEventListener('resize', sesuaikan);
    vv.addEventListener('scroll', sesuaikan);
    return () => {
      vv.removeEventListener('resize', sesuaikan);
      vv.removeEventListener('scroll', sesuaikan);
    };
  }, []);

  return (
    <div ref={latar} className="dialog-latar" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={judul} style={{ maxWidth: lebar }}>
        <header className="dialog__kepala">
          <h2>{judul}</h2>
          <button type="button" className="tombol tombol--hantu tombol--kecil" onClick={onTutup} aria-label="Tutup">
            ✕
          </button>
        </header>
        <div className="dialog__isi">{children}</div>
        {kaki && <footer className="dialog__kaki">{kaki}</footer>}
      </section>
    </div>
  );
}
