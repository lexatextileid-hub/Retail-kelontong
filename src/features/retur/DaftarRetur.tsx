import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToko, type Retur } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { namaPelanggan } from '../pesanan/bersama';
import { DialogStrukRetur, teksCara } from './DialogRetur';
import '../../styles/pesanan.css';
import '../../styles/kasbon.css';

export function DaftarRetur() {
  const { retur } = useToko();
  const [buka, setBuka] = useState<Retur | null>(null);
  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <p className="teks-pudar" style={{ margin: 0 }}>Semua retur dari pembeli, terbaru di atas.</p>
        <Link to="../baru" className="tombol tombol--utama">+ Retur baru</Link>
      </div>
      {retur.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Belum ada retur</h2>
          <p className="teks-pudar">Retur dibuat dari nota (Riwayat atau ketik nomor nota), dari pesanan, atau tanpa nota dengan PIN pemilik.</p>
        </div>
      ) : (
        <div className="kartu rw-daftar">
          {retur.map((r) => (
            <button key={r.id} type="button" className="rw-baris" onClick={() => setBuka(r)}>
              <span className="rw-baris__kiri">
                <span className="rw-baris__nomor">
                  <strong>{r.nomor}</strong>
                  {r.pengecualian && <span className="chip-status chip-status--kuning">Pengecualian</span>}
                  {r.tukar.length > 0 && <span className="chip-status chip-status--biru">Tukar barang</span>}
                </span>
                <span className="teks-pudar">
                  {r.waktu} · {namaPelanggan(r.pelangganId)} · {r.nomorAsal ? `dari ${r.nomorAsal}` : 'tanpa nota'} · {teksCara(r)}
                </span>
              </span>
              <strong className="rw-baris__nilai">{rupiah(r.nilaiRetur)}</strong>
            </button>
          ))}
        </div>
      )}
      {buka && <DialogStrukRetur retur={buka} onTutup={() => setBuka(null)} />}
    </div>
  );
}
