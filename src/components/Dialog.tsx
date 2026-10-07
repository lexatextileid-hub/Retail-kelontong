import { useEffect, type ReactNode } from 'react';

/** Jendela di atas layar. Tutup dengan tombol Esc atau klik di luar. */
export function Dialog({
  judul,
  onTutup,
  children,
  lebar = 480,
}: {
  judul: string;
  onTutup: () => void;
  children: ReactNode;
  lebar?: number;
}) {
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup();
    };
    window.addEventListener('keydown', tekan);
    return () => window.removeEventListener('keydown', tekan);
  }, [onTutup]);

  return (
    <div className="dialog-latar" onMouseDown={(e) => e.target === e.currentTarget && onTutup()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={judul} style={{ maxWidth: lebar }}>
        <header className="dialog__kepala">
          <h2>{judul}</h2>
          <button type="button" className="tombol tombol--hantu tombol--kecil" onClick={onTutup} aria-label="Tutup">
            ✕
          </button>
        </header>
        <div className="dialog__isi">{children}</div>
      </section>
    </div>
  );
}
