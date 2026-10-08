import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { PilihPeriode, periodeDari, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { hargaBeliContoh } from '../../data/contoh';
import { hariIni, infoBarang, mutasiBarang, useToko } from '../../data/toko';
import { selisihHari } from '../../domain/kasbon';
import { ATURAN_GERAK, namaJenisStok, warnaUmur, type JenisMutasiStok, type MutasiStok } from '../../domain/stok';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { ambilProduk, singkatan } from '../penjualan/model';
import { ambilDistributor } from '../pesanan/bersama';
import { ChipGerak, ChipUmur, hargaJualTingkat, labelDasarSaja, labelStok, namaKategori, satuanBeli, teksPersen } from './bersama';

type Tab = 'ringkasan' | 'kartu' | 'satuan' | 'fifo' | 'beli';
type FJenis = 'semua' | 'masuk' | 'keluar';

const Angka = ({ judul, nilai, bawah }: { judul: string; nilai: ReactNode; bawah?: ReactNode }) => (
  <div className="sb-angka"><span className="teks-pudar">{judul}</span><strong>{nilai}</strong>{bawah && <span className="teks-pudar">{bawah}</span>}</div>
);

/** Detail barang: ringkasan gerak & nilai, kartu stok (saldo berjalan), satuan & harga, per kedatangan (FIFO), harga beli per distributor. */
export function DetailBarang() {
  const { id = '' } = useParams();
  const toko = useToko();
  const [tab, setTab] = useState<Tab>('ringkasan');
  const [periode, setPeriode] = useState<Periode>(() => periodeDari('bulan-ini', '', { dari: '', sampai: '' }));
  const [fJenis, setFJenis] = useState<FJenis>('semua');
  const p = ambilProduk(id);
  if (!p) return <div className="kartu ps-kosong-besar"><h2>Barang tidak ditemukan</h2><Link to="../daftar" className="tautan">← Daftar barang</Link></div>;
  const i = infoBarang(id, toko);
  const mut = mutasiBarang(id, toko);
  const dasar = singkatan(p.satuanDasarId);
  const hari = hariIni();

  // Kartu stok: saldo berjalan; baris pertama = saldo sebelum periode.
  let saldo = 0;
  const berjalan = mut.map((m) => ({ m, saldo: (saldo = Math.round((saldo + m.jumlah) * 1000) / 1000) }));
  const sebelum = berjalan.filter((x) => x.m.tanggal < periode.dari).slice(-1)[0]?.saldo ?? 0;
  const diPeriode = berjalan.filter((x) => x.m.tanggal >= periode.dari && x.m.tanggal <= periode.sampai);
  const kartu = [
    { m: { id: 'awal', waktuIso: '', tanggal: periode.dari, produkId: id, jenis: 'saldo-awal' as JenisMutasiStok, nomor: '', keterangan: 'Saldo sebelum periode', jumlah: 0, oleh: '' } as MutasiStok, saldo: sebelum, awal: true },
    ...diPeriode.filter((x) => fJenis === 'semua' || (fJenis === 'masuk' ? x.m.jumlah > 0 : x.m.jumlah < 0)).map((x) => ({ ...x, awal: false })),
  ];
  const masukP = diPeriode.filter((x) => x.m.jumlah > 0).reduce((t, x) => t + x.m.jumlah, 0);
  const keluarP = -diPeriode.filter((x) => x.m.jumlah < 0).reduce((t, x) => t + x.m.jumlah, 0);

  // Harga beli per distributor (dari faktur), modal per satuan beli.
  const sb = satuanBeli(p);
  const perDist = new Map<string, { terakhir: MutasiStok; terendah: number; kali: number }>();
  mut.filter((m) => (m.jenis === 'faktur' || m.jenis === 'faktur-tunai') && m.distributorId).forEach((m) => {
    const x = perDist.get(m.distributorId!);
    const modal = (m.modal ?? 0) * sb.isi;
    perDist.set(m.distributorId!, { terakhir: m, terendah: Math.min(x?.terendah ?? Infinity, modal), kali: (x?.kali ?? 0) + 1 });
  });
  (hargaBeliContoh[id] ?? []).forEach((h) => {
    if (!perDist.has(h.distributorId)) perDist.set(h.distributorId, { terakhir: { tanggal: '', nomor: 'daftar harga', modal: h.harga / (p.satuan.find((s) => s.id === h.satuanProdukId)?.isi ?? 1) } as MutasiStok, terendah: (h.harga / (p.satuan.find((s) => s.id === h.satuanProdukId)?.isi ?? 1)) * sb.isi, kali: 0 });
  });

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div>
          <Link to="../daftar" className="tautan">← Daftar barang</Link>
          <h2 style={{ margin: '6px 0 4px' }}>{p.nama}</h2>
          <div className="sb-kepala-info">
            <span className="teks-pudar">{p.sku}{p.kode ? ` · kode ${p.kode}` : ''} · {namaKategori(p.kategoriId)}</span>
            <ChipGerak status={i.status} />
            {i.umur && <ChipUmur warna={i.umur.warna} hari={i.umur.hari} />}
            {p.musiman && <span className="chip-status chip-status--abu">Musiman</span>}
          </div>
        </div>
        <Link to={`../ubah/${p.id}`} className="tombol">Ubah barang</Link>
      </div>

      <div className="sb-tab" role="tablist">
        {([['ringkasan', 'Ringkasan'], ['kartu', 'Kartu stok'], ['satuan', 'Satuan & harga'], ['fifo', 'Per kedatangan'], ['beli', 'Harga beli']] as [Tab, string][]).map(([k, j]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{j}</button>
        ))}
      </div>

      {tab === 'ringkasan' && (
        <div className="kartu sb-ringkasan">
          <Angka judul="Stok (toko + gudang)" nilai={<span className={i.stok < 0 ? 'teks-bahaya' : undefined}>{labelStok(p, i.stok)}</span>} bawah={labelDasarSaja(p, i.stok)} />
          <Angka judul="Dipesan pelanggan / bebas" nilai={`${labelDasarSaja(p, i.terkunci)} / ${labelDasarSaja(p, i.bebas)}`} bawah="dipesan = dikunci untuk pesanan" />
          <Angka judul="Stok minimum" nilai={labelDasarSaja(p, p.stokMinimum)} bawah={i.stok <= 0 ? 'stok kosong' : i.stok <= p.stokMinimum ? 'perlu dipesan' : 'aman'} />
          <Angka judul="Terjual 30 hari" nilai={labelDasarSaja(p, i.terjual30)} bawah={`rata-rata ${(Math.round(i.rataHarian * 10) / 10).toLocaleString('id-ID')} ${dasar}/hari`} />
          <Angka judul="Cukup untuk" nilai={i.cukupHari === undefined ? '-' : `± ${i.cukupHari} hari`} bawah="stok ÷ rata-rata per hari" />
          <Angka judul="Terakhir terjual" nilai={i.terakhirTerjual ? tanggalPendek(i.terakhirTerjual) : '-'} bawah={i.terakhirTerjual ? `${selisihHari(i.terakhirTerjual, hari)} hari lalu` : 'belum pernah'} />
          <Angka judul="Status gerak" nilai={<ChipGerak status={i.status} />} bawah={`terjual di ${i.mingguTerjual} dari ${ATURAN_GERAK.minggu} minggu`} />
          <Angka judul="Umur stok" nilai={i.umur ? <ChipUmur warna={i.umur.warna} hari={i.umur.hari} /> : '-'} bawah={i.umur ? `kedatangan tertua ${tanggalPendek(i.umur.tanggal)}` : 'stok kosong'} />
          <Angka judul="Modal (FIFO)" nilai={i.modal ? `${rupiah(i.modal)} / ${dasar}` : '-'} bawah={i.modal ? `${rupiah(i.modal * sb.isi)} per ${sb.label}` : undefined} />
          <Angka judul="Nilai stok" nilai={rupiah(i.nilai)} bawah={`${i.lapisan.length} kedatangan tersisa`} />
          <Angka judul="Beli terakhir" nilai={i.beliTerakhir ? `${rupiah(i.beliTerakhir.modal * sb.isi)} / ${sb.label}` : '-'} bawah={i.beliTerakhir ? `${tanggalPendek(i.beliTerakhir.tanggal)} · ${i.beliTerakhir.distributorId ? ambilDistributor(i.beliTerakhir.distributorId).nama : ''}` : undefined} />
          <Angka judul="Letak" nilai={p.letak ?? '-'} />
          {i.minus > 0 && <p className="catatan catatan--peringatan sb-lebar" style={{ margin: 0 }}>Stok minus {labelDasarSaja(p, i.minus)} belum terjelaskan: cek faktur yang belum diinput atau lakukan hitung stok.</p>}
        </div>
      )}

      {tab === 'kartu' && (
        <>
          <div className="kartu kf__panel tumpuk">
            <PilihPeriode awal="bulan-ini" onUbah={setPeriode} />
            <PilihanChip label="Jenis" nilai={fJenis} onUbah={setFJenis} pilihan={[{ k: 'semua', judul: 'Semua' }, { k: 'masuk', judul: 'Masuk' }, { k: 'keluar', judul: 'Keluar' }]} />
            <span className="teks-pudar" style={{ fontSize: 13 }}>{teksPeriode(periode)} · masuk {labelDasarSaja(p, masukP)} · keluar {labelDasarSaja(p, keluarP)}</span>
          </div>
          <TabelDaftar
            data={kartu}
            kunci={(x) => x.m.id}
            kosong={<p className="teks-pudar">Tidak ada mutasi.</p>}
            kolom={[
              { judul: 'Tanggal', isi: (x) => (x.awal ? <span className="teks-pudar">{tanggalPendek(periode.dari)}</span> : <Sel utama={tanggalPendek(x.m.tanggal)} bawah={x.m.oleh} />) },
              { judul: 'No. sumber', isi: (x) => (x.awal ? '' : <strong>{x.m.nomor}</strong>) },
              { judul: 'Jenis', isi: (x) => (x.awal ? <span className="teks-pudar">Saldo awal periode</span> : <span className={`chip-status ${x.m.jumlah > 0 ? 'chip-status--hijau' : 'chip-status--abu'}`}>{namaJenisStok[x.m.jenis]}</span>) },
              { judul: 'Keterangan', bungkus: true, isi: (x) => x.m.keterangan },
              { judul: 'Masuk', kanan: true, isi: (x) => (!x.awal && x.m.jumlah > 0 ? <Sel utama={labelDasarSaja(p, x.m.jumlah)} bawah={x.m.modal ? `@ ${rupiah(x.m.modal)}` : undefined} /> : '-') },
              { judul: 'Keluar', kanan: true, isi: (x) => (!x.awal && x.m.jumlah < 0 ? labelDasarSaja(p, -x.m.jumlah) : '-') },
              { judul: 'Saldo', kanan: true, isi: (x) => <Sel utama={<strong>{labelDasarSaja(p, x.saldo)}</strong>} bawah={labelStok(p, x.saldo)} /> },
            ]}
          />
        </>
      )}

      {tab === 'satuan' && (
        <>
          <TabelDaftar
            data={[...p.satuan].sort((a, b) => a.isi - b.isi)}
            kunci={(s) => s.id}
            kosong={null}
            kolom={[
              { judul: 'Satuan', isi: (s) => <Sel utama={<strong>{s.label}</strong>} bawah={s.isi === 1 ? 'satuan dasar' : `${s.isi.toLocaleString('id-ID')} ${dasar}`} /> },
              { judul: 'Dipakai', isi: (s) => [s.dibeli && 'beli', s.dijual && 'jual'].filter(Boolean).join(' · ') || '-' },
              { judul: 'Barcode', isi: (s) => s.barcode ?? '-' },
              { judul: 'Harga beli terakhir', kanan: true, isi: (s) => (i.beliPerSatuan[s.id] ? <Sel utama={rupiah(i.beliPerSatuan[s.id].harga)} bawah={i.beliPerSatuan[s.id].nomor} /> : i.beliAcuan ? <Sel utama={rupiah(i.beliAcuan * s.isi)} bawah="dihitung dari isi" /> : '-') },
              { judul: 'Harga jual', kanan: true, isi: (s) => (p.metodeHarga === 'per_satuan' && s.hargaJual ? rupiah(s.hargaJual) : p.metodeHarga === 'bertingkat' ? 'bertingkat' : '-') },
              { judul: 'Untung', kanan: true, isi: (s) => {
                const h = hargaJualTingkat(p, i.beliAcuan, i.beliPerSatuan).find((x) => x.judul === s.label);
                return h?.untungRp !== undefined ? <Sel utama={rupiah(h.untungRp)} bawah={teksPersen(h.untungPersen)} /> : '-';
              } },
            ]}
          />
          {p.metodeHarga === 'bertingkat' && (
            <TabelDaftar
              data={hargaJualTingkat(p, i.beliAcuan, i.beliPerSatuan)}
              kunci={(x) => x.judul}
              kosong={null}
              kolom={[
                { judul: 'Tingkat harga', isi: (x) => <strong>{x.judul}</strong> },
                { judul: 'Harga per ' + dasar, kanan: true, isi: (x) => rupiah(x.harga) },
                { judul: 'Untung', kanan: true, isi: (x) => (x.untungRp !== undefined ? <Sel utama={rupiah(x.untungRp)} bawah={teksPersen(x.untungPersen)} /> : '-') },
              ]}
            />
          )}
        </>
      )}

      {tab === 'fifo' && (
        <TabelDaftar
          data={[...i.lapisan].reverse()}
          kunci={(l) => `${l.nomor}${l.tanggal}`}
          kosong={<p className="teks-pudar">Stok kosong — tidak ada kedatangan yang tersisa.</p>}
          kolom={[
            { judul: 'Tanggal masuk', isi: (l) => tanggalPendek(l.tanggal) },
            { judul: 'No. sumber', isi: (l) => <Sel utama={<strong>{l.nomor}</strong>} bawah={namaJenisStok[l.jenis]} /> },
            { judul: 'Jumlah masuk', kanan: true, isi: (l) => labelDasarSaja(p, l.jumlahAwal) },
            { judul: 'Sisa', kanan: true, isi: (l) => <strong>{labelDasarSaja(p, l.sisa)}</strong>, total: labelDasarSaja(p, i.lapisan.reduce((t, l) => t + l.sisa, 0)) },
            { judul: 'Modal / ' + dasar, kanan: true, isi: (l) => rupiah(l.modal) },
            { judul: 'Nilai', kanan: true, isi: (l) => rupiah(l.sisa * l.modal), total: rupiah(i.nilai) },
            { judul: 'Umur', isi: (l) => { const h = selisihHari(l.tanggal, hari); return <ChipUmur warna={warnaUmur(h)} hari={h} />; } },
          ]}
        />
      )}

      {tab === 'beli' && (
        <TabelDaftar
          data={[...perDist].sort((a, b) => a[1].terendah - b[1].terendah)}
          kunci={([d]) => d}
          kosong={<p className="teks-pudar">Belum ada faktur untuk barang ini.</p>}
          kolom={[
            { judul: 'Distributor', isi: ([d], ) => <strong>{ambilDistributor(d).nama}</strong> },
            { judul: 'Beli terakhir', isi: ([, x]) => <Sel utama={x.terakhir.tanggal ? tanggalPendek(x.terakhir.tanggal) : '-'} bawah={x.terakhir.nomor} /> },
            { judul: `Harga per ${sb.label}`, kanan: true, isi: ([, x]) => rupiah((x.terakhir.modal ?? 0) * sb.isi) },
            { judul: 'Terendah', kanan: true, isi: ([, x]) => rupiah(x.terendah) },
            { judul: 'Jumlah faktur', kanan: true, isi: ([, x]) => x.kali || '-' },
          ]}
        />
      )}
    </div>
  );
}
