import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { hitungHargaBaris } from '../../domain/harga';
import type { DiskonPelanggan, Pelanggan, Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { angka, bolehDesimal, satuanJual, singkatan, type BarisKeranjang } from './model';

export interface HasilAtur {
  satuanProdukId: string;
  qty: number;
  /** Diskon total baris yang diketik kasir; kosong = pakai diskon pelanggan otomatis. */
  diskonManual?: number;
}

type ModeDiskon = 'unit' | 'total';

const keAngka = (t: string) => Number(t.replace(/\./g, '').replace(',', '.')) || 0;

/**
 * Pop-up "Atur Barang": dipakai untuk menambah barang ke keranjang dan mengubah barang di keranjang.
 * Satuan (kecil → besar, harga terlihat) → jumlah (atau berat) → diskon (per item atau total) → total.
 */
export function DialogAturBarang({
  produk,
  pelanggan,
  daftarDiskon,
  awal,
  onSimpan,
  onHapus,
  onTutup,
}: {
  produk: Produk;
  pelanggan: Pelanggan;
  daftarDiskon: DiskonPelanggan[];
  /** Diisi saat mengubah barang yang sudah di keranjang. */
  awal?: BarisKeranjang;
  onSimpan: (h: HasilAtur) => void;
  onHapus?: () => void;
  onTutup: () => void;
}) {
  const daftar = satuanJual(produk);
  const [satuanId, setSatuanId] = useState(awal?.satuanProdukId ?? daftar[0].id);
  const satuan = daftar.find((s) => s.id === satuanId) ?? daftar[0];
  const timbang = bolehDesimal(satuan.satuanId);

  const [pakaiGram, setPakaiGram] = useState(!awal);
  const [teksQty, setTeksQty] = useState(() =>
    awal ? angka(awal.qty) : timbang ? '' : '1',
  );
  const [modeDiskon, setModeDiskon] = useState<ModeDiskon>(awal?.diskonManual !== undefined ? 'total' : 'unit');
  const [teksDiskon, setTeksDiskon] = useState(
    awal?.diskonManual !== undefined ? awal.diskonManual.toLocaleString('id-ID') : '',
  );

  const angkaQty = keAngka(teksQty);
  const qty = timbang ? Math.round((pakaiGram ? angkaQty / 1000 : angkaQty) * 1000) / 1000 : Math.max(0, Math.floor(angkaQty));
  const nilaiDiskon = keAngka(teksDiskon);
  const diskonManual = teksDiskon.trim() === '' ? undefined : modeDiskon === 'unit' ? Math.round(nilaiDiskon * qty) : nilaiDiskon;

  const hasil = qty > 0 ? hitungHargaBaris(produk, satuan.id, qty, pelanggan, daftarDiskon, diskonManual) : null;
  const adaSaran = pelanggan.jenis === 'terdaftar' && daftarDiskon.some((d) => d.pelangganId === pelanggan.id && d.produkId === produk.id);
  const sd = singkatan(produk.satuanDasarId);
  const labelUnit = timbang ? 'kg' : satuan.label.toLowerCase();

  const simpan = () => {
    if (!hasil) return;
    onSimpan({ satuanProdukId: satuan.id, qty, diskonManual });
  };

  const gantiSatuan = (id: string) => {
    setSatuanId(id);
    const s = daftar.find((x) => x.id === id)!;
    if (bolehDesimal(s.satuanId) !== timbang) setTeksQty(bolehDesimal(s.satuanId) ? '' : '1');
  };

  const kaki = (
    <>
      {hasil && (
        <div className="atur-ringkas">
          <div className="ringkas-total">
            <span>{angka(qty)} {labelUnit} × {rupiah(hasil.hargaSatuan)}</span>
            <span>{rupiah(hasil.bruto)}</span>
          </div>
          {hasil.diskon > 0 && (
            <div className="ringkas-total">
              <span>Diskon{diskonManual === undefined ? ` ${pelanggan.nama} (otomatis)` : ''}</span>
              <span>−{rupiah(hasil.diskon)}</span>
            </div>
          )}
          <div className="ringkas-total ringkas-total--besar">
            <span>Total</span>
            <strong>{rupiah(hasil.netto)}</strong>
          </div>
        </div>
      )}
      <div className="atur-tombol">
        {onHapus && (
          <button type="button" className="tombol tombol--bahaya" onClick={onHapus}>Hapus</button>
        )}
        <button type="submit" form="form-atur-barang" className="tombol tombol--utama tombol--besar" disabled={!hasil}>
          {awal ? 'Simpan perubahan' : 'Tambah ke keranjang'}
        </button>
      </div>
    </>
  );

  return (
    <Dialog judul={produk.nama} onTutup={onTutup} lebar={560} kaki={kaki}>
      <form
        id="form-atur-barang"
        className="tumpuk"
        onSubmit={(e) => {
          e.preventDefault();
          simpan();
        }}
      >
        {daftar.length > 1 && (
          <fieldset className="atur-bagian">
            <legend className="label-kecil">Satuan</legend>
            <div className="pilih-satuan" role="radiogroup" aria-label="Satuan">
              {daftar.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={s.id === satuan.id}
                  className="pilih-satuan__item"
                  onClick={() => gantiSatuan(s.id)}
                >
                  <span className="pilih-satuan__label">{s.label}</span>
                  <span className="pilih-satuan__harga">
                    {produk.metodeHarga === 'bertingkat'
                      ? rupiah([...produk.tingkatHarga].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah)[0].harga)
                      : rupiah(s.hargaJual ?? 0)}
                  </span>
                  {s.isi > 1 && <span className="pilih-satuan__isi">= {s.isi.toLocaleString('id-ID')} {sd}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {produk.metodeHarga === 'bertingkat' && (
          <p className="catatan catatan--info">
            Harga bertingkat:{' '}
            {[...produk.tingkatHarga]
              .sort((a, b) => a.mulaiJumlah - b.mulaiJumlah)
              .map((t) => `${t.mulaiJumlah > 0 ? `${t.mulaiJumlah}+ ` : ''}${rupiah(t.harga)}`)
              .join(' · ')}
          </p>
        )}

        <div className="atur-bagian">
          <label htmlFor="atur-jumlah" className="label-kecil">{timbang ? 'Berat' : 'Jumlah'}</label>
          {timbang ? (
            <div className="baris-isian">
              <input
                id="atur-jumlah"
                className="isian__kontrol atur-angka"
                inputMode="decimal"
                autoFocus
                value={teksQty}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTeksQty(e.target.value.replace(/[^\d.,]/g, ''))}
                placeholder={pakaiGram ? 'mis. 250' : 'mis. 0,25'}
              />
              <div className="saklar" role="group" aria-label="Satuan berat">
                <button type="button" aria-pressed={pakaiGram} onClick={() => setPakaiGram(true)}>gram</button>
                <button type="button" aria-pressed={!pakaiGram} onClick={() => setPakaiGram(false)}>kg</button>
              </div>
            </div>
          ) : (
            <div className="stepper stepper--besar">
              <button type="button" onClick={() => setTeksQty(String(Math.max(1, qty - 1)))} aria-label="Kurangi">−</button>
              <input
                id="atur-jumlah"
                inputMode="numeric"
                autoFocus
                value={teksQty}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTeksQty(e.target.value.replace(/\D/g, ''))}
              />
              <button type="button" onClick={() => setTeksQty(String(qty + 1))} aria-label="Tambah">+</button>
            </div>
          )}
          {hasil?.tingkatBerikutnya && hasil.tingkatBerikutnya.kurang <= Math.max(1, Math.ceil(hasil.tingkatBerikutnya.tingkat.mulaiJumlah * 0.2)) && (
            <p className="catatan catatan--info">
              Tambah {angka(hasil.tingkatBerikutnya.kurang)} {sd} lagi, harga jadi {rupiah(hasil.tingkatBerikutnya.tingkat.harga)}/{sd}
            </p>
          )}
        </div>

        <div className="atur-bagian">
          <div className="atur-diskon-kepala">
            <label htmlFor="atur-diskon" className="label-kecil">Diskon</label>
            <div className="saklar saklar--kecil" role="group" aria-label="Cara hitung diskon">
              <button type="button" aria-pressed={modeDiskon === 'unit'} onClick={() => setModeDiskon('unit')}>Per {labelUnit}</button>
              <button type="button" aria-pressed={modeDiskon === 'total'} onClick={() => setModeDiskon('total')}>Total</button>
            </div>
          </div>
          <div className="input-rp">
            <span aria-hidden="true">Rp</span>
            <input
              id="atur-diskon"
              inputMode="numeric"
              value={teksDiskon}
              placeholder={adaSaran && hasil ? `${hasil.diskonSaran.toLocaleString('id-ID')} (otomatis)` : '0'}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '');
                setTeksDiskon(d ? Number(d).toLocaleString('id-ID') : '');
              }}
            />
          </div>
          {modeDiskon === 'unit' && nilaiDiskon > 0 && qty > 0 && (
            <p className="teks-pudar atur-bantu">
              {rupiah(nilaiDiskon)} × {angka(qty)} {labelUnit} = {rupiah(Math.round(nilaiDiskon * qty))}
            </p>
          )}
          {adaSaran && teksDiskon === '' && (
            <p className="teks-pudar atur-bantu">Kosongkan untuk memakai diskon khusus {pelanggan.nama}.</p>
          )}
          {adaSaran && teksDiskon !== '' && (
            <button type="button" className="tautan" style={{ alignSelf: 'flex-start' }} onClick={() => setTeksDiskon('')}>
              Kembali ke diskon {pelanggan.nama} ({hasil ? rupiah(hasil.diskonSaran) : '-'})
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
