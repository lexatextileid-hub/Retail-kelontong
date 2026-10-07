import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { bolehDesimal, satuanJual, singkatan } from './model';

/** Pilih satuan (kecil → besar, harga terlihat). Barang timbang: isi berat. */
export function DialogSatuan({
  produk,
  onPilih,
  onTutup,
}: {
  produk: Produk;
  onPilih: (satuanProdukId: string, qty: number) => void;
  onTutup: () => void;
}) {
  const daftar = satuanJual(produk);
  const timbang = daftar.length === 1 && bolehDesimal(daftar[0].satuanId);
  const [berat, setBerat] = useState('');
  const [pakaiGram, setPakaiGram] = useState(true);

  if (timbang) {
    const s = daftar[0];
    const angkaBerat = Number(berat.replace(',', '.')) || 0;
    const kg = pakaiGram ? angkaBerat / 1000 : angkaBerat;
    const harga = s.hargaJual ?? 0;
    return (
      <Dialog judul={produk.nama} onTutup={onTutup} lebar={420}>
        <p className="teks-pudar" style={{ margin: 0 }}>Barang timbang · {rupiah(harga)} per kg</p>
        <form
          className="tumpuk"
          onSubmit={(e) => {
            e.preventDefault();
            if (kg > 0) onPilih(s.id, Math.round(kg * 1000) / 1000);
          }}
        >
          <div className="baris-isian">
            <label className="isian" style={{ flex: 1 }}>
              Berat
              <input
                id="berat-timbang"
                className="isian__kontrol"
                inputMode="decimal"
                autoFocus
                value={berat}
                onChange={(e) => setBerat(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder={pakaiGram ? 'mis. 250' : 'mis. 0,25'}
              />
            </label>
            <div className="saklar" role="group" aria-label="Satuan berat">
              <button type="button" aria-pressed={pakaiGram} onClick={() => setPakaiGram(true)}>gram</button>
              <button type="button" aria-pressed={!pakaiGram} onClick={() => setPakaiGram(false)}>kg</button>
            </div>
          </div>
          <div className="ringkas-total">
            <span>{kg ? `${kg.toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg × ${rupiah(harga)}` : 'Ketik berat'}</span>
            <strong>{rupiah(kg * harga)}</strong>
          </div>
          <button type="submit" className="tombol tombol--utama tombol--besar" disabled={kg <= 0}>
            Tambah ke keranjang
          </button>
        </form>
      </Dialog>
    );
  }

  return (
    <Dialog judul={produk.nama} onTutup={onTutup} lebar={560}>
      <p className="teks-pudar" style={{ margin: 0 }}>Pilih satuan</p>
      <div className="pilih-satuan">
        {daftar.map((s) => (
          <button key={s.id} type="button" className="pilih-satuan__item" onClick={() => onPilih(s.id, 1)} autoFocus={s === daftar[0]}>
            <span className="pilih-satuan__label">{s.label}</span>
            {produk.metodeHarga === 'bertingkat' ? (
              <span className="pilih-satuan__harga">
                {produk.tingkatHarga
                  .slice()
                  .sort((a, b) => a.mulaiJumlah - b.mulaiJumlah)
                  .map((t) => (
                    <span key={t.mulaiJumlah} style={{ display: 'block' }}>
                      {t.mulaiJumlah > 0 ? `${t.mulaiJumlah}+ ` : ''}
                      {rupiah(t.harga)}
                    </span>
                  ))}
              </span>
            ) : (
              <span className="pilih-satuan__harga">{rupiah(s.hargaJual ?? 0)}</span>
            )}
            {s.isi > 1 && (
              <span className="pilih-satuan__isi">= {s.isi.toLocaleString('id-ID')} {singkatan(produk.satuanDasarId)}</span>
            )}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
