import { useState, type ReactNode } from 'react';
import { KartuRingkas, KotakFilter } from '../../components/Daftar';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { mutasiKas, pencocokanTerakhir, ringkasSesiKas, useToko } from '../../data/toko';
import {
  KELOMPOK_KELUAR, KELOMPOK_MASUK, namaKelompok, namaTempat, ringkasTempat, type KelompokKas, type RingkasTempat, type TempatUang,
} from '../../domain/kas';
import { isoHari, selisihHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { DialogLaporanHarian } from '../kaslaci/DialogLaci';
import { atauStrip, bertanda, jamTanggal, labelLawan } from './bersama';

const TEMPAT: TempatUang[] = ['laci', 'brankas', 'bank'];

interface BarisPosisi { kunci: string; nama: ReactNode; bawah?: ReactNode; r: RingkasTempat; cek: ReactNode; tebal?: boolean; onKlik?: () => void }

const jumlahkan = (rs: RingkasTempat[]): RingkasTempat => ({
  saldoAwal: rs.reduce((t, r) => t + r.saldoAwal, 0), masuk: rs.reduce((t, r) => t + r.masuk, 0), keluar: rs.reduce((t, r) => t + r.keluar, 0),
  pindahMasuk: rs.reduce((t, r) => t + r.pindahMasuk, 0), pindahKeluar: rs.reduce((t, r) => t + r.pindahKeluar, 0),
  selisih: rs.reduce((t, r) => t + r.selisih, 0), saldoAkhir: rs.reduce((t, r) => t + r.saldoAkhir, 0), perKelompok: {},
});

/**
 * Laporan Harian Toko (Back Office, pemilik): posisi uang di 3 tempat (laci, brankas, rekening),
 * rincian masuk / keluar per kelompok A–G, pindah dana, hasil hitung fisik, dan catatan non-kas.
 * Periode lebih dari sehari = jumlah harian (dipakai untuk laporan bulanan).
 */
export function LaporanHarianToko({ awal = 'hari-ini' }: { awal?: 'hari-ini' | 'bulan-ini' }) {
  const toko = useToko();
  const [periode, setPeriode] = useState<Periode>(() => periodeDari(awal, '', { dari: '', sampai: '' }));
  const [sesiBuka, setSesiBuka] = useState<string | null>(null);
  const [info, setInfo] = useState('');
  const { dari, sampai } = periode;
  const semua = mutasiKas(toko);
  const per = Object.fromEntries(TEMPAT.map((t) => [t, ringkasTempat(semua.filter((m) => m.tempat === t), dari, sampai)])) as Record<TempatUang, RingkasTempat>;
  const total = jumlahkan(TEMPAT.map((t) => per[t]));
  const sesi = toko.sesiLaci.filter((x) => x.tanggal >= dari && x.tanggal <= sampai).sort((a, b) => a.dibukaIso.localeCompare(b.dibukaIso));
  const hari = isoHari(new Date());

  const cekTempat = (t: 'brankas' | 'bank') => {
    const c = pencocokanTerakhir(t, toko);
    if (!c) return <span className="chip-status chip-status--merah">belum pernah {t === 'bank' ? 'dicocokkan' : 'dihitung'}</span>;
    const tgl = isoHari(new Date(c.waktuIso));
    const lama = selisihHari(tgl, hari);
    return (
      <>
        <span className={`chip-status ${c.selisih ? 'chip-status--merah' : lama > 7 ? 'chip-status--kuning' : 'chip-status--hijau'}`}>{c.selisih ? `selisih ${bertanda(c.selisih)}` : 'cocok'}</span>
        <div className="teks-pudar" style={{ fontSize: 12 }}>{t === 'bank' ? 'mutasi' : 'hitung'} {tanggalPendek(tgl)}{lama > 7 ? ' · lewat seminggu' : ''}</div>
      </>
    );
  };

  const baris: BarisPosisi[] = [
    ...sesi.map((x) => {
      const { r } = ringkasSesiKas(x.id, toko);
      return {
        kunci: x.id, nama: `Laci ${x.akun.replace(/[[\]]/g, '')}`, bawah: `${x.nomor}${dari !== sampai ? ` · ${tanggalPendek(x.tanggal)}` : ''}`, r, onKlik: () => setSesiBuka(x.id),
        cek: x.ditutupIso
          ? <span className={`chip-status ${x.selisih ? 'chip-status--merah' : 'chip-status--hijau'}`}>{x.selisih ? `selisih ${bertanda(x.selisih)}` : 'cocok'}</span>
          : <span className="chip-status chip-status--biru">masih buka</span>,
      };
    }),
    { kunci: 'brankas', nama: 'Brankas', r: per.brankas, cek: cekTempat('brankas') },
    { kunci: 'bank', nama: 'Rekening bank', r: per.bank, cek: cekTempat('bank') },
  ];
  // Laci yang tidak dibuka di periode ini tetap punya uang (sisa laci) → tampil sebagai satu baris agar total benar.
  const akunSesi = [...new Set(sesi.map((x) => x.akun))];
  const pertama = akunSesi.map((a) => sesi.find((x) => x.akun === a)!);
  const terakhir = akunSesi.map((a) => [...sesi].reverse().find((x) => x.akun === a)!);
  const laciLainAwal = per.laci.saldoAwal - pertama.reduce((t, x) => t + x.dariKemarin, 0);
  const laciLain = per.laci.saldoAkhir - terakhir.reduce((t, x) => t + ringkasSesiKas(x.id, toko).r.saldoAkhir, 0);
  if (laciLain !== 0 || laciLainAwal !== 0)
    baris.splice(sesi.length, 0, { kunci: 'laci-lain', nama: 'Laci lain', bawah: 'tidak dibuka di periode ini', r: { ...jumlahkan([]), saldoAwal: laciLainAwal, saldoAkhir: laciLain }, cek: '-' });

  const pendapatan = TEMPAT.reduce((t, x) => t + (per[x].perKelompok.pendapatan?.total ?? 0), 0);
  const pengeluaran = TEMPAT.reduce((t, x) => t - (['biaya', 'belanja', 'kembali'] as KelompokKas[]).reduce((a, k) => a + (per[x].perKelompok[k]?.total ?? 0), 0), 0);
  const nota = toko.penjualan.filter((n) => n.tanggal >= dari && n.tanggal <= sampai);
  const pindah = semua.filter((m) => m.kelompok === 'pindah-keluar' && m.tanggal >= dari && m.tanggal <= sampai);

  const tabelKelompok = (judul: string, daftar: KelompokKas[], tanda: 1 | -1) => {
    const ada = daftar.filter((k) => TEMPAT.some((t) => per[t].perKelompok[k]));
    const sel = (n: number) => (n ? rupiah(Math.abs(n)) : '-');
    const jumlahTempat = (t: TempatUang) => ada.reduce((a, k) => a + (per[t].perKelompok[k]?.total ?? 0), 0);
    return (
      <div className="kartu bd-tabel-kartu">
        <table className="ps-tabel lh-tabel">
          <thead>
            <tr><th>{judul}</th>{TEMPAT.map((t) => <th key={t} className="kanan">{t === 'laci' ? 'Laci' : t === 'bank' ? 'Rekening' : 'Brankas'}</th>)}<th className="kanan">Total</th></tr>
          </thead>
          <tbody>
            {ada.length === 0 && <tr><td colSpan={5} className="teks-pudar">Tidak ada.</td></tr>}
            {ada.map((k) => {
              const rinci = [...new Set(TEMPAT.flatMap((t) => Object.keys(per[t].perKelompok[k]?.rincian ?? {})))].sort();
              const totalK = TEMPAT.reduce((a, t) => a + (per[t].perKelompok[k]?.total ?? 0), 0);
              return [
                <tr key={k} className="lh-kelompok">
                  <td>{namaKelompok[k]}</td>
                  {TEMPAT.map((t) => <td key={t} className="kanan">{sel(per[t].perKelompok[k]?.total ?? 0)}</td>)}
                  <td className="kanan">{sel(totalK)}</td>
                </tr>,
                ...rinci.map((nm) => (
                  <tr key={`${k}-${nm}`} className="lh-rinci">
                    <td>{nm}</td>
                    {TEMPAT.map((t) => <td key={t} className="kanan">{sel(per[t].perKelompok[k]?.rincian[nm] ?? 0)}</td>)}
                    <td className="kanan">{sel(TEMPAT.reduce((a, t) => a + (per[t].perKelompok[k]?.rincian[nm] ?? 0), 0))}</td>
                  </tr>
                )),
              ];
            })}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Jumlah {tanda > 0 ? 'masuk' : 'keluar'}</strong></td>
              {TEMPAT.map((t) => <td key={t} className="kanan"><strong>{sel(jumlahTempat(t))}</strong></td>)}
              <td className="kanan"><strong>{sel(TEMPAT.reduce((a, t) => a + jumlahTempat(t), 0))}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="ps-halaman">
      <KartuRingkas item={[
        { judul: 'Uang toko akhir', nilai: rupiah(total.saldoAkhir), catatan: `awal ${rupiah(total.saldoAwal)}` },
        { judul: 'A. Pendapatan usaha', nilai: rupiah(pendapatan), catatan: `${nota.length} nota penjualan` },
        { judul: 'Biaya + belanja + retur', nilai: rupiah(pengeluaran), catatan: 'kelompok D, E, F' },
        { judul: 'Selisih hitung', nilai: bertanda(total.selisih), warna: total.selisih ? 'merah' : undefined, catatan: 'laci, brankas, rekening' },
      ]} />
      <KotakFilter ringkas={teksPeriode(periode)} aksi={<div className="baris-tombol">
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, laporan dicetak ukuran A4 / diunduh PDF.')}>Cetak / PDF</button>
      </div>}>
        <PilihPeriode awal={awal} onUbah={setPeriode} />
      </KotakFilter>
      {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}

      <h2 className="kf-judul">1. Posisi uang · {teksPeriode(periode)}</h2>
      <div className="kartu bd-tabel-kartu">
        <table className="ps-tabel ps-tabel--hp bd-tabel lh-posisi">
          <thead>
            <tr>
              <th>Tempat uang</th><th className="kanan">Saldo awal</th><th className="kanan">Masuk</th><th className="kanan">Keluar</th>
              <th className="kanan">Pindah masuk</th><th className="kanan">Pindah keluar</th><th className="kanan">Selisih</th><th className="kanan">Saldo akhir</th><th>Cek fisik</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.kunci} onClick={b.onKlik} style={b.onKlik ? undefined : { cursor: 'default' }}>
                <td data-label="Tempat uang"><strong>{b.nama}</strong>{b.bawah && <div className="teks-pudar" style={{ fontSize: 12 }}>{b.bawah}</div>}</td>
                <td data-label="Saldo awal" className="kanan">{rupiah(b.r.saldoAwal)}</td>
                <td data-label="Masuk" className="kanan">{atauStrip(b.r.masuk)}</td>
                <td data-label="Keluar" className="kanan">{b.r.keluar ? <span className="teks-bahaya">{rupiah(b.r.keluar)}</span> : '-'}</td>
                <td data-label="Pindah masuk" className="kanan">{atauStrip(b.r.pindahMasuk)}</td>
                <td data-label="Pindah keluar" className="kanan">{atauStrip(b.r.pindahKeluar)}</td>
                <td data-label="Selisih" className={`kanan ${b.r.selisih ? 'teks-bahaya' : ''}`}>{b.r.selisih ? bertanda(b.r.selisih) : '-'}</td>
                <td data-label="Saldo akhir" className="kanan"><strong>{rupiah(b.r.saldoAkhir)}</strong></td>
                <td data-label="Cek fisik">{b.cek}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td data-label="Tempat uang"><strong>Total uang toko</strong></td>
              <td data-label="Saldo awal" className="kanan"><strong>{rupiah(total.saldoAwal)}</strong></td>
              <td data-label="Masuk" className="kanan"><strong>{rupiah(total.masuk)}</strong></td>
              <td data-label="Keluar" className="kanan"><strong>{rupiah(total.keluar)}</strong></td>
              <td data-label="Pindah masuk" className="kanan"><strong>{rupiah(total.pindahMasuk)}</strong></td>
              <td data-label="Pindah keluar" className="kanan"><strong>{rupiah(total.pindahKeluar)}</strong></td>
              <td data-label="Selisih" className="kanan"><strong>{bertanda(total.selisih)}</strong></td>
              <td data-label="Saldo akhir" className="kanan"><strong>{rupiah(total.saldoAkhir)}</strong></td>
              <td className="lh-kosong" />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
        Saldo akhir = saldo awal + masuk − keluar + pindah masuk − pindah keluar ± selisih. Pindah dana tidak mengubah total uang toko. Klik baris laci untuk laporan kasirnya.
      </p>

      <h2 className="kf-judul">2. Rincian uang masuk</h2>
      {tabelKelompok('Kelompok', KELOMPOK_MASUK.filter((k) => k !== 'pindah-masuk'), 1)}

      <h2 className="kf-judul">3. Rincian uang keluar</h2>
      {tabelKelompok('Kelompok', KELOMPOK_KELUAR.filter((k) => k !== 'pindah-keluar'), -1)}

      <h2 className="kf-judul">4. Pindah dana</h2>
      {pindah.length === 0 ? <p className="teks-pudar" style={{ margin: 0 }}>Tidak ada pindah dana.</p> : (
        <div className="kartu bd-tabel-kartu">
          <table className="ps-tabel ps-tabel--hp bd-tabel">
            <thead><tr><th>Waktu</th><th>No.</th><th>Dari → ke</th><th>Keterangan</th><th className="kanan">Jumlah</th></tr></thead>
            <tbody>
              {pindah.map((m) => (
                <tr key={m.id} style={{ cursor: 'default' }}>
                  <td data-label="Waktu">{jamTanggal(m.waktuIso)}</td>
                  <td data-label="No."><strong>{m.nomor}</strong></td>
                  <td data-label="Dari → ke">{namaTempat[m.tempat]} {labelLawan(m)}</td>
                  <td data-label="Keterangan" className="bd-bungkus">{m.keterangan}<div className="teks-pudar" style={{ fontSize: 12 }}>{m.akun}</div></td>
                  <td data-label="Jumlah" className="kanan"><strong>{rupiah(-m.jumlah)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="kf-judul">5. Catatan non-kas</h2>
      <div className="kartu lh-catatan">
        <div className="ringkas-total"><span>Total penjualan ({nota.length} nota)</span><strong>{rupiah(nota.reduce((t, n) => t + n.total, 0))}</strong></div>
        <div className="ringkas-total"><span>Penjualan kasbon (belum jadi uang)</span><strong>{rupiah(nota.reduce((t, n) => t + n.kasbonBaru, 0))}</strong></div>
        <div className="ringkas-total"><span>Potongan pembulatan / diskon akhir</span><strong>{rupiah(nota.reduce((t, n) => t + n.struk.potongan, 0))}</strong></div>
        <div className="ringkas-total"><span>Diskon dari distributor (mengurangi hutang)</span><strong>{rupiah(toko.arus.filter((a) => { const t = isoHari(new Date(a.waktuIso)); return t >= dari && t <= sampai; }).reduce((t, a) => t + (a.faktur ?? []).reduce((x, f) => x + (f.diskon ?? 0), 0), 0))}</strong></div>
      </div>
      {sesiBuka && <DialogLaporanHarian sesiId={sesiBuka} onTutup={() => setSesiBuka(null)} />}
    </div>
  );
}
