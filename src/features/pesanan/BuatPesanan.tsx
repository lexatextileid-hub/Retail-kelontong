import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { diskonContoh, pelangganContoh, produkContoh } from '../../data/contoh';
import { buatPesanan, jumlahDasar, stokBebas, useToko, type BarisBaru } from '../../data/toko';
import { hitungHargaBaris } from '../../domain/harga';
import type { Produk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { DialogAturBarang } from '../penjualan/DialogSatuan';
import { ambilProduk, idBaru } from '../penjualan/model';
import { besok, labelDasar, labelJumlah } from './bersama';
import '../../styles/pesanan.css';

type Baris = BarisBaru & { id: string };

export function BuatPesanan() {
  useToko();
  const navigasi = useNavigate();
  const terdaftar = pelangganContoh.filter((p) => p.jenis === 'terdaftar');
  const [pelangganId, setPelangganId] = useState(terdaftar[0].id);
  const [cara, setCara] = useState<'ambil' | 'antar'>('ambil');
  const [alamat, setAlamat] = useState('');
  const [tanggal, setTanggal] = useState(besok());
  const [catatan, setCatatan] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [dp, setDp] = useState(0);
  const [dpMetode, setDpMetode] = useState<'tunai' | 'transfer'>('tunai');
  const [cari, setCari] = useState('');
  const [atur, setAtur] = useState<{ produk: Produk; barisId?: string } | null>(null);

  const plg = terdaftar.find((p) => p.id === pelangganId)!;
  const q = cari.trim().toLowerCase();
  const hasilCari = q
    ? produkContoh.filter((p) => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q)).slice(0, 8)
    : [];

  // Perkiraan stok: baris lebih awal memakai stok lebih dulu.
  const terpakai: Record<string, number> = {};
  const rinci = baris.map((b) => {
    const p = ambilProduk(b.produkId);
    const h = hitungHargaBaris(p, b.satuanProdukId, b.qty, plg, diskonContoh, b.diskonManual, b.hargaManual);
    const total = jumlahDasar(b);
    const bebas = Math.max(0, stokBebas(b.produkId) - (terpakai[b.produkId] ?? 0));
    const dariStok = total <= bebas ? total : 0;
    terpakai[b.produkId] = (terpakai[b.produkId] ?? 0) + dariStok;
    return { b, p, h, total, dariStok, perluOrder: total - dariStok };
  });
  const total = rinci.reduce((t, x) => t + x.h.netto, 0);
  const adaOrder = rinci.some((x) => x.perluOrder > 0);
  const siap = baris.length > 0 && (cara === 'ambil' || alamat.trim()) && dp <= total;

  const simpan = () => {
    if (!siap) return;
    const id = buatPesanan({
      pelangganId, cara, alamat: cara === 'antar' ? alamat.trim() : undefined, tanggalJanji: tanggal,
      catatan: catatan.trim() || undefined,
      baris: baris.map(({ id: _, ...b }) => b),
      dp: dp > 0 ? { jumlah: dp, metode: dpMetode } : undefined,
    });
    navigasi(`/kasir/pesanan/detail/${id}`);
  };

  return (
    <div className="ps-halaman">
      <div className="ps-buat">
        <section className="ps-kolom">
          <div className="kartu tumpuk">
            <h2>Pelanggan</h2>
            <div className="dua-kolom">
              <label className="isian">
                Pelanggan terdaftar
                <select id="ps-pelanggan" className="isian__kontrol" value={pelangganId} onChange={(e) => setPelangganId(e.target.value)}>
                  {terdaftar.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select>
                <span className="isian__bantuan">Pesanan hanya untuk pelanggan terdaftar (bisa tempo).</span>
              </label>
              <label className="isian">
                Tanggal ambil / antar
                <input id="ps-tanggal" type="date" className="isian__kontrol" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </label>
            </div>
            <div className="isian">
              Cara serah
              <div className="saklar" role="group" aria-label="Cara serah" style={{ alignSelf: 'flex-start' }}>
                <button type="button" aria-pressed={cara === 'ambil'} onClick={() => setCara('ambil')}>Diambil</button>
                <button type="button" aria-pressed={cara === 'antar'} onClick={() => setCara('antar')}>Diantar</button>
              </div>
            </div>
            {cara === 'antar' && (
              <label className="isian">
                Alamat antar
                <input id="ps-alamat" className="isian__kontrol" value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="mis. Pasar Blok C no. 12" />
              </label>
            )}
            <label className="isian">
              Catatan (opsional)
              <input id="ps-catatan" className="isian__kontrol" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </label>
          </div>

          <div className="kartu tumpuk">
            <h2>Barang</h2>
            <label className="pj__cari-kotak">
              <span className="sr">Cari barang</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input id="ps-cari" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, SKU, kode" autoComplete="off" />
            </label>
            {hasilCari.length > 0 && (
              <ul className="ps-hasil">
                {hasilCari.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setAtur({ produk: p }); setCari(''); }}>
                      <span>{p.nama}</span>
                      <span className="teks-pudar">{p.sku} · stok bebas {labelDasar(p.id, stokBebas(p.id))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q && hasilCari.length === 0 && <p className="teks-pudar" style={{ margin: 0 }}>Barang tidak ditemukan. Barang belum terdaftar bisa diminta lewat Surat Pesanan oleh admin.</p>}

            {rinci.length === 0 ? (
              <p className="ps-kosong">Belum ada barang. Cari barang di atas untuk menambahkan.</p>
            ) : (
              <ul className="ps-baris">
                {rinci.map(({ b, p, h, total: td, perluOrder }) => (
                  <li key={b.id}>
                    <button type="button" className="ps-baris__klik" onClick={() => setAtur({ produk: p, barisId: b.id })}>
                      <span className="ps-baris__atas">
                        <strong>{p.nama}</strong>
                        <strong>{rupiah(h.netto)}</strong>
                      </span>
                      <span className="teks-pudar">
                        {labelJumlah(b.produkId, b.satuanProdukId, b.qty)} × {rupiah(h.hargaSatuan)}
                        {h.diskon > 0 && ` · diskon −${rupiah(h.diskon)}`}
                        {h.hargaDiubah && ' · harga diubah'}
                      </span>
                    </button>
                    <span className={perluOrder === 0 ? 'chip-status chip-status--biru' : 'chip-status chip-status--merah'} style={{ whiteSpace: 'normal' }}>
                      {perluOrder === 0
                        ? `Stok ada · dikunci ${labelDasar(p.id, td)}`
                        : `Perlu order ${labelDasar(p.id, perluOrder)} (stok bebas ${labelDasar(p.id, Math.max(0, stokBebas(p.id)))} tetap untuk eceran)`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="ps-ringkas kartu tumpuk">
          <h2>Ringkasan</h2>
          <div className="ringkas-total"><span>{baris.length} barang · {plg.nama}</span></div>
          <div className="ringkas-total ringkas-total--besar"><span>Total pesanan</span><strong>{rupiah(total)}</strong></div>
          {adaOrder && (
            <p className="catatan catatan--peringatan">
              Ada barang yang stoknya belum ada. Setelah disimpan, admin membuat Surat Pesanan ke distributor. Harga bisa disesuaikan saat faktur masuk.
            </p>
          )}
          <label className="isian" htmlFor="ps-dp">
            Uang muka / DP (opsional)
            <InputRupiah id="ps-dp" nilai={dp} onUbah={setDp} />
          </label>
          {dp > 0 && (
            <div className="saklar" role="group" aria-label="Metode DP" style={{ alignSelf: 'flex-start' }}>
              <button type="button" aria-pressed={dpMetode === 'tunai'} onClick={() => setDpMetode('tunai')}>Tunai</button>
              <button type="button" aria-pressed={dpMetode === 'transfer'} onClick={() => setDpMetode('transfer')}>Transfer</button>
            </div>
          )}
          {dp > total && <p className="catatan catatan--bahaya">DP melebihi total pesanan.</p>}
          <div className="ringkas-total"><span>Sisa tagihan</span><strong>{rupiah(Math.max(0, total - dp))}</strong></div>
          <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan pesanan</button>
          {cara === 'antar' && !alamat.trim() && baris.length > 0 && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Isi alamat antar dulu.</p>}
        </aside>
      </div>

      {atur && (
        <DialogAturBarang
          key={atur.barisId ?? atur.produk.id}
          produk={atur.produk}
          pelanggan={plg}
          daftarDiskon={diskonContoh}
          bolehUbahHarga
          teksTombol={atur.barisId ? 'Simpan perubahan' : 'Tambah ke pesanan'}
          awal={atur.barisId ? baris.find((b) => b.id === atur.barisId) : undefined}
          onSimpan={(h) => {
            if (atur.barisId) setBaris((xs) => xs.map((b) => (b.id === atur.barisId ? { ...b, ...h } : b)));
            else setBaris((xs) => [...xs, { id: idBaru(), produkId: atur.produk.id, ...h }]);
            setAtur(null);
          }}
          onHapus={atur.barisId ? () => { setBaris((xs) => xs.filter((b) => b.id !== atur.barisId)); setAtur(null); } : undefined}
          onTutup={() => setAtur(null)}
        />
      )}
    </div>
  );
}
