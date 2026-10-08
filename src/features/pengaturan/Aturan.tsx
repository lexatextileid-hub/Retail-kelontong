import { useState } from 'react';
import { aturAturanRetur, useToko } from '../../data/toko';
import '../../styles/pesanan.css';

/** Aturan toko yang bisa diatur pemilik. Bagian lain (potongan, target untung, susut) menyusul. */
export function Aturan() {
  const { aturanRetur, peran } = useToko();
  const [a, setA] = useState(aturanRetur);
  const [info, setInfo] = useState('');
  const boleh = peran === 'pemilik';
  const berubah = JSON.stringify(a) !== JSON.stringify(aturanRetur);
  return (
    <div className="ps-halaman" style={{ maxWidth: 760 }}>
      {!boleh && <p className="catatan catatan--peringatan">Hanya pemilik yang bisa mengubah aturan.</p>}
      <div className="kartu tumpuk">
        <h2>Retur dari pembeli</h2>
        <label className="isian">
          Batas waktu retur (hari × 24 jam)
          <input className="isian__kontrol" style={{ maxWidth: 160 }} inputMode="numeric" disabled={!boleh} value={a.batasHari || ''}
            onChange={(e) => setA({ ...a, batasHari: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
          <span className="isian__bantuan">Dihitung dari jam di nota. Bawaan 3 (3×24 jam).</span>
        </label>
        <label className="centang">
          <input type="checkbox" disabled={!boleh} checked={a.lewatBatasDenganPin} onChange={(e) => setA({ ...a, lewatBatasDenganPin: e.target.checked })} />
          Lewat batas waktu masih bisa diretur dengan PIN pemilik (pengecualian)
        </label>
        <label className="centang">
          <input type="checkbox" disabled={!boleh} checked={a.tanpaNotaDenganPin} onChange={(e) => setA({ ...a, tanpaNotaDenganPin: e.target.checked })} />
          Tanpa nota masih bisa diretur dengan PIN pemilik (harga jual sekarang)
        </label>
        <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
          Setiap retur tetap perlu PIN pemilik. Pengecualian tercatat di bukti retur dan daftar retur.
        </p>
        <button type="button" className="tombol tombol--utama" style={{ alignSelf: 'flex-start' }} disabled={!boleh || !berubah || a.batasHari < 1}
          onClick={() => { aturAturanRetur(a); setInfo('Aturan retur tersimpan.'); }}>
          Simpan aturan retur
        </button>
        {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
      </div>
      <div className="kartu tumpuk">
        <h2>Aturan lain</h2>
        <p className="teks-pudar" style={{ margin: 0 }}>Potongan Rp 500 / Rp 10.000, target untung 5%, batas susut repack: menyusul di halaman ini.</p>
      </div>
    </div>
  );
}
