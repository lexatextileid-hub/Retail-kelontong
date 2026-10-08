import { useToko } from '../../data/toko';
import { ambilProduk } from '../penjualan/model';
import { labelDasar } from '../pesanan/bersama';
import { tanggalPendek } from '../kasbon/bersama';
import '../../styles/pesanan.css';
import '../../styles/kasbon.css';

/** Penampung barang rusak (sementara: dari retur pembeli). Retur ke distributor / buang menyusul. */
export function BarangRusak() {
  const { barangRusak } = useToko();
  return (
    <div className="ps-halaman">
      <p className="teks-pudar" style={{ margin: 0, maxWidth: 720 }}>
        Barang rusak tidak dihitung sebagai stok jual. Nanti dari sini diretur ke distributor atau dibuang (kerugian).
      </p>
      {barangRusak.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Belum ada barang rusak</h2>
          <p className="teks-pudar">Barang retur pembeli yang ditandai rusak masuk ke sini.</p>
        </div>
      ) : (
        <div className="kartu rw-daftar">
          {[...barangRusak].reverse().map((b) => (
            <div key={b.id} className="rw-baris" style={{ cursor: 'default' }}>
              <span className="rw-baris__kiri">
                <strong>{ambilProduk(b.produkId).nama}</strong>
                <span className="teks-pudar">{tanggalPendek(b.tanggal)} · {b.asal}</span>
              </span>
              <strong className="rw-baris__nilai">{labelDasar(b.produkId, b.jumlahDasar)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
