import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { BilahAtas, KartuRingkas, KotakFilter, PilihanChip, Sel, TabelDaftar } from '../../components/Daftar';
import { Dialog } from '../../components/Dialog';
import { PilihPeriode, teksPeriode, type Periode } from '../../components/PilihPeriode';
import { hariIni, useToko, type BayarKasbon, type NotaPenjualan, type Retur } from '../../data/toko';
import { isoHari } from '../../domain/kasbon';
import { rupiah } from '../../lib/format';
import { DialogStrukKasbon } from '../kasbon/DialogKasbon';
import { namaPelanggan } from '../pesanan/bersama';
import { IsiStruk } from '../penjualan/DialogLain';
import { DialogStrukRetur } from '../retur/DialogRetur';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

type Jenis = 'semua' | 'jual' | 'kasbon' | 'retur';
type Baris =
  | { jenis: 'jual'; waktuIso: string; data: NotaPenjualan }
  | { jenis: 'kasbon'; waktuIso: string; data: BayarKasbon }
  | { jenis: 'retur'; waktuIso: string; data: Retur };

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function caraBayar(n: NotaPenjualan) {
  const x = [n.tunai > 0 && 'Tunai', n.transfer > 0 && 'Transfer', n.kasbonBaru > 0 && 'Kasbon'].filter(Boolean);
  return x.join(' + ') || 'Lunas';
}

/** Semua transaksi kasir per tanggal: penjualan, bayar kasbon, retur. Cetak ulang, lanjut retur. */
export function Riwayat() {
  const toko = useToko();
  const navigasi = useNavigate();
  const [periode, setPeriode] = useState<Periode>({ dari: hariIni(), sampai: hariIni() });
  const [jenis, setJenis] = useState<Jenis>('semua');
  const [cari, setCari] = useState('');
  const [buka, setBuka] = useState<Baris | null>(null);

  const semua: Baris[] = [
    ...toko.penjualan.map((d) => ({ jenis: 'jual' as const, waktuIso: d.waktuIso, data: d })),
    // pembayaran kasbon yang berdiri sendiri (bukan bagian dari nota belanja/retur)
    ...toko.bayarKasbon.filter((b) => b.lewat === 'kasbon').map((d) => ({ jenis: 'kasbon' as const, waktuIso: `${d.tanggal}T12:00:00`, data: d })),
    ...toko.retur.map((d) => ({ jenis: 'retur' as const, waktuIso: d.waktuIso, data: d })),
  ];
  const tglBaris = (x: Baris) => (x.jenis === 'kasbon' ? x.data.tanggal : isoHari(new Date(x.waktuIso)));
  const hariItu = semua.filter((x) => tglBaris(x) >= periode.dari && tglBaris(x) <= periode.sampai);
  const q = cari.trim().toLowerCase();
  const tampil = hariItu
    .filter((x) => jenis === 'semua' || x.jenis === jenis)
    .filter((x) => !q || x.data.nomor.toLowerCase().includes(q) || namaPelanggan(x.data.pelangganId).toLowerCase().includes(q))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));

  const jual = hariItu.filter((x): x is Extract<Baris, { jenis: 'jual' }> => x.jenis === 'jual');
  const omzet = jual.reduce((t, x) => t + x.data.total, 0);
  const returPeriode = hariItu.reduce((t, x) => t + (x.jenis === 'retur' ? x.data.nilaiRetur : 0), 0);
  const banyak = (j: Jenis) => (j === 'semua' ? hariItu.length : hariItu.filter((x) => x.jenis === j).length);
  const adaRetur = (notaId: string) => toko.retur.some((r) => r.notaId === notaId);

  const nilai = (x: Baris) => (x.jenis === 'jual' ? x.data.total : x.jenis === 'kasbon' ? x.data.jumlah : -x.data.nilaiRetur);
  const kasbonMasuk = hariItu.reduce((t, x) => t + (x.jenis === 'kasbon' ? x.data.jumlah : 0), 0);

  return (
    <div className="ps-halaman">
      <BilahAtas kanan={<Link to="/kasir/penjualan" className="tombol tombol--utama">+ Penjualan baru</Link>} />
      <KartuRingkas item={[
        { judul: `Penjualan · ${teksPeriode(periode)}`, nilai: rupiah(omzet), catatan: `${jual.length} nota${jual.length ? ` · rata-rata ${rupiah(Math.round(omzet / jual.length))}` : ''}` },
        { judul: 'Bayar kasbon', nilai: rupiah(kasbonMasuk), catatan: `${banyak('kasbon')} pembayaran` },
        { judul: 'Retur', nilai: rupiah(returPeriode), catatan: `${banyak('retur')} retur`, warna: returPeriode ? 'merah' : undefined },
      ]} />
      <KotakFilter ringkas={[teksPeriode(periode), { semua: 'semua jenis', jual: 'penjualan', kasbon: 'bayar kasbon', retur: 'retur' }[jenis], q && `"${cari}"`].filter(Boolean).join(' · ')}>
        <PilihPeriode onUbah={setPeriode} />
        <div className="rt-filter">
          <label className="isian">
            Cari
            <input className="isian__kontrol" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="nomor nota atau pelanggan" />
          </label>
        </div>
        <PilihanChip label="Jenis transaksi" nilai={jenis} onUbah={setJenis} pilihan={[
          { k: 'semua', judul: 'Semua', jumlah: banyak('semua') }, { k: 'jual', judul: 'Penjualan', jumlah: banyak('jual') },
          { k: 'kasbon', judul: 'Bayar kasbon', jumlah: banyak('kasbon') }, { k: 'retur', judul: 'Retur', jumlah: banyak('retur') },
        ]} />
      </KotakFilter>
      <TabelDaftar
        data={tampil}
        kunci={(x) => `${x.jenis}-${x.data.id}`}
        onKlik={setBuka}
        kosong={<><h2>Tidak ada transaksi</h2><p className="teks-pudar">Tidak ada transaksi {jenis !== 'semua' ? 'jenis ini ' : ''}pada periode ini.</p></>}
        kolom={[
          { judul: 'Tanggal', isi: (x) => <Sel utama={new Date(`${tglBaris(x)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} bawah={x.jenis === 'kasbon' ? undefined : jam(x.waktuIso)} /> },
          { judul: 'No. transaksi', isi: (x) => <strong>{x.data.nomor}</strong> },
          { judul: 'Jenis', isi: (x) => (x.jenis === 'jual'
            ? <span className="chip-status chip-status--abu">Penjualan</span>
            : x.jenis === 'kasbon' ? <span className="chip-status chip-status--biru">Bayar kasbon</span> : <span className="chip-status chip-status--merah">Retur</span>) },
          { judul: 'Pelanggan', isi: (x) => namaPelanggan(x.data.pelangganId) },
          { judul: 'Keterangan', bungkus: true, isi: (x) => (x.jenis === 'jual'
            ? <Sel utama={`${x.data.baris.length} barang · ${caraBayar(x.data)}`} bawah={adaRetur(x.data.id) ? 'ada retur' : undefined} />
            : x.jenis === 'kasbon' ? `${x.data.metode}${x.data.bank ? ` ${x.data.bank}` : ''} · ${x.data.alokasi.map((a) => a.nomor).join(', ')}`
            : `dari ${x.data.nomorAsal ?? 'tanpa nota'} · ${x.data.alasan}`) },
          { judul: 'Nilai', kanan: true, isi: (x) => <strong className={nilai(x) < 0 ? 'teks-bahaya' : ''}>{nilai(x) < 0 ? '−' : ''}{rupiah(Math.abs(nilai(x)))}</strong>,
            total: rupiah(tampil.reduce((t, x) => t + nilai(x), 0)) },
        ]}
      />

      {buka?.jenis === 'jual' && (
        <DialogNotaRiwayat
          nota={buka.data}
          onRetur={() => navigasi(`/kasir/retur/baru?nota=${buka.data.id}`)}
          onTutup={() => setBuka(null)}
        />
      )}
      {buka?.jenis === 'kasbon' && <DialogStrukKasbon bayar={buka.data} nama={namaPelanggan(buka.data.pelangganId)} onTutup={() => setBuka(null)} />}
      {buka?.jenis === 'retur' && <DialogStrukRetur retur={buka.data} onTutup={() => setBuka(null)} />}
    </div>
  );
}

function DialogNotaRiwayat({ nota, onRetur, onTutup }: { nota: NotaPenjualan; onRetur: () => void; onTutup: () => void }) {
  const [info, setInfo] = useState('');
  return (
    <Dialog
      judul={`Nota ${nota.nomor}`}
      onTutup={onTutup}
      lebar={420}
      kaki={
        <>
          <div className="baris-tombol">
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, salinan struk masuk antrian stasiun printer.')}>Cetak ulang</button>
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, struk diunduh sebagai gambar/PDF.')}>Unduh</button>
            <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, struk dikirim ke WhatsApp pelanggan.')}>WhatsApp</button>
          </div>
          {info && <p className="catatan catatan--info" style={{ margin: 0 }}>{info}</p>}
          <button type="button" className="tombol tombol--besar" onClick={onRetur}>Retur barang dari nota ini</button>
        </>
      }
    >
      <IsiStruk nota={nota.struk} salinan />
    </Dialog>
  );
}
