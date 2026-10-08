import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import type { Retur } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilProduk } from '../penjualan/model';
import { labelDasar, labelJumlah, namaPelanggan } from '../pesanan/bersama';

export const teksCara = (r: Pick<Retur, 'cara' | 'selisih' | 'bank'>) => {
  if (r.cara === 'pas' || r.selisih === 0) return 'Pas, tanpa uang';
  const kembali = r.selisih > 0;
  switch (r.cara) {
    case 'tunai': return kembali ? 'Uang kembali tunai' : 'Pelanggan tambah tunai';
    case 'transfer': return `${kembali ? 'Uang kembali transfer' : 'Pelanggan tambah transfer'}${r.bank ? ` ${r.bank}` : ''}`;
    case 'kasbon': return kembali ? 'Potong kasbon' : 'Tambah kasbon';
    case 'tagihan-pesanan': return 'Potong tagihan pesanan';
  }
};

/** Bukti retur (thermal): barang kembali, barang tukar, selisih. */
export function DialogStrukRetur({ retur: r, onTutup, judul }: { retur: Retur; onTutup: () => void; judul?: string }) {
  const [info, setInfo] = useState('');
  return (
    <Dialog
      judul={judul ?? `Retur ${r.nomor}`}
      onTutup={onTutup}
      lebar={420}
      kaki={
        <>
          <div className="baris-tombol">
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti retur masuk antrian stasiun printer.')}>Cetak</button>
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, bukti diunduh sebagai gambar/PDF.')}>Unduh</button>
          </div>
          {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
          <button type="button" className="tombol tombol--utama tombol--besar" onClick={onTutup}>Selesai</button>
        </>
      }
    >
      <div className="struk" aria-label="Pratinjau bukti retur">
        <div className="struk__tengah">
          <strong>[Nama Toko]</strong>
          <div>[Alamat toko] · [No. HP]</div>
        </div>
        <div className="struk__garis" />
        <div className="struk__tengah struk__tebal">BUKTI RETUR</div>
        <div>{r.nomor} · {r.waktu}</div>
        <div>Pelanggan: {namaPelanggan(r.pelangganId)} · {r.oleh}</div>
        <div>{r.nomorAsal ? `Dari ${r.nomorAsal}` : 'Tanpa nota'}</div>
        <div className="struk__garis" />
        <div className="struk__tebal">Barang kembali</div>
        {r.baris.map((b, i) => (
          <div key={i}>
            <div>{ambilProduk(b.produkId).nama} ({b.kondisi})</div>
            <div className="struk__baris"><span>  {labelDasar(b.produkId, b.jumlahDasar)}</span><span>{rupiah(b.nilai)}</span></div>
          </div>
        ))}
        <div className="struk__baris struk__tebal"><span>Nilai retur</span><span>{rupiah(r.nilaiRetur)}</span></div>
        {r.tukar.length > 0 && (
          <>
            <div className="struk__garis" />
            <div className="struk__tebal">Barang pengganti</div>
            {r.tukar.map((t, i) => (
              <div key={i}>
                <div>{ambilProduk(t.produkId).nama}</div>
                <div className="struk__baris"><span>  {labelJumlah(t.produkId, t.satuanProdukId, t.qty)}</span><span>{rupiah(t.netto)}</span></div>
              </div>
            ))}
            <div className="struk__baris struk__tebal"><span>Nilai pengganti</span><span>{rupiah(r.nilaiTukar)}</span></div>
          </>
        )}
        <div className="struk__garis" />
        <div className="struk__baris struk__tebal">
          <span>{r.selisih > 0 ? 'KEMBALI KE PELANGGAN' : r.selisih < 0 ? 'PELANGGAN TAMBAH' : 'SELISIH'}</span>
          <span>{rupiah(Math.abs(r.selisih))}</span>
        </div>
        <div>{teksCara(r)}</div>
        <div>Alasan: {r.alasan}</div>
        {r.pengecualian && <div>Pengecualian: {r.pengecualian}</div>}
        <div className="struk__garis" />
        <div>Disetujui pemilik: ______________</div>
      </div>
    </Dialog>
  );
}
