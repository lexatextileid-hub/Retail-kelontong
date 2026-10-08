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
  const [dialog, setDialog] = useState<null | { jenis: 'bayar'; nota: string[] } | { jenis: 'struk'; bayar: BayarKasbon }>(null);
  const [lihatLunas, setLihatLunas] = useState(true);
  const [pilih, setPilih] = useState<string[]>([]);
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
  const dipilih = tagihan.filter((t) => t.sisa > 0 && pilih.includes(t.id));
  const totalPilih = dipilih.reduce((t, x) => t + x.sisa, 0);
  const terbuka = tagihan.filter((t) => t.sisa > 0);
  const semua = terbuka.length > 0 && terbuka.every((t) => pilih.includes(t.id));

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
            {plg.hp ?? 'HP belum ada'} · {plg.tempoHari ? `tempo ${plg.tempoHari} hari` : 'tempo belum diatur'} · batas {plg.batasKasbon ? rupiah(plg.batasKasbon) : 'belum diatur'}
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
        <button type="button" className="tombol tombol--utama" disabled={plg.saldoKasbon === 0} onClick={() => setDialog({ jenis: 'bayar', nota: [] })}>Bayar kasbon</button>
        <Link to={`../lama?pelanggan=${plg.id}`} className="tombol">+ Catat kasbon lama</Link>
      </div>

      <div className="kartu tumpuk">
        <div className="kb-judul">
          <h2>Tagihan</h2>
          {terbuka.length > 1 && (
            <label className="centang" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={semua} onChange={(e) => setPilih(e.target.checked ? terbuka.map((t) => t.id) : [])} /> Pilih semua belum lunas
            </label>
          )}
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
              return (
                <div key={t.id} className={`kb-tagihan__baris ${lewat ? 'kb-tagihan__baris--lewat' : ''} ${pilih.includes(t.id) && t.sisa > 0 ? 'kb-tagihan__baris--pilih' : ''}`}>
                  {t.sisa > 0 ? (
                    <input type="checkbox" className="kb-centang" aria-label={`Pilih ${t.nomor}`} checked={pilih.includes(t.id)}
                      onChange={(e) => setPilih((xs) => (e.target.checked ? [...xs, t.id] : xs.filter((x) => x !== t.id)))} />
                  ) : (
                    <span className="kb-centang" aria-hidden="true" />
                  )}
                  <div className="kb-tagihan__kiri">
                    <span className="kb-tagihan__nomor">
                      {t.pesananId ? <Link to={`/kasir/pesanan/detail/${t.pesananId}`} className="tautan"><strong>{t.nomor}</strong></Link> : <strong>{t.nomor}</strong>}{' '}
                      <ChipSumber sumber={t.sumber} />
                    </span>
                    <span className="teks-pudar">
                      {tanggalPendek(t.tanggal)} · jatuh tempo {tanggalPendek(t.jatuhTempo)}
                      {t.sisa > 0 && <span className={lewat ? 'teks-bahaya' : ''}> ({teksTempo(sel)})</span>}
                    </span>
                    {t.keterangan && <span className="teks-pudar">{t.keterangan}</span>}
                  </div>
                  <div className="kb-tagihan__kanan">
                    <span className={`chip-status chip-status--${t.sisa === 0 ? 'hijau' : lewat ? 'merah' : t.terbayar > 0 ? 'kuning' : 'biru'}`}>
                      {t.sisa === 0 ? 'Lunas' : lewat ? 'Lewat tempo' : t.terbayar > 0 ? 'Dibayar sebagian' : 'Belum lunas'}
                    </span>
                    <strong className={lewat ? 'teks-bahaya' : ''}>{rupiah(t.sisa > 0 ? t.sisa : t.jumlah)}</strong>
                    {t.terbayar > 0 && t.sisa > 0 && <span className="teks-pudar">dari {rupiah(t.jumlah)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dipilih.length > 0 && (
        <div className="kb-bilah-pilih">
          <span><strong>{dipilih.length} nota dipilih</strong> · {rupiah(totalPilih)}</span>
          <div className="baris-tombol">
            <button type="button" className="tombol tombol--hantu" onClick={() => setPilih([])}>Batal</button>
            <button type="button" className="tombol tombol--utama" onClick={() => setDialog({ jenis: 'bayar', nota: dipilih.map((t) => t.id) })}>Bayar {dipilih.length} nota</button>
          </div>
        </div>
      )}

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
        <DialogBayarKasbon pelanggan={plg} tagihan={tagihan} notaDipilih={dialog.nota} onTutup={() => setDialog(null)} onSelesai={(b) => { setPilih([]); setDialog({ jenis: 'struk', bayar: b }); }} />
      )}
      {dialog?.jenis === 'struk' && <DialogStrukKasbon bayar={dialog.bayar} nama={plg.nama} onTutup={() => setDialog(null)} />}
    </div>
  );
}
