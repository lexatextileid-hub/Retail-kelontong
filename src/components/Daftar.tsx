import { useState, type ReactNode } from 'react';
import '../styles/pesanan.css';
import '../styles/penjualan.css';
import '../styles/kasbon.css';

/**
 * Pola halaman daftar yang seragam di seluruh aplikasi (gaya akuntansi):
 * BilahAtas (tab/aksi kiri, tombol utama kanan) → KartuRingkas → KotakFilter → TabelDaftar (dengan baris total).
 */

export function BilahAtas({ kiri, kanan }: { kiri?: ReactNode; kanan?: ReactNode }) {
  return (
    <div className="ps-atas">
      <div className="lc-aksi">{kiri}</div>
      {kanan && <div className="baris-tombol">{kanan}</div>}
    </div>
  );
}

export interface ItemRingkas {
  judul: string;
  nilai: ReactNode;
  catatan?: ReactNode;
  warna?: 'merah' | 'utama';
  aktif?: boolean;
  onKlik?: () => void;
}

export function KartuRingkas({ item }: { item: ItemRingkas[] }) {
  return (
    <div className="kk-ringkas" style={{ gridTemplateColumns: `repeat(${Math.min(item.length, 4)}, minmax(0, 1fr))` }}>
      {item.map((x) => {
        const kelas = `kartu kb-angka ${x.warna === 'merah' ? 'kb-angka--merah' : ''} ${x.warna === 'utama' ? 'kk-utama' : ''} ${x.aktif ? 'bd-aktif' : ''}`;
        const isi = (
          <>
            <span className="teks-pudar">{x.judul}</span>
            <strong>{x.nilai}</strong>
            {x.catatan && <span className="teks-pudar">{x.catatan}</span>}
          </>
        );
        return x.onKlik ? (
          <button key={x.judul} type="button" className={`${kelas} kk-klik`} onClick={x.onKlik}>{isi}</button>
        ) : (
          <div key={x.judul} className={kelas}>{isi}</div>
        );
      })}
    </div>
  );
}

/**
 * Bilah alat daftar (pola Accurate): kotak cari + tombol Filter + aksi utama dalam satu baris.
 * Panel filter tertutup secara bawaan supaya layar tidak penuh; isinya tetap terpasang (hanya disembunyikan)
 * supaya pilihan filter tidak hilang. Saat tertutup, ringkasan filter aktif tampil di sebelah tombol.
 */
export function KotakFilter({ children, ringkas, cari, aksi }: {
  children?: ReactNode;
  ringkas?: ReactNode;
  cari?: { nilai: string; onUbah: (s: string) => void; placeholder: string };
  aksi?: ReactNode;
}) {
  const kunci = `tokoku.filter.${typeof location !== 'undefined' ? location.hash.split('?')[0] : ''}`;
  const [buka, setBuka] = useState<boolean>(() => {
    try { return localStorage.getItem(kunci) === '1'; } catch { return false; }
  });
  const ubah = () => setBuka((b) => {
    try { localStorage.setItem(kunci, b ? '0' : '1'); } catch { /* abaikan */ }
    return !b;
  });
  return (
    <div className="kf">
      <div className="kf__bilah">
        {cari && (
          <label className="pj__cari-kotak kf__cari">
            <span className="sr">Cari</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input value={cari.nilai} onChange={(e) => cari.onUbah(e.target.value)} placeholder={cari.placeholder} autoComplete="off" />
          </label>
        )}
        {children && (
          <button type="button" className={`tombol kf__tombol ${buka ? 'kf__tombol--aktif' : ''}`} aria-expanded={buka} onClick={ubah}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4-2v-4z" /></svg>
            Filter <span aria-hidden="true">{buka ? '▴' : '▾'}</span>
          </button>
        )}
        {!buka && ringkas && <span className="kf__ringkas" title={typeof ringkas === 'string' ? ringkas : undefined}>{ringkas}</span>}
        {aksi && <div className="kf__aksi">{aksi}</div>}
      </div>
      {children && <div className="kartu kf__panel tumpuk" style={buka ? undefined : { display: 'none' }}>{children}</div>}
    </div>
  );
}

/** Baris tombol pilihan (status, jenis) dengan jumlah. */
export function PilihanChip<K extends string>({ pilihan, nilai, onUbah, label }: {
  pilihan: { k: K; judul: string; jumlah?: number }[]; nilai: K; onUbah: (k: K) => void; label: string;
}) {
  return (
    <div className="pj__kategori pj__kategori--bungkus" role="group" aria-label={label}>
      {pilihan.map((x) => (
        <button key={x.k} type="button" aria-pressed={nilai === x.k} onClick={() => onUbah(x.k)}>
          {x.judul}{x.jumlah !== undefined && <span className="ps-hitung">{x.jumlah}</span>}
        </button>
      ))}
    </div>
  );
}

export interface Kolom<T> {
  judul: string;
  isi: (t: T) => ReactNode;
  kanan?: boolean;
  /** Isi sel baris total (opsional). */
  total?: ReactNode;
  lebar?: number;
  /** Boleh membungkus teks (keterangan panjang). */
  bungkus?: boolean;
}

export function TabelDaftar<T>({ kolom, data, kunci, onKlik, kosong, labelTotal = 'Total' }: {
  kolom: Kolom<T>[]; data: T[]; kunci: (t: T) => string; onKlik?: (t: T) => void; kosong: ReactNode; labelTotal?: string;
}) {
  if (data.length === 0) return <div className="kartu ps-kosong-besar">{kosong}</div>;
  const adaTotal = kolom.some((k) => k.total !== undefined);
  const awalTotal = kolom.findIndex((k) => k.total !== undefined);
  return (
    <div className="kartu bd-tabel-kartu">
      <table className="ps-tabel ps-tabel--hp bd-tabel">
        <thead>
          <tr>{kolom.map((k) => <th key={k.judul} className={k.kanan ? 'kanan' : undefined} style={k.lebar ? { width: k.lebar } : undefined}>{k.judul}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={kunci(t)} onClick={onKlik ? () => onKlik(t) : undefined} style={onKlik ? undefined : { cursor: 'default' }}>
              {kolom.map((k) => (
                <td key={k.judul} data-label={k.judul} className={[k.kanan ? 'kanan' : '', k.bungkus ? 'bd-bungkus' : ''].join(' ').trim() || undefined}>{k.isi(t)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {adaTotal && (
          <tfoot>
            <tr>
              <td colSpan={awalTotal} className="kanan"><strong>{labelTotal}</strong></td>
              {kolom.slice(awalTotal).map((k) => <td key={k.judul} className={k.kanan ? 'kanan' : undefined}>{k.total !== undefined ? <strong>{k.total}</strong> : null}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** Teks utama + baris kecil di bawahnya dalam satu sel. */
export const Sel = ({ utama, bawah }: { utama: ReactNode; bawah?: ReactNode }) => (
  <>{utama}{bawah && <div className="teks-pudar" style={{ fontSize: 12 }}>{bawah}</div>}</>
);
