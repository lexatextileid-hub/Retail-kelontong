import type { HasilHarga } from '../../domain/harga';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { angka, bolehDesimal, singkatan, type BarisKeranjang as Baris } from './model';

/** Satu baris keranjang. Ketuk nama/harga untuk membuka pop-up Atur Barang; − / + untuk ubah jumlah cepat. */
export function BarisKeranjang({
  baris,
  produk,
  hasil,
  namaPelanggan,
  stokSisa,
  onQty,
  onUbah,
}: {
  baris: Baris;
  produk: Produk;
  hasil: HasilHarga;
  namaPelanggan: string;
  stokSisa: number;
  onQty: (q: number) => void;
  onUbah: () => void;
}) {
  const satuan = produk.satuan.find((s) => s.id === baris.satuanProdukId)!;
  const timbang = bolehDesimal(satuan.satuanId);
  const sd = singkatan(produk.satuanDasarId);
  const labelUnit = timbang ? 'kg' : satuan.label;
  const kurangStok = hasil.jumlahDasar > stokSisa;

  return (
    <li className="kr-baris">
      <button type="button" className="kr-baris__klik" onClick={onUbah} aria-label={`Ubah ${produk.nama}`}>
        <span className="kr-baris__atas">
          <span className="kr-baris__nama">{produk.nama}</span>
          <strong className="kr-baris__netto">{rupiah(hasil.netto)}</strong>
        </span>
        <span className="kr-baris__rinci">
          {angka(baris.qty)} {labelUnit} × {rupiah(hasil.hargaSatuan)}
          {hasil.hargaDiubah && <span className="lencana lencana--peringatan" style={{ marginLeft: 6 }}>harga diubah</span>}
          {produk.metodeHarga === 'bertingkat' && hasil.tingkat && hasil.tingkat.mulaiJumlah > 0 && (
            <span className="lencana" style={{ marginLeft: 6 }}>harga {hasil.tingkat.mulaiJumlah}+</span>
          )}
        </span>
        {hasil.diskon > 0 && (
          <span className="kr-baris__diskon">
            Diskon {baris.diskonManual === undefined ? namaPelanggan : ''} −{rupiah(hasil.diskon)}
            {baris.diskonManual !== undefined && hasil.diskonSaran > 0 && hasil.diskonDiubah && (
              <span className="lencana lencana--peringatan" style={{ marginLeft: 6 }}>diubah</span>
            )}
          </span>
        )}
      </button>

      <div className="kr-baris__bawah">
        <button type="button" className="tautan" onClick={onUbah}>Ubah satuan / diskon</button>
        {timbang ? (
          <button type="button" className="tombol tombol--kecil" onClick={onUbah}>Ubah berat / harga</button>
        ) : (
          <div className="stepper">
            <button type="button" onClick={() => onQty(baris.qty - 1)} aria-label="Kurangi">−</button>
            <input
              aria-label="Jumlah"
              inputMode="numeric"
              value={angka(baris.qty)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ''));
                if (!Number.isNaN(n)) onQty(n);
              }}
            />
            <button type="button" onClick={() => onQty(baris.qty + 1)} aria-label="Tambah">+</button>
          </div>
        )}
      </div>

      {kurangStok && (
        <div className="catatan catatan--peringatan">
          Stok di sistem tinggal {angka(Math.max(0, stokSisa))} {sd}. Penjualan tetap jalan; admin akan diminta cek faktur barang ini.
        </div>
      )}
    </li>
  );
}
