import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tutupSP, useToko, type StatusSP } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilProduk, angka } from '../penjualan/model';
import { ambilDistributor, ChipStatus, totalPerkiraanSP } from '../pesanan/bersama';
import { DialogDokumenSP, DialogTerimaSP } from './DialogSP';
import '../../styles/pesanan.css';

const terbuka: StatusSP[] = ['draf', 'dikirim', 'sebagian'];

/** Daftar Surat Pesanan. `hanyaTerbuka` dipakai di Barang Masuk → Terima dari SP. */
export function DaftarSP({ hanyaTerbuka = false }: { hanyaTerbuka?: boolean }) {
  const { sp } = useToko();
  const [f, setF] = useState<'terbuka' | 'semua'>('terbuka');
  const [dialog, setDialog] = useState<null | { jenis: 'dok' | 'terima'; id: string }>(null);
  const [info, setInfo] = useState('');
  const tampil = sp.filter((x) => (hanyaTerbuka || f === 'terbuka' ? terbuka.includes(x.status) : true));

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        {hanyaTerbuka ? (
          <p className="teks-pudar" style={{ margin: 0, maxWidth: 720 }}>
            Barang datang dari distributor? Pilih Surat Pesanannya, lalu catat faktur sesuai barang yang benar-benar diterima.
          </p>
        ) : (
          <div className="pj__kategori" role="group" aria-label="Filter">
            <button type="button" aria-pressed={f === 'terbuka'} onClick={() => setF('terbuka')}>Terbuka</button>
            <button type="button" aria-pressed={f === 'semua'} onClick={() => setF('semua')}>Semua</button>
          </div>
        )}
        {!hanyaTerbuka && (
          <div className="baris-tombol">
            <Link to="../saran" className="tombol">Lihat saran</Link>
            <Link to="../baru" className="tombol tombol--utama">+ Buat SP</Link>
          </div>
        )}
      </div>
      {info && <p className="catatan catatan--info">{info}</p>}

      {tampil.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Belum ada Surat Pesanan {hanyaTerbuka || f === 'terbuka' ? 'yang terbuka' : ''}</h2>
          <p className="teks-pudar">Surat Pesanan dibuat dari Saran SP, dari pesanan pelanggan, atau manual lewat Buat SP.</p>
          {hanyaTerbuka && <Link to="/gudang/surat-pesanan/saran" className="tombol tombol--utama" style={{ alignSelf: 'flex-start' }}>Ke Saran SP</Link>}
        </div>
      ) : (
        <div className="ps-grid">
          {tampil.map((x) => {
            const d = ambilDistributor(x.distributorId);
            const sisa = x.baris.filter((b) => !b.diterima);
            return (
              <div key={x.id} className="ps-kartu" style={{ cursor: 'default' }}>
                <span className="ps-kartu__atas">
                  <span className="ps-kartu__nomor">{x.nomor} · {x.dibuat}</span>
                  <ChipStatus status={x.status} />
                </span>
                <strong className="ps-kartu__nama">{d.nama}</strong>
                <ul className="sp-ringkas">
                  {x.baris.map((b) => (
                    <li key={b.id} className={b.diterima ? 'sp-ringkas--selesai' : ''}>
                      {b.produkId ? ambilProduk(b.produkId).nama : <em>{b.permintaan}</em>} · {angka(b.qty)} {b.labelSatuan}
                      {b.diterima && ' ✓'}
                      {b.untukPesanan.length > 0 && <span className="teks-pudar"> · pesanan</span>}
                    </li>
                  ))}
                </ul>
                <span className="ps-kartu__bawah">
                  <span>{rupiah(totalPerkiraanSP(x))}</span>
                  <span className="teks-pudar">{x.faktur.length ? `${x.faktur.length} faktur` : 'perkiraan'}</span>
                </span>
                <div className="baris-tombol">
                  <button type="button" className="tombol tombol--kecil" onClick={() => setDialog({ jenis: 'dok', id: x.id })}>
                    {x.status === 'draf' ? 'Kirim' : 'Lihat'}
                  </button>
                  {terbuka.includes(x.status) && sisa.length > 0 && (
                    <button type="button" className="tombol tombol--kecil tombol--utama" onClick={() => setDialog({ jenis: 'terima', id: x.id })}>Terima barang</button>
                  )}
                  {x.status === 'sebagian' && (
                    <button type="button" className="tombol tombol--kecil tombol--hantu" onClick={() => { tutupSP(x.id); setInfo(`${x.nomor} ditutup, sisa barang dibatalkan.`); }}>Tutup SP</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialog?.jenis === 'dok' && <DialogDokumenSP spId={dialog.id} onTutup={() => setDialog(null)} />}
      {dialog?.jenis === 'terima' && (
        <DialogTerimaSP
          sp={sp.find((x) => x.id === dialog.id)!}
          onTutup={() => setDialog(null)}
          onSelesai={(nomor) => { setDialog(null); setInfo(`Faktur ${nomor} tersimpan. Stok masuk; bagian untuk pesanan pelanggan sudah terkunci.`); }}
        />
      )}
    </div>
  );
}
