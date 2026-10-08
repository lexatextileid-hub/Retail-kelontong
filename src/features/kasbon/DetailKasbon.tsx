import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { hariIni, pelangganDenganKasbon, riwayatBayarKasbon, tagihanPelanggan, useToko, type BayarKasbon } from '../../data/toko';
import { selisihHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { ChipSumber, tanggalPendek, teksTempo } from './bersama';
import { DialogBayarKasbon, DialogStrukKasbon } from './DialogKasbon';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

export function DetailKasbon() {
  const { id = '' } = useParams();
  const toko = useToko();
  const [dialog, setDialog] = useState<null | { jenis: 'bayar' } | { jenis: 'struk'; bayar: BayarKasbon }>(null);
  const [lihatLunas, setLihatLunas] = useState(false);
  const p = toko.pelanggan.find((x) => x.id === id);

  if (!p || p.jenis !== 'terdaftar') {
    return (
      <div className="ps-halaman">
        <div className="kartu ps-kosong-besar">
          <h2>Pelanggan tidak ditemukan</h2>
          <Link to="../daftar" className="tombol" style={{ alignSelf: 'flex-start' }}>Ke daftar kasbon</Link>
        </div>
      </div>
    );
  }

  const plg = pelangganDenganKasbon(p.id, toko);
  const tagihan = tagihanPelanggan(p.id, toko);
  const tampil = lihatLunas ? tagihan : tagihan.filter((t) => t.sisa > 0);
  const riwayat = riwayatBayarKasbon(p.id, toko);
  const hari = hariIni();
  const sisaBatas = plg.batasKasbon - plg.saldoKasbon;

  return (
    <div className="ps-halaman">
      <Link to="../daftar" className="tautan">← Daftar kasbon</Link>

      <div className="kartu ps-kepala">
        <div className="ps-kepala__kiri">
          <div className="ps-kepala__nomor">
            <h2 style={{ margin: 0 }}>{plg.nama}</h2>
            {plg.lewatTempo > 0 && <span className="chip-status chip-status--merah">Lewat tempo {rupiah(plg.lewatTempo)}</span>}
          </div>
          <span className="teks-pudar">
            {plg.hp ?? 'HP belum ada'} · tempo {plg.tempoHari} hari · batas {plg.batasKasbon ? rupiah(plg.batasKasbon) : 'belum diatur'}
          </span>
          <span className="teks-pudar" style={{ fontSize: 12.5 }}>Batas dan tempo diatur pemilik di Back Office.</span>
        </div>
        <div className="ps-kepala__kanan">
          <span className="teks-pudar">Kasbon</span>
          <strong className="ps-kepala__total">{rupiah(plg.saldoKasbon)}</strong>
          <span className={sisaBatas < 0 ? 'teks-bahaya' : 'teks-pudar'} style={{ fontSize: 13 }}>
            {plg.batasKasbon ? (sisaBatas >= 0 ? `sisa batas ${rupiah(sisaBatas)}` : `melebihi batas ${rupiah(-sisaBatas)}`) : ''}
          </span>
        </div>
      </div>

      <div className="baris-tombol">
        <button type="button" className="tombol tombol--utama" disabled={plg.saldoKasbon === 0} onClick={() => setDialog({ jenis: 'bayar' })}>Terima pembayaran</button>
        <Link to={`../lama?pelanggan=${plg.id}`} className="tombol">+ Catat kasbon lama</Link>
      </div>

      <div className="kartu tumpuk">
        <div className="kb-judul">
          <h2>Tagihan</h2>
          <label className="centang" style={{ fontSize: 13 }}>
            <input type="checkbox" checked={lihatLunas} onChange={(e) => setLihatLunas(e.target.checked)} /> Tampilkan yang lunas
          </label>
        </div>
        {tampil.length === 0 ? (
          <p className="ps-kosong">Tidak ada kasbon. {lihatLunas ? '' : 'Centang "Tampilkan yang lunas" untuk melihat riwayat.'}</p>
        ) : (
          <div className="kb-tagihan">
            {tampil.map((t) => {
              const sel = selisihHari(hari, t.jatuhTempo);
              const lewat = t.sisa > 0 && sel < 0;
              const isi = (
                <>
                  <div className="kb-tagihan__kiri">
                    <span className="kb-tagihan__nomor"><strong>{t.nomor}</strong> <ChipSumber sumber={t.sumber} /></span>
                    <span className="teks-pudar">
                      {tanggalPendek(t.tanggal)} · jatuh tempo {tanggalPendek(t.jatuhTempo)}
                      {t.sisa > 0 && <span className={lewat ? 'teks-bahaya' : ''}> ({teksTempo(sel)})</span>}
                    </span>
                    {t.keterangan && <span className="teks-pudar">{t.keterangan}</span>}
                  </div>
                  <div className="kb-tagihan__kanan">
                    <strong className={lewat ? 'teks-bahaya' : ''}>{t.sisa > 0 ? rupiah(t.sisa) : 'Lunas'}</strong>
                    {t.terbayar > 0 && <span className="teks-pudar">dari {rupiah(t.jumlah)}</span>}
                  </div>
                </>
              );
              return t.pesananId ? (
                <Link key={t.id} to={`/kasir/pesanan/detail/${t.pesananId}`} className={`kb-tagihan__baris ${lewat ? 'kb-tagihan__baris--lewat' : ''}`}>{isi}</Link>
              ) : (
                <div key={t.id} className={`kb-tagihan__baris ${lewat ? 'kb-tagihan__baris--lewat' : ''}`}>{isi}</div>
              );
            })}
          </div>
        )}
      </div>

      <div className="kartu tumpuk">
        <h2>Riwayat pembayaran</h2>
        {riwayat.length === 0 ? (
          <p className="ps-kosong">Belum ada pembayaran lewat menu Kasbon atau kasir.</p>
        ) : (
          <ul className="kb-riwayat">
            {riwayat.map((b) => (
              <li key={b.id}>
                <div className="kb-riwayat__atas">
                  <span><strong>{b.nomor}</strong> · {b.waktu}</span>
                  <strong>{rupiah(b.jumlah)}</strong>
                </div>
                <span className="teks-pudar">
                  {b.metode === 'tunai' ? 'Tunai' : `Transfer${b.bank ? ` ${b.bank}` : ''}`} · {b.lewat === 'penjualan' ? 'dibayar sekalian belanja' : 'menu Kasbon'} · {b.oleh}
                </span>
                {b.alokasi.length > 0 && <span className="teks-pudar">Untuk: {b.alokasi.map((a) => `${a.nomor} ${rupiah(a.jumlah)}`).join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Pembayaran untuk pesanan juga tercatat di riwayat pesanannya.</p>
      </div>

      {dialog?.jenis === 'bayar' && (
        <DialogBayarKasbon pelanggan={plg} tagihan={tagihan} onTutup={() => setDialog(null)} onSelesai={(b) => setDialog({ jenis: 'struk', bayar: b })} />
      )}
      {dialog?.jenis === 'struk' && <DialogStrukKasbon bayar={dialog.bayar} nama={plg.nama} onTutup={() => setDialog(null)} />}
    </div>
  );
}
