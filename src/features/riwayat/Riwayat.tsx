import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
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
  const [tanggal, setTanggal] = useState(hariIni());
  const [jenis, setJenis] = useState<Jenis>('semua');
  const [cari, setCari] = useState('');
  const [buka, setBuka] = useState<Baris | null>(null);

  const semua: Baris[] = [
    ...toko.penjualan.map((d) => ({ jenis: 'jual' as const, waktuIso: d.waktuIso, data: d })),
    // pembayaran kasbon yang berdiri sendiri (bukan bagian dari nota belanja/retur)
    ...toko.bayarKasbon.filter((b) => b.lewat === 'kasbon').map((d) => ({ jenis: 'kasbon' as const, waktuIso: `${d.tanggal}T12:00:00`, data: d })),
    ...toko.retur.map((d) => ({ jenis: 'retur' as const, waktuIso: d.waktuIso, data: d })),
  ];
  const hariItu = semua.filter((x) => (x.jenis === 'kasbon' ? x.data.tanggal : isoHari(new Date(x.waktuIso))) === tanggal);
  const q = cari.trim().toLowerCase();
  const tampil = hariItu
    .filter((x) => jenis === 'semua' || x.jenis === jenis)
    .filter((x) => !q || x.data.nomor.toLowerCase().includes(q) || namaPelanggan(x.data.pelangganId).toLowerCase().includes(q))
    .sort((a, b) => b.waktuIso.localeCompare(a.waktuIso));

  const jual = hariItu.filter((x): x is Extract<Baris, { jenis: 'jual' }> => x.jenis === 'jual');
  const omzet = jual.reduce((t, x) => t + x.data.total, 0);
  const banyak = (j: Jenis) => (j === 'semua' ? hariItu.length : hariItu.filter((x) => x.jenis === j).length);
  const adaRetur = (notaId: string) => toko.retur.some((r) => r.notaId === notaId);

  return (
    <div className="ps-halaman">
      <div className="kb-ringkas">
        <div className="kartu kb-angka">
          <span className="teks-pudar">Penjualan</span>
          <strong>{rupiah(omzet)}</strong>
          <span className="teks-pudar">{jual.length} nota</span>
        </div>
        <div className="kartu kb-angka">
          <span className="teks-pudar">Tanggal</span>
          <input type="date" className="isian__kontrol" max={hariIni()} value={tanggal} onChange={(e) => setTanggal(e.target.value || hariIni())} aria-label="Tanggal" />
        </div>
      </div>

      <div className="ps-atas">
        <div className="pj__kategori" role="group" aria-label="Jenis transaksi">
          {([['semua', 'Semua'], ['jual', 'Penjualan'], ['kasbon', 'Bayar kasbon'], ['retur', 'Retur']] as [Jenis, string][]).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={jenis === k} onClick={() => setJenis(k)}>{t}<span className="ps-hitung">{banyak(k)}</span></button>
          ))}
        </div>
      </div>
      <label className="pj__cari-kotak" style={{ maxWidth: 480 }}>
        <span className="sr">Cari</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nomor nota atau pelanggan" autoComplete="off" />
      </label>

      {tampil.length === 0 ? (
        <div className="kartu ps-kosong-besar">
          <h2>Tidak ada transaksi</h2>
          <p className="teks-pudar">Tidak ada transaksi {jenis !== 'semua' ? 'jenis ini ' : ''}pada tanggal ini. Ganti tanggal untuk melihat hari lain.</p>
        </div>
      ) : (
        <div className="kartu rw-daftar">
          {tampil.map((x) => (
            <button key={`${x.jenis}-${x.data.id}`} type="button" className="rw-baris" onClick={() => setBuka(x)}>
              <span className="rw-baris__kiri">
                <span className="rw-baris__nomor">
                  <strong>{x.data.nomor}</strong>
                  {x.jenis === 'jual' && <span className="chip-status chip-status--abu">{caraBayar(x.data)}</span>}
                  {x.jenis === 'jual' && adaRetur(x.data.id) && <span className="chip-status chip-status--kuning">Ada retur</span>}
                  {x.jenis === 'kasbon' && <span className="chip-status chip-status--biru">Bayar kasbon</span>}
                  {x.jenis === 'retur' && <span className="chip-status chip-status--merah">Retur</span>}
                </span>
                <span className="teks-pudar">
                  {x.jenis === 'kasbon' ? x.data.waktu : jam(x.waktuIso)} · {namaPelanggan(x.data.pelangganId)}
                  {x.jenis === 'jual' && ` · ${x.data.baris.length} barang`}
                  {x.jenis === 'retur' && x.data.nomorAsal && ` · dari ${x.data.nomorAsal}`}
                </span>
              </span>
              <strong className="rw-baris__nilai">
                {x.jenis === 'jual' ? rupiah(x.data.total) : x.jenis === 'kasbon' ? rupiah(x.data.jumlah) : `−${rupiah(x.data.nilaiRetur)}`}
              </strong>
            </button>
          ))}
        </div>
      )}

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
