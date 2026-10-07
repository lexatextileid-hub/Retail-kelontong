import type { HasilHarga } from '../../domain/harga';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { angka, bolehDesimal, satuanJual, singkatan, type BarisKeranjang as Baris } from './model';

export function BarisKeranjang({
  baris,
  produk,
  hasil,
  namaPelanggan,
  punyaDiskon,
  stokSisa,
  onQty,
  onSatuan,
  onDiskon,
  onHapus,
}: {
  baris: Baris;
  produk: Produk;
  hasil: HasilHarga;
  namaPelanggan: string;
  punyaDiskon: boolean;
  stokSisa: number;
  onQty: (q: number) => void;
  onSatuan: (id: string) => void;
  onDiskon: (n: number | undefined) => void;
  onHapus: () => void;
}) {
  const satuan = produk.satuan.find((s) => s.id === baris.satuanProdukId)!;
  const desimal = bolehDesimal(satuan.satuanId);
  const pilihan = satuanJual(produk);
  const sd = singkatan(produk.satuanDasarId);
  const t = hasil.tingkatBerikutnya;
  const dekat = t && t.kurang <= Math.max(1, Math.ceil(t.tingkat.mulaiJumlah * 0.2));
  const kurangStok = hasil.jumlahDasar > stokSisa;

  return (
    <li className="kr-baris">
      <div className="kr-baris__atas">
        <div>
          <div className="kr-baris__nama">{produk.nama}</div>
          <div className="kr-baris__sku">{produk.sku}</div>
        </div>
        <button type="button" className="tombol tombol--hantu tombol--kecil" onClick={onHapus} aria-label={`Hapus ${produk.nama}`}>✕</button>
      </div>

      <div className="kr-baris__tengah">
        {pilihan.length > 1 ? (
          <div className="chip-satuan" role="group" aria-label="Satuan">
            {pilihan.map((s) => (
              <button key={s.id} type="button" aria-pressed={s.id === baris.satuanProdukId} onClick={() => onSatuan(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="teks-pudar" style={{ fontSize: 13 }}>{satuan.label}</span>
        )}
        <div className="stepper">
          {!desimal && (
            <button type="button" onClick={() => onQty(baris.qty - 1)} aria-label="Kurangi">−</button>
          )}
          <input
            aria-label="Jumlah"
            inputMode={desimal ? 'decimal' : 'numeric'}
            value={angka(baris.qty)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\./g, '').replace(',', '.'));
              if (!Number.isNaN(n)) onQty(n);
            }}
          />
          {!desimal && (
            <button type="button" onClick={() => onQty(baris.qty + 1)} aria-label="Tambah">+</button>
          )}
        </div>
      </div>

      <div className="kr-baris__harga">
        <span className="teks-pudar">
          {angka(baris.qty)} {desimal ? sd : satuan.label} × {rupiah(hasil.hargaSatuan)}
          {produk.metodeHarga === 'bertingkat' && hasil.tingkat && hasil.tingkat.mulaiJumlah > 0 && (
            <span className="lencana" style={{ marginLeft: 6 }}>harga {hasil.tingkat.mulaiJumlah}+</span>
          )}
        </span>
        <strong>{rupiah(hasil.bruto)}</strong>
      </div>

      {dekat && t && (
        <div className="catatan catatan--info">
          Tambah {angka(t.kurang)} {sd} lagi, harga jadi {rupiah(t.tingkat.harga)}/{sd}
        </div>
      )}

      {punyaDiskon && (
        <div className="kr-diskon">
          <label htmlFor={`diskon-${baris.id}`}>Diskon {namaPelanggan}</label>
          <div className="input-rp input-rp--kecil">
            <span aria-hidden="true">−Rp</span>
            <input
              id={`diskon-${baris.id}`}
              inputMode="numeric"
              value={hasil.diskon ? hasil.diskon.toLocaleString('id-ID') : '0'}
              onChange={(e) => onDiskon(Number(e.target.value.replace(/\D/g, '')) || 0)}
            />
          </div>
          {hasil.diskonDiubah && (
            <button type="button" className="tautan" onClick={() => onDiskon(undefined)}>
              diubah · saran {rupiah(hasil.diskonSaran)}
            </button>
          )}
        </div>
      )}

      {kurangStok && (
        <div className="catatan catatan--peringatan">
          Stok di sistem tinggal {angka(Math.max(0, stokSisa))} {sd}. Penjualan tetap jalan; admin akan diminta cek faktur barang ini.
        </div>
      )}
    </li>
  );
}
