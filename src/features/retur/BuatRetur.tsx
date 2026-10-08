import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DialogPilihBarang } from '../../components/DialogPilihBarang';
import { bankContoh, diskonContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import {
  barisReturPesanan, pelangganDenganKasbon, ringkasPesanan, simpanRetur, sudahDiretur, useToko,
  type BarisRetur, type BarisTukar, type CaraSelisih, type Retur,
} from '../../data/toko';
import { hitungHargaBaris } from '../../domain/harga';
import { cekBatasRetur, nilaiRetur, selisihTukar } from '../../domain/retur';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { DialogAturBarang } from '../penjualan/DialogSatuan';
import { ambilProduk, ambilSatuan, angka, bolehDesimal, idBaru } from '../penjualan/model';
import { labelDasar, labelJumlah, namaPelanggan } from '../pesanan/bersama';
import { DialogStrukRetur } from './DialogRetur';
import { tanggalPendek } from '../kasbon/bersama';
import '../../styles/pesanan.css';
import '../../styles/penjualan.css';
import '../../styles/kasbon.css';

type Sumber = 'nota' | 'pesanan' | 'tanpa-nota';

/** Baris yang bisa diretur (dari nota / pesanan / ketik manual), seragam. */
interface Kandidat {
  id: string;
  produkId: string;
  satuanProdukId: string;
  isi: number; // satuan dasar per satuan
  jumlahDasar: number; // yang dibeli
  sisaDasar: number; // yang masih bisa diretur
  nilaiBaris: number; // nilai uang seluruh baris setelah semua diskon
}

const ALASAN = ['Rusak / cacat', 'Kedaluwarsa', 'Salah barang', 'Tidak jadi', 'Kelebihan beli'];

export function BuatRetur() {
  const toko = useToko();
  const [params, setParams] = useSearchParams();
  const awalNota = params.get('nota');
  const awalPesanan = params.get('pesanan');
  const [sumber, setSumber] = useState<Sumber>(awalPesanan ? 'pesanan' : 'nota');
  const [notaId, setNotaId] = useState<string | null>(awalNota);
  const [pesananId, setPesananId] = useState<string | null>(awalPesanan);
  const [plgManual, setPlgManual] = useState('umum');
  const [cari, setCari] = useState('');
  const [fTanggal, setFTanggal] = useState('');
  const [fPelanggan, setFPelanggan] = useState('');
  const [isi, setIsi] = useState<Record<string, { qty: number; kondisi: 'bagus' | 'rusak' }>>({});
  const [manual, setManual] = useState<{ id: string; produkId: string; satuanProdukId: string; isi: number; qty: number; hargaPerSatuan: number }[]>([]);
  const [tukar, setTukar] = useState<(BarisTukar & { id: string })[]>([]);
  const [pilihBarang, setPilihBarang] = useState<null | 'retur' | 'tukar'>(null);
  const [atur, setAtur] = useState<null | { untuk: 'retur' | 'tukar'; produk: Produk }>(null);
  const [cara, setCara] = useState<CaraSelisih>('tunai');
  const [bank, setBank] = useState('');
  const [alasan, setAlasan] = useState('');
  const [pin, setPin] = useState('');
  const [hasil, setHasil] = useState<Retur | null>(null);

  const aturan = toko.aturanRetur;
  const sekarangIso = new Date().toISOString();
  const nota = notaId ? toko.penjualan.find((n) => n.id === notaId) : undefined;
  const pesanan = pesananId ? toko.pesanan.find((p) => p.id === pesananId) : undefined;
  const pelangganId = sumber === 'nota' ? nota?.pelangganId : sumber === 'pesanan' ? pesanan?.pelangganId : plgManual;
  const plg = pelangganId ? pelangganDenganKasbon(pelangganId, toko) : undefined;

  // Umur nota / serah terima terakhir
  const waktuAsal = sumber === 'nota' ? nota?.waktuIso : sumber === 'pesanan' && pesanan?.serah.length ? `${pesanan.serah[pesanan.serah.length - 1].tanggal}T23:59:00` : undefined;
  const batas = waktuAsal ? cekBatasRetur(waktuAsal, sekarangIso, aturan.batasHari) : null;
  const lewatBatas = !!batas && !batas.dalamBatas;
  const pengecualian = sumber === 'tanpa-nota' ? 'Tanpa nota (harga jual sekarang)' : lewatBatas ? `Lewat batas ${aturan.batasHari}×24 jam` : undefined;
  const diblokir = (lewatBatas && !aturan.lewatBatasDenganPin) || (sumber === 'tanpa-nota' && !aturan.tanpaNotaDenganPin);

  // Kandidat baris retur
  const kandidat: Kandidat[] =
    sumber === 'nota' && nota
      ? nota.baris.map((b) => ({
          id: b.id, produkId: b.produkId, satuanProdukId: b.satuanProdukId, isi: ambilSatuan(ambilProduk(b.produkId), b.satuanProdukId).isi,
          jumlahDasar: b.jumlahDasar, sisaDasar: b.jumlahDasar - sudahDiretur({ notaId: nota.id }, b.id, toko), nilaiBaris: b.nilai,
        }))
      : sumber === 'pesanan' && pesanan
        ? barisReturPesanan(pesanan).map((b) => ({
            id: b.id, produkId: b.produkId, satuanProdukId: b.satuanProdukId, isi: ambilSatuan(ambilProduk(b.produkId), b.satuanProdukId).isi,
            jumlahDasar: b.jumlahDasar, sisaDasar: b.jumlahDasar - sudahDiretur({ pesananId: pesanan.id }, b.id, toko), nilaiBaris: b.nilai,
          }))
        : manual.map((m) => ({
            id: m.id, produkId: m.produkId, satuanProdukId: m.satuanProdukId, isi: m.isi,
            jumlahDasar: m.qty * m.isi, sisaDasar: m.qty * m.isi, nilaiBaris: Math.round(m.hargaPerSatuan * m.qty),
          }));

  const qtyBaris = (k: Kandidat) => (sumber === 'tanpa-nota' ? (manual.find((m) => m.id === k.id)?.qty ?? 0) : (isi[k.id]?.qty ?? 0));
  const kondisi = (k: Kandidat) => isi[k.id]?.kondisi ?? 'bagus';
  const barisRetur: BarisRetur[] = kandidat
    .map((k) => {
      const jd = Math.min(qtyBaris(k) * k.isi, k.sisaDasar);
      return {
        produkId: k.produkId, satuanProdukId: k.satuanProdukId, asalBarisId: sumber === 'tanpa-nota' ? undefined : k.id,
        jumlahDasar: jd, nilai: nilaiRetur(k.nilaiBaris, k.jumlahDasar, jd), kondisi: kondisi(k),
      };
    })
    .filter((b) => b.jumlahDasar > 0);
  const totalRetur = barisRetur.reduce((t, b) => t + b.nilai, 0);
  const totalTukar = tukar.reduce((t, b) => t + b.netto, 0);
  const selisih = selisihTukar(totalRetur, totalTukar);

  const terdaftar = plg?.jenis === 'terdaftar';
  const sisaTagihanPesanan = pesanan ? ringkasPesanan(pesanan).sisa : 0;
  const pilihanCara: { k: CaraSelisih; t: string; boleh: boolean; ket?: string }[] =
    selisih > 0
      ? [
          { k: 'tunai', t: 'Uang kembali tunai', boleh: true },
          { k: 'transfer', t: 'Uang kembali transfer', boleh: true },
          { k: 'kasbon', t: 'Potong kasbon', boleh: terdaftar && (plg?.saldoKasbon ?? 0) >= selisih, ket: terdaftar ? `kasbon ${rupiah(plg?.saldoKasbon ?? 0)}` : 'hanya pelanggan terdaftar' },
          ...(sumber === 'pesanan' ? [{ k: 'tagihan-pesanan' as const, t: 'Potong tagihan pesanan', boleh: sisaTagihanPesanan >= selisih, ket: `sisa ${rupiah(sisaTagihanPesanan)}` }] : []),
        ]
      : selisih < 0
        ? [
            { k: 'tunai', t: 'Tambah bayar tunai', boleh: true },
            { k: 'transfer', t: 'Tambah bayar transfer', boleh: true },
            { k: 'kasbon', t: 'Jadikan kasbon', boleh: terdaftar, ket: terdaftar ? undefined : 'hanya pelanggan terdaftar' },
          ]
        : [];
  const caraAktif: CaraSelisih = selisih === 0 ? 'pas' : pilihanCara.find((p) => p.k === cara && p.boleh) ? cara : 'tunai';

  const perluPin = toko.peran !== 'pemilik';
  const siap = !!pelangganId && barisRetur.length > 0 && !!alasan.trim() && !diblokir && (!perluPin || pin === PIN_PEMILIK_CONTOH);

  const ulang = () => {
    setNotaId(null); setPesananId(null); setIsi({}); setManual([]); setTukar([]); setAlasan(''); setPin(''); setBank(''); setCara('tunai');
    setParams({});
  };
  const simpan = () => {
    if (!siap || !pelangganId) return;
    const r = simpanRetur({
      sumber, notaId: nota?.id, pesananId: pesanan?.id, nomorAsal: nota?.nomor ?? pesanan?.nomor, pelangganId,
      baris: barisRetur, tukar: tukar.map(({ id: _, ...t }) => t), nilaiRetur: totalRetur, nilaiTukar: totalTukar, selisih,
      cara: caraAktif, bank: caraAktif === 'transfer' ? bank.trim() || undefined : undefined, alasan: alasan.trim(),
      pengecualian: pengecualian ? `${pengecualian}, disetujui PIN pemilik` : undefined,
    });
    setHasil(r);
  };

  // Filter pencarian transaksi (seperti daftar transaksi di Loyverse/Majoo): nomor, tanggal, pelanggan.
  const q = cari.trim().toLowerCase();
  const cocok = (nomor: string, pid: string, tgl: string) =>
    (!q || nomor.toLowerCase().includes(q)) && (!fTanggal || tgl === fTanggal) && (!fPelanggan || pid === fPelanggan);
  const daftarNota = toko.penjualan.filter((n) => cocok(n.nomor, n.pelangganId, n.tanggal)).slice(0, 30);
  const daftarPesanan = toko.pesanan
    .filter((p) => !p.dibatalkan && p.serah.length > 0)
    .filter((p) => cocok(p.nomor, p.pelangganId, p.serah[p.serah.length - 1].tanggal));
  const umurTeks = (iso: string) => {
    const b = cekBatasRetur(iso, sekarangIso, aturan.batasHari);
    const jam = Math.max(0, Math.floor(b.umurJam));
    return { teks: jam < 24 ? `${jam} jam lalu` : `${Math.floor(jam / 24)} hari lalu`, lewat: !b.dalamBatas };
  };

  const asalDipilih = (sumber === 'nota' && nota) || (sumber === 'pesanan' && pesanan) || sumber === 'tanpa-nota';

  return (
    <div className="ps-halaman">
      <ol className="rt-langkah" aria-label="Langkah">
        <li className={!asalDipilih ? 'aktif' : 'selesai'}><span>1</span>Pilih transaksi</li>
        <li className={asalDipilih ? 'aktif' : ''}><span>2</span>Barang & penyelesaian</li>
      </ol>

      {/* 1. Pilih transaksi */}
      {!asalDipilih && (
        <div className="kartu tumpuk">
          <div className="kb-judul">
            <div className="saklar" role="group" aria-label="Jenis transaksi">
              <button type="button" aria-pressed={sumber === 'nota'} onClick={() => setSumber('nota')}>Nota penjualan</button>
              <button type="button" aria-pressed={sumber === 'pesanan'} onClick={() => setSumber('pesanan')}>Pesanan</button>
            </div>
            <span className="teks-pudar" style={{ fontSize: 12.5 }}>
              Batas retur {aturan.batasHari}×24 jam{aturan.lewatBatasDenganPin ? ' · lewat batas dengan PIN pemilik' : ''}
            </span>
          </div>
          <div className="rt-filter">
            <label className="pj__cari-kotak">
              <span className="sr">Nomor</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder={sumber === 'nota' ? 'Nomor nota, mis. 0230' : 'Nomor pesanan'} autoFocus />
            </label>
            <label className="isian">
              <span className="sr">Tanggal</span>
              <input type="date" className="isian__kontrol" aria-label="Tanggal" value={fTanggal} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setFTanggal(e.target.value)} />
            </label>
            <label className="isian">
              <span className="sr">Pelanggan</span>
              <select className="isian__kontrol" aria-label="Pelanggan" value={fPelanggan} onChange={(e) => setFPelanggan(e.target.value)}>
                <option value="">Semua pelanggan</option>
                {toko.pelanggan.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </label>
            {(cari || fTanggal || fPelanggan) && (
              <button type="button" className="tautan" onClick={() => { setCari(''); setFTanggal(''); setFPelanggan(''); }}>Hapus filter</button>
            )}
          </div>
          <div className="rw-daftar" style={{ padding: 0 }}>
            {sumber === 'nota' &&
              daftarNota.map((n) => {
                const u = umurTeks(n.waktuIso);
                const sudah = toko.retur.some((r) => r.notaId === n.id);
                return (
                  <button key={n.id} type="button" className="rw-baris" onClick={() => setNotaId(n.id)}>
                    <span className="rw-baris__kiri">
                      <span className="rw-baris__nomor">
                        <strong>{n.nomor}</strong>
                        {u.lewat && <span className="chip-status chip-status--merah">Lewat batas</span>}
                        {sudah && <span className="chip-status chip-status--kuning">Pernah diretur</span>}
                      </span>
                      <span className="teks-pudar">{tanggalPendek(n.tanggal)} · {u.teks} · {namaPelanggan(n.pelangganId)} · {n.baris.length} barang</span>
                    </span>
                    <strong className="rw-baris__nilai">{rupiah(n.total)}</strong>
                  </button>
                );
              })}
            {sumber === 'pesanan' &&
              daftarPesanan.map((p) => {
                const sj = p.serah[p.serah.length - 1];
                const u = umurTeks(`${sj.tanggal}T23:59:00`);
                return (
                  <button key={p.id} type="button" className="rw-baris" onClick={() => setPesananId(p.id)}>
                    <span className="rw-baris__kiri">
                      <span className="rw-baris__nomor">
                        <strong>{p.nomor}</strong>
                        {u.lewat && <span className="chip-status chip-status--merah">Lewat batas</span>}
                      </span>
                      <span className="teks-pudar">diserahkan {tanggalPendek(sj.tanggal)} · {namaPelanggan(p.pelangganId)}</span>
                    </span>
                    <strong className="rw-baris__nilai">{rupiah(ringkasPesanan(p).nilaiDiserahkan)}</strong>
                  </button>
                );
              })}
            {sumber === 'nota' && daftarNota.length === 0 && <p className="ps-kosong">Nota tidak ditemukan. Ubah nomor, tanggal, atau pelanggan.</p>}
            {sumber === 'pesanan' && daftarPesanan.length === 0 && <p className="ps-kosong">Belum ada pesanan yang sudah diserahkan untuk filter ini.</p>}
          </div>
          {aturan.tanpaNotaDenganPin && (
            <p className="teks-pudar" style={{ margin: 0, fontSize: 13 }}>
              Pelanggan tidak bawa nota?{' '}
              <button type="button" className="tautan" onClick={() => setSumber('tanpa-nota')}>Retur tanpa nota</button> (pengecualian, PIN pemilik, harga jual sekarang).
            </p>
          )}
        </div>
      )}

      {asalDipilih && (
        <div className="ps-buat">
          <section className="ps-kolom">
            {/* Kepala asal */}
            <div className="kartu tumpuk">
              <div className="kb-judul">
                <h2>
                  {sumber === 'nota' ? nota!.nomor : sumber === 'pesanan' ? pesanan!.nomor : 'Retur tanpa nota'}
                  {plg && sumber !== 'tanpa-nota' && <span className="teks-pudar" style={{ fontWeight: 500, fontSize: 14 }}> · {plg.nama}</span>}
                </h2>
                <button type="button" className="tautan" onClick={() => { ulang(); setSumber(sumber === 'tanpa-nota' ? 'nota' : sumber); }}>{sumber === 'tanpa-nota' ? 'Kembali pilih nota' : 'Ganti transaksi'}</button>
              </div>
              {sumber === 'tanpa-nota' && (
                <label className="isian">
                  Pelanggan
                  <select className="isian__kontrol" value={plgManual} onChange={(e) => setPlgManual(e.target.value)}>
                    {toko.pelanggan.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                </label>
              )}
              {pengecualian && (
                <p className={`catatan ${diblokir ? 'catatan--bahaya' : 'catatan--peringatan'}`} style={{ margin: 0 }}>
                  {diblokir
                    ? `${pengecualian}. Retur tidak diizinkan oleh pengaturan.`
                    : `${pengecualian}. Boleh sebagai pengecualian dengan PIN pemilik.`}
                </p>
              )}
            </div>

            {/* 2. Barang yang dikembalikan */}
            <div className="kartu tumpuk">
              <h2>Barang dikembalikan</h2>
              {kandidat.length === 0 && <p className="ps-kosong">{sumber === 'tanpa-nota' ? 'Tambahkan barang yang dikembalikan.' : 'Tidak ada barang.'}</p>}
              {kandidat.map((k) => {
                const pr = ambilProduk(k.produkId);
                const s = ambilSatuan(pr, k.satuanProdukId);
                const desimal = bolehDesimal(s.satuanId);
                const maks = sumber === 'tanpa-nota' ? Infinity : k.sisaDasar / k.isi;
                const q2 = qtyBaris(k);
                const jd = Math.min(q2 * k.isi, k.sisaDasar);
                const ubahQty = (n: number) =>
                  sumber === 'tanpa-nota'
                    ? setManual((xs) => xs.map((m) => (m.id === k.id ? { ...m, qty: n } : m)))
                    : setIsi((m) => ({ ...m, [k.id]: { qty: Math.min(n, maks), kondisi: kondisi(k) } }));
                return (
                  <div key={k.id} className={`rt-baris ${jd > 0 ? 'rt-baris--pilih' : ''}`}>
                    <div className="rt-baris__info">
                      <strong>{pr.nama}</strong>
                      <span className="teks-pudar">
                        {sumber === 'tanpa-nota'
                          ? `${rupiah(manual.find((m) => m.id === k.id)?.hargaPerSatuan ?? 0)} per ${s.label.toLowerCase()} (harga jual sekarang)`
                          : `Dibeli ${labelDasar(k.produkId, k.jumlahDasar)} · nilai ${rupiah(k.nilaiBaris)}${k.sisaDasar < k.jumlahDasar ? ` · sudah diretur ${labelDasar(k.produkId, k.jumlahDasar - k.sisaDasar)}` : ''}`}
                      </span>
                    </div>
                    {k.sisaDasar <= 0 && sumber !== 'tanpa-nota' ? (
                      <span className="chip-status chip-status--abu">Sudah diretur semua</span>
                    ) : (
                      <div className="rt-baris__isian">
                        <div className="rt-qty">
                          <button type="button" className="tombol tombol--kecil" aria-label="Kurangi" onClick={() => ubahQty(Math.max(0, q2 - 1))}>−</button>
                          <input className="isian__kontrol" inputMode={desimal ? 'decimal' : 'numeric'} aria-label={`Jumlah retur ${pr.nama}`} value={q2 || ''} placeholder="0"
                            onChange={(e) => ubahQty(Number(e.target.value.replace(',', '.').replace(desimal ? /[^\d.]/g : /\D/g, '')) || 0)} />
                          <button type="button" className="tombol tombol--kecil" aria-label="Tambah" onClick={() => ubahQty(q2 + 1)}>+</button>
                          <span className="teks-pudar">{sumber === 'tanpa-nota' ? s.label : `dari ${angka(maks)} ${s.label}`}</span>
                        </div>
                        <div className="saklar saklar--kecil" role="group" aria-label={`Kondisi ${pr.nama}`}>
                          <button type="button" aria-pressed={kondisi(k) === 'bagus'} onClick={() => setIsi((m) => ({ ...m, [k.id]: { qty: m[k.id]?.qty ?? q2, kondisi: 'bagus' } }))}>Bagus</button>
                          <button type="button" aria-pressed={kondisi(k) === 'rusak'} onClick={() => setIsi((m) => ({ ...m, [k.id]: { qty: m[k.id]?.qty ?? q2, kondisi: 'rusak' } }))}>Rusak</button>
                        </div>
                        <strong className="rt-baris__nilai">{jd > 0 ? rupiah(nilaiRetur(k.nilaiBaris, k.jumlahDasar, jd)) : '-'}</strong>
                        {sumber === 'tanpa-nota' && <button type="button" className="tautan teks-bahaya" onClick={() => setManual((xs) => xs.filter((m) => m.id !== k.id))}>Hapus</button>}
                      </div>
                    )}
                  </div>
                );
              })}
              {sumber === 'tanpa-nota' && (
                <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} onClick={() => setPilihBarang('retur')}>+ Barang dikembalikan</button>
              )}
              <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
                Nilai memakai harga setelah diskon di nota{sumber === 'nota' ? ' (termasuk potongan akhir, dibagi sebanding)' : ''}. Bagus → masuk stok lagi. Rusak → ke Gudang · Barang Rusak.
              </p>
            </div>

            {/* 3. Tukar barang */}
            <div className="kartu tumpuk">
              <div className="kb-judul">
                <h2>Tukar dengan barang (opsional)</h2>
                <button type="button" className="tombol tombol--kecil" onClick={() => setPilihBarang('tukar')}>+ Barang pengganti</button>
              </div>
              {tukar.length === 0 ? (
                <p className="ps-kosong" style={{ padding: 0 }}>Tidak ditukar. Boleh barang yang sama atau barang lain.</p>
              ) : (
                tukar.map((t) => (
                  <div key={t.id} className="rt-baris">
                    <div className="rt-baris__info">
                      <strong>{ambilProduk(t.produkId).nama}</strong>
                      <span className="teks-pudar">{labelJumlah(t.produkId, t.satuanProdukId, t.qty)}</span>
                    </div>
                    <div className="rt-baris__isian">
                      <strong className="rt-baris__nilai">{rupiah(t.netto)}</strong>
                      <button type="button" className="tautan teks-bahaya" onClick={() => setTukar((xs) => xs.filter((x) => x.id !== t.id))}>Hapus</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Ringkasan */}
          <aside className="ps-ringkas kartu tumpuk">
            <h2>Ringkasan</h2>
            <div className="ringkas-total"><span>Nilai retur</span><strong>{rupiah(totalRetur)}</strong></div>
            {totalTukar > 0 && <div className="ringkas-total"><span>Barang pengganti</span><strong>−{rupiah(totalTukar)}</strong></div>}
            <div className="ringkas-total ringkas-total--besar">
              <span>{selisih > 0 ? 'Kembali ke pelanggan' : selisih < 0 ? 'Pelanggan tambah' : 'Selisih'}</span>
              <strong className={selisih < 0 ? 'teks-bahaya' : ''}>{rupiah(Math.abs(selisih))}</strong>
            </div>

            {selisih !== 0 && (
              <div className="rt-cara" role="radiogroup" aria-label="Cara">
                {pilihanCara.map((p) => (
                  <label key={p.k} className={`centang ${p.boleh ? '' : 'rt-cara--mati'}`}>
                    <input type="radio" name="cara" disabled={!p.boleh} checked={caraAktif === p.k} onChange={() => setCara(p.k)} />
                    <span>{p.t}{p.ket && <span className="teks-pudar"> · {p.ket}</span>}</span>
                  </label>
                ))}
              </div>
            )}
            {caraAktif === 'transfer' && (
              <div className="isian">
                Rekening (keterangan)
                <div className="kb-cepat">
                  {bankContoh.map((b) => (
                    <button key={b} type="button" className="tombol tombol--kecil" aria-pressed={bank === b} onClick={() => setBank(bank === b ? '' : b)}>{b}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="isian">
              Alasan retur
              <div className="kb-cepat">
                {ALASAN.map((a) => (
                  <button key={a} type="button" className="tombol tombol--kecil" aria-pressed={alasan === a} onClick={() => setAlasan(a)}>{a}</button>
                ))}
              </div>
              <input className="isian__kontrol" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="atau ketik alasan" />
            </div>

            {perluPin && (
              <label className="isian">
                PIN pemilik
                <input className="isian__kontrol" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
                {pin.length >= 4 && pin !== PIN_PEMILIK_CONTOH && <span className="teks-bahaya" style={{ fontSize: 12.5 }}>PIN salah.</span>}
              </label>
            )}
            <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan retur</button>
            {!siap && (
              <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
                {diblokir ? 'Tidak diizinkan pengaturan retur.' : barisRetur.length === 0 ? 'Isi jumlah barang yang dikembalikan.' : !alasan.trim() ? 'Pilih alasan retur.' : perluPin ? 'Isi PIN pemilik.' : ''}
              </p>
            )}
          </aside>
        </div>
      )}

      <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
        Aturan retur (batas waktu, pengecualian) diatur pemilik di Back Office · Pengaturan · Aturan. <Link to="../daftar" className="tautan">← Daftar retur</Link>
      </p>

      {pilihBarang && (
        <DialogPilihBarang
          judul={pilihBarang === 'retur' ? 'Barang dikembalikan' : 'Barang pengganti'}
          onPilih={(produk) => { setAtur({ untuk: pilihBarang, produk }); setPilihBarang(null); }}
          onTutup={() => setPilihBarang(null)}
        />
      )}
      {atur && plg && (
        <DialogAturBarang
          produk={atur.produk}
          pelanggan={plg}
          daftarDiskon={diskonContoh}
          bolehUbahHarga
          teksTombol={atur.untuk === 'retur' ? 'Tambah ke retur' : 'Tambah barang pengganti'}
          onSimpan={(h) => {
            const s = ambilSatuan(atur.produk, h.satuanProdukId);
            const hh = hitungHargaBaris(atur.produk, h.satuanProdukId, h.qty, plg, diskonContoh, h.diskonManual, h.hargaManual);
            if (atur.untuk === 'tukar') {
              setTukar((xs) => [...xs, { id: idBaru(), produkId: atur.produk.id, satuanProdukId: h.satuanProdukId, qty: h.qty, jumlahDasar: hh.jumlahDasar, netto: hh.netto }]);
            } else {
              setManual((xs) => [...xs, {
                id: idBaru(), produkId: atur.produk.id, satuanProdukId: h.satuanProdukId, isi: s.isi, qty: h.qty, hargaPerSatuan: hh.netto / h.qty,
              }]);
            }
            setAtur(null);
          }}
          onTutup={() => setAtur(null)}
        />
      )}
      {hasil && <DialogStrukRetur retur={hasil} judul={`Retur ${hasil.nomor} tersimpan`} onTutup={() => { setHasil(null); ulang(); }} />}
    </div>
  );
}
