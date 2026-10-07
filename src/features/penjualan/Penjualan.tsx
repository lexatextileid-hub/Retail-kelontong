import { useMemo, useState } from 'react';
import { diskonContoh, pelangganContoh, produkContoh, stokContoh, type PelangganContoh } from '../../data/contoh';
import { hitungHargaBaris } from '../../domain/harga';
import { kategoriBawaan } from '../../domain/kategoriBawaan';
import type { Produk } from '../../domain/tipe';
import { formatStok, rupiah } from '../../lib/format';
import { BarisKeranjang } from './BarisKeranjang';
import { DialogBayar, type HasilBayar } from './DialogBayar';
import { DialogDaftarSiapkan, DialogPelangganBaru, DialogStruk, DialogTahan } from './DialogLain';
import { DialogSatuan } from './DialogSatuan';
import {
  ambilProduk, ambilSatuan, angka, bolehDesimal, idBaru, jam, kosong, satuanJual, singkatan,
  type Keranjang, type Nota, type Tertahan,
} from './model';
import '../../styles/penjualan.css';

const KASIR = '[Kasir A]';

/** Satuan untuk menampilkan stok: satu per jenis satuan (isi terbesar), mis. "4 ktn 3 rtg 7 pcs". */
function satuanTampil(p: Produk) {
  const m = new Map<string, number>();
  for (const s of p.satuan) m.set(s.satuanId, Math.max(m.get(s.satuanId) ?? 0, s.isi));
  return [...m].map(([id, isi]) => ({ label: singkatan(id), isi }));
}

export function Penjualan() {
  const [pelanggan, setPelanggan] = useState<PelangganContoh[]>(pelangganContoh);
  const [aktif, setAktif] = useState<Keranjang>(kosong());
  const [tertahan, setTertahan] = useState<Tertahan[]>([]);
  const [cari, setCari] = useState('');
  const [kategori, setKategori] = useState('semua');
  const [pilihSatuan, setPilihSatuan] = useState<Produk | null>(null);
  const [dialog, setDialog] = useState<null | 'bayar' | 'tahan' | 'pelanggan'>(null);
  const [nota, setNota] = useState<Nota | null>(null);
  const [siapkan, setSiapkan] = useState<Tertahan | null>(null);
  const [nomor, setNomor] = useState(231);

  const plg = pelanggan.find((p) => p.id === aktif.pelangganId) ?? pelanggan[0];

  // Barang yang sedang dipesan (keranjang tertahan), dalam satuan dasar
  const dipesan = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tertahan)
      for (const b of t.keranjang.baris) {
        const s = ambilSatuan(ambilProduk(b.produkId), b.satuanProdukId);
        m.set(b.produkId, (m.get(b.produkId) ?? 0) + b.qty * s.isi);
      }
    return m;
  }, [tertahan]);

  const kategoriAda = kategoriBawaan.filter((k) => produkContoh.some((p) => p.kategoriId === k.kode));
  const q = cari.trim().toLowerCase();
  const daftarProduk = produkContoh.filter(
    (p) =>
      (kategori === 'semua' || p.kategoriId === kategori) &&
      (!q || p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.kode ?? '').toLowerCase().includes(q)),
  );

  const hasilBaris = aktif.baris.map((b) => ({
    baris: b,
    produk: ambilProduk(b.produkId),
    hasil: hitungHargaBaris(ambilProduk(b.produkId), b.satuanProdukId, b.qty, plg, diskonContoh, b.diskonManual),
  }));
  const subtotal = hasilBaris.reduce((t, x) => t + x.hasil.bruto, 0);
  const diskonPelanggan = hasilBaris.reduce((t, x) => t + x.hasil.diskon, 0);
  const total = subtotal - diskonPelanggan;

  const ubahBaris = (id: string, patch: Partial<Keranjang['baris'][number]>) =>
    setAktif((k) => ({ ...k, baris: k.baris.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const hapusBaris = (id: string) => setAktif((k) => ({ ...k, baris: k.baris.filter((b) => b.id !== id) }));

  const tambah = (produkId: string, satuanProdukId: string, qty: number) => {
    setAktif((k) => {
      const ada = k.baris.find((b) => b.produkId === produkId && b.satuanProdukId === satuanProdukId);
      const p = ambilProduk(produkId);
      const timbang = bolehDesimal(ambilSatuan(p, satuanProdukId).satuanId);
      if (ada && !timbang) return { ...k, baris: k.baris.map((b) => (b === ada ? { ...b, qty: b.qty + qty } : b)) };
      return { ...k, baris: [...k.baris, { id: idBaru(), produkId, satuanProdukId, qty }] };
    });
    setPilihSatuan(null);
  };

  const klikProduk = (p: Produk) => {
    const daftar = satuanJual(p);
    if (daftar.length === 1 && !bolehDesimal(daftar[0].satuanId)) tambah(p.id, daftar[0].id, 1);
    else setPilihSatuan(p);
  };

  const tahan = (nama: string, cetak: boolean) => {
    const t: Tertahan = { id: idBaru(), nama, waktu: jam(), keranjang: aktif };
    setTertahan((xs) => [...xs, t]);
    setAktif(kosong());
    setDialog(null);
    if (cetak) setSiapkan(t);
  };

  const buka = (t: Tertahan) => {
    setTertahan((xs) => {
      const sisa = xs.filter((x) => x.id !== t.id);
      return aktif.baris.length ? [...sisa, { id: idBaru(), nama: `Tanpa nama ${jam()}`, waktu: jam(), keranjang: aktif }] : sisa;
    });
    setAktif(t.keranjang);
  };

  const selesai = (h: HasilBayar) => {
    const no = `PJ-2610-${String(nomor).padStart(4, '0')}`;
    const sisaKasbon = plg.jenis === 'terdaftar' ? plg.saldoKasbon - h.bayarKasbon + h.kasbonBaru : undefined;
    setNota({
      nomor: no,
      waktu: `${new Date().toLocaleDateString('id-ID')} ${jam()}`,
      kasir: KASIR,
      pelanggan: plg.nama,
      baris: hasilBaris.map(({ baris, produk, hasil }) => {
        const s = ambilSatuan(produk, baris.satuanProdukId);
        return {
          nama: produk.nama,
          label: bolehDesimal(s.satuanId) ? singkatan(s.satuanId) : s.label,
          qty: baris.qty,
          hargaSatuan: hasil.hargaSatuan,
          bruto: hasil.bruto,
          diskon: hasil.diskon,
        };
      }),
      subtotal,
      diskonPelanggan,
      potongan: h.potongan,
      jenisPotongan: h.jenisPotongan,
      total: total - h.potongan,
      bayarKasbon: h.bayarKasbon,
      tunai: h.tunai,
      transfer: h.transfer,
      kembalian: h.kembalian,
      kasbonBaru: h.kasbonBaru,
      sisaKasbon,
    });
    if (sisaKasbon !== undefined)
      setPelanggan((ps) => ps.map((p) => (p.id === plg.id ? { ...p, saldoKasbon: sisaKasbon } : p)));
    setNomor((n) => n + 1);
    setDialog(null);
  };

  const simpanPelanggan = (nama: string, hp: string) => {
    const baru: PelangganContoh = {
      id: idBaru(), nama, hp, jenis: 'terdaftar', batasKasbon: 0, saldoKasbon: 0, notaKasbon: 0, notaTertuaHari: 0,
    };
    setPelanggan((ps) => [...ps, baru]);
    setAktif((k) => ({ ...k, pelangganId: baru.id }));
    setDialog(null);
  };

  const adaDiskon = (produkId: string) =>
    plg.jenis === 'terdaftar' && diskonContoh.some((d) => d.pelangganId === plg.id && d.produkId === produkId);

  return (
    <div className="pj">
      <section className="pj__barang" aria-label="Daftar barang">
        <div className="pj__cari">
          <label className="pj__cari-kotak">
            <span className="sr">Cari barang</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input id="cari-barang" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik nama, SKU, atau kode cepat (mis. SRM)" autoComplete="off" />
          </label>
        </div>

        <div className="pj__kategori" role="group" aria-label="Kategori">
          <button type="button" aria-pressed={kategori === 'semua'} onClick={() => setKategori('semua')}>Semua</button>
          {kategoriAda.map((k) => (
            <button key={k.kode} type="button" aria-pressed={kategori === k.kode} onClick={() => setKategori(k.kode)}>{k.nama}</button>
          ))}
        </div>

        <div className="pj__grid">
          {daftarProduk.map((p) => {
            const daftar = satuanJual(p);
            const kecil = daftar[0];
            const stok = stokContoh[p.id] ?? 0;
            const pesan = dipesan.get(p.id) ?? 0;
            const sd = singkatan(p.satuanDasarId);
            const harga =
              p.metodeHarga === 'bertingkat'
                ? `${rupiah([...p.tingkatHarga].sort((a, b) => a.mulaiJumlah - b.mulaiJumlah)[0].harga)} / ${sd}`
                : `${rupiah(kecil.hargaJual ?? 0)} / ${bolehDesimal(kecil.satuanId) ? 'kg' : kecil.label.toLowerCase()}`;
            const stokTeks = formatStok(stok, satuanTampil(p));
            return (
              <button key={p.id} type="button" className="kartu-barang" onClick={() => klikProduk(p)}>
                <span className="kartu-barang__sku">{p.sku}{p.kode ? ` · ${p.kode}` : ''}</span>
                <span className="kartu-barang__nama">{p.nama}</span>
                <span className="kartu-barang__harga">{harga}</span>
                {daftar.length > 1 && <span className="kartu-barang__lain">{daftar.length} satuan</span>}
                <span className={stok - pesan <= 0 ? 'kartu-barang__stok kartu-barang__stok--habis' : 'kartu-barang__stok'}>
                  {stok <= 0 ? 'Stok habis' : `Stok ${bolehDesimal(p.satuanDasarId) ? `${angka(stok)} kg` : stokTeks}`}
                  {pesan > 0 && ` · ${angka(pesan)} ${sd} dipesan`}
                </span>
              </button>
            );
          })}
          {daftarProduk.length === 0 && (
            <p className="pj__kosong">
              Barang tidak ditemukan. Barang yang belum terdaftar tidak bisa dijual; pemilik bisa menambahkannya di Gudang → Stok Barang.
            </p>
          )}
        </div>
      </section>

      <aside className="pj__keranjang" aria-label="Keranjang">
        {tertahan.length > 0 && (
          <div className="pj__tertahan">
            <span className="label-kecil">Ditahan ({tertahan.length})</span>
            <div className="pj__tertahan-daftar">
              {tertahan.map((t) => (
                <button key={t.id} type="button" className="chip-tahan" onClick={() => buka(t)} title={`Ditahan ${t.waktu}`}>
                  {t.nama} <span>{t.waktu}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pj__pelanggan">
          <div className="pj__pelanggan-atas">
            <label htmlFor="pilih-pelanggan" className="label-kecil">Pelanggan</label>
            <button type="button" className="tautan" onClick={() => setDialog('pelanggan')}>+ Pelanggan baru</button>
          </div>
          <select
            id="pilih-pelanggan"
            className="isian__kontrol"
            value={aktif.pelangganId}
            onChange={(e) => setAktif((k) => ({ ...k, pelangganId: e.target.value, baris: k.baris.map((b) => ({ ...b, diskonManual: undefined })) }))}
          >
            {pelanggan.map((p) => (
              <option key={p.id} value={p.id}>{p.nama}</option>
            ))}
          </select>
          {plg.jenis === 'umum' ? (
            <p className="pj__info">Pembeli umum · bayar lunas, tidak bisa kasbon</p>
          ) : (
            <p className="pj__info">
              Kasbon <strong>{rupiah(plg.saldoKasbon)}</strong>
              {plg.notaKasbon > 0 && ` · ${plg.notaKasbon} nota, tertua ${plg.notaTertuaHari} hari`}
              {' · '}batas {rupiah(plg.batasKasbon)}
              {plg.batasKasbon === 0 && <span className="lencana lencana--peringatan" style={{ marginLeft: 6 }}>batas belum diatur pemilik</span>}
            </p>
          )}
        </div>

        <ul className="pj__baris">
          {hasilBaris.map(({ baris, produk, hasil }) => (
            <BarisKeranjang
              key={baris.id}
              baris={baris}
              produk={produk}
              hasil={hasil}
              namaPelanggan={plg.nama}
              punyaDiskon={adaDiskon(produk.id)}
              stokSisa={(stokContoh[produk.id] ?? 0) - (dipesan.get(produk.id) ?? 0)}
              onQty={(qty) => (qty > 0 ? ubahBaris(baris.id, { qty }) : hapusBaris(baris.id))}
              onSatuan={(satuanProdukId) => ubahBaris(baris.id, { satuanProdukId, diskonManual: undefined })}
              onDiskon={(n) => ubahBaris(baris.id, { diskonManual: n })}
              onHapus={() => hapusBaris(baris.id)}
            />
          ))}
          {aktif.baris.length === 0 && (
            <li className="pj__kosong">Keranjang kosong. Ketik nama barang atau pilih dari daftar.</li>
          )}
        </ul>

        <div className="pj__total">
          <div className="ringkas-total"><span>Subtotal · {aktif.baris.length} baris</span><span>{rupiah(subtotal)}</span></div>
          {diskonPelanggan > 0 && (
            <div className="ringkas-total"><span>Diskon pelanggan</span><span>−{rupiah(diskonPelanggan)}</span></div>
          )}
          <div className="ringkas-total ringkas-total--besar"><span>Total</span><strong>{rupiah(total)}</strong></div>
          <div className="pj__aksi">
            <button type="button" className="tombol" disabled={!aktif.baris.length} onClick={() => setDialog('tahan')}>Tahan</button>
            <button type="button" className="tombol tombol--utama tombol--besar" disabled={!aktif.baris.length} onClick={() => setDialog('bayar')}>
              Bayar {rupiah(total)}
            </button>
          </div>
        </div>
      </aside>

      {pilihSatuan && (
        <DialogSatuan produk={pilihSatuan} onPilih={(s, qty) => tambah(pilihSatuan.id, s, qty)} onTutup={() => setPilihSatuan(null)} />
      )}
      {dialog === 'bayar' && <DialogBayar belanja={total} pelanggan={plg} onBatal={() => setDialog(null)} onSelesai={selesai} />}
      {dialog === 'tahan' && (
        <DialogTahan namaAwal={plg.jenis === 'umum' ? '' : plg.nama} onTahan={tahan} onTutup={() => setDialog(null)} />
      )}
      {dialog === 'pelanggan' && <DialogPelangganBaru daftar={pelanggan} onSimpan={simpanPelanggan} onTutup={() => setDialog(null)} />}
      {siapkan && <DialogDaftarSiapkan tertahan={siapkan} onTutup={() => setSiapkan(null)} />}
      {nota && <DialogStruk nota={nota} onSelesai={() => { setNota(null); setAktif(kosong()); }} />}
    </div>
  );
}
