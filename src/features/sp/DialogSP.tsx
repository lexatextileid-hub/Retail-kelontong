import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { InputRupiah } from '../../components/InputRupiah';
import { distributorContoh, produkContoh } from '../../data/contoh';
import { buatSP, catatArus, nomorArus, tandaiSPDikirim, terimaDariSP, useToko, type BarisSP, type SuratPesanan, type SumberSP } from '../../data/toko';
import { useSumberDana } from '../../components/PilihSumberDana';
import { rupiah } from '../../lib/format';
import { ambilProduk, ambilSatuan, angka } from '../penjualan/model';
import {
  ambilDistributor, distributorTermurah, hargaTerakhir, labelDasar, satuanBeliUrut, teksSP, totalPerkiraanSP,
} from '../pesanan/bersama';
import '../../styles/pesanan.css';

/** Kebutuhan barang yang akan dijadikan Surat Pesanan. */
export interface Kebutuhan {
  produkId: string;
  jumlahDasar: number;
  untukPesanan: BarisSP['untukPesanan'];
  keterangan?: string;
}

interface Rencana {
  key: string;
  produkId: string;
  distributorId: string;
  satuanProdukId: string;
  qty: number;
  harga: number;
  perluDasar: number;
  untukPesanan: BarisSP['untukPesanan'];
  keterangan?: string;
}

function rencanaAwal(k: Kebutuhan, i: number): Rencana {
  const t = distributorTermurah(k.produkId);
  const satuan = t ? ambilSatuan(ambilProduk(k.produkId), t.satuanProdukId) : satuanBeliUrut(k.produkId)[0];
  const distributorId = t?.distributorId ?? distributorContoh[0].id;
  return {
    key: `${k.produkId}-${i}`,
    produkId: k.produkId,
    distributorId,
    satuanProdukId: satuan.id,
    qty: Math.max(1, Math.ceil(k.jumlahDasar / satuan.isi)),
    harga: t?.harga ?? 0,
    perluDasar: k.jumlahDasar,
    untukPesanan: k.untukPesanan,
    keterangan: k.keterangan,
  };
}

/** Susun Surat Pesanan dari daftar kebutuhan; satu SP per distributor. */
export function DialogBuatSP({
  kebutuhan,
  sumber,
  onTutup,
  onDibuat,
}: {
  kebutuhan: Kebutuhan[];
  sumber: SumberSP;
  onTutup: () => void;
  onDibuat: (spIds: string[]) => void;
}) {
  const [rencana, setRencana] = useState<Rencana[]>(() => kebutuhan.map(rencanaAwal));
  const ubah = (key: string, patch: Partial<Rencana>) => setRencana((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const perDistributor = distributorContoh
    .map((d) => ({ d, baris: rencana.filter((r) => r.distributorId === d.id) }))
    .filter((x) => x.baris.length > 0);

  const simpan = () => {
    const ids = perDistributor.map(({ d, baris }) =>
      buatSP({
        distributorId: d.id,
        sumber,
        baris: baris.map((r) => {
          const s = ambilSatuan(ambilProduk(r.produkId), r.satuanProdukId);
          return { produkId: r.produkId, satuanProdukId: r.satuanProdukId, labelSatuan: s.label, qty: r.qty, hargaPerkiraan: r.harga, untukPesanan: r.untukPesanan };
        }),
      }),
    );
    onDibuat(ids);
  };

  const kaki = (
    <>
      <div className="ringkas-total">
        <span>{perDistributor.length} Surat Pesanan · {rencana.length} barang</span>
        <strong>{rupiah(rencana.reduce((t, r) => t + r.qty * r.harga, 0))}</strong>
      </div>
      <button type="button" className="tombol tombol--utama tombol--besar" onClick={simpan} disabled={!rencana.length || rencana.some((r) => r.qty <= 0)}>
        Buat {perDistributor.length} Surat Pesanan
      </button>
    </>
  );

  return (
    <Dialog judul="Buat Surat Pesanan" onTutup={onTutup} lebar={760} kaki={kaki}>
      <p className="teks-pudar" style={{ margin: 0 }}>
        Distributor terisi otomatis dari harga beli terakhir yang paling murah. Satuan beli urut besar → kecil.
      </p>
      {rencana.map((r) => {
        const p = ambilProduk(r.produkId);
        const satuan = ambilSatuan(p, r.satuanProdukId);
        const lebih = r.qty * satuan.isi - r.perluDasar;
        return (
          <div key={r.key} className="sp-rencana">
            <div className="sp-rencana__nama">
              <strong>{p.nama}</strong>
              <span className="teks-pudar">
                Perlu {labelDasar(p.id, r.perluDasar)}{r.keterangan ? ` · ${r.keterangan}` : ''}
              </span>
            </div>
            <div className="sp-rencana__isian">
              <label className="isian">
                Distributor
                <select className="isian__kontrol" value={r.distributorId} onChange={(e) => {
                  const h = hargaTerakhir(p.id, e.target.value, r.satuanProdukId);
                  ubah(r.key, { distributorId: e.target.value, harga: h ?? r.harga });
                }}>
                  {distributorContoh.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </label>
              <label className="isian">
                Satuan beli
                <select className="isian__kontrol" value={r.satuanProdukId} onChange={(e) => {
                  const s = ambilSatuan(p, e.target.value);
                  ubah(r.key, {
                    satuanProdukId: s.id,
                    qty: Math.max(1, Math.ceil(r.perluDasar / s.isi)),
                    harga: hargaTerakhir(p.id, r.distributorId, s.id) ?? Math.round((r.harga / satuan.isi) * s.isi),
                  });
                }}>
                  {satuanBeliUrut(p.id).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
              <label className="isian">
                Jumlah
                <input className="isian__kontrol" inputMode="numeric" value={r.qty || ''} onChange={(e) => ubah(r.key, { qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </label>
              <label className="isian">
                Harga perkiraan / {satuan.label.toLowerCase()}
                <InputRupiah id={`h-${r.key}`} nilai={r.harga} onUbah={(n) => ubah(r.key, { harga: n })} />
              </label>
            </div>
            {lebih > 0 && <span className="teks-pudar" style={{ fontSize: 12.5 }}>Lebih {labelDasar(p.id, lebih)} masuk stok umum.</span>}
            {lebih < 0 && <span className="catatan catatan--peringatan">Kurang {labelDasar(p.id, -lebih)} dari kebutuhan.</span>}
          </div>
        );
      })}
    </Dialog>
  );
}

/** Dokumen Surat Pesanan: kirim ke WhatsApp distributor, salin, atau cetak. */
export function DialogDokumenSP({ spId, onTutup }: { spId: string; onTutup: () => void }) {
  const { sp: semua } = useToko();
  const sp = semua.find((x) => x.id === spId)!;
  const d = ambilDistributor(sp.distributorId);
  const teks = teksSP(sp);
  const [info, setInfo] = useState('');
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      setInfo('Teks Surat Pesanan disalin.');
    } catch {
      setInfo('Tidak bisa menyalin otomatis. Pilih teks di atas lalu salin manual.');
    }
  };
  const kaki = (
    <>
      <div className="baris-tombol">
        <a
          className="tombol tombol--utama"
          href={`https://wa.me/${d.hp}?text=${encodeURIComponent(teks)}`}
          target="_blank"
          rel="noreferrer"
          onClick={() => tandaiSPDikirim(sp.id)}
        >
          Kirim lewat WhatsApp
        </a>
        <button type="button" className="tombol" onClick={salin}>Salin teks</button>
        <button type="button" className="tombol" onClick={() => setInfo('Di versi jadi, SP masuk antrian stasiun printer.')}>Cetak</button>
        {sp.status === 'draf' && (
          <button type="button" className="tombol tombol--hantu" onClick={() => { tandaiSPDikirim(sp.id); setInfo('Ditandai sudah dikirim.'); }}>
            Tandai sudah dikirim
          </button>
        )}
      </div>
      {info && <p className="catatan catatan--info">{info}</p>}
    </>
  );
  return (
    <Dialog judul={`${sp.nomor} · ${d.nama}`} onTutup={onTutup} lebar={520} kaki={kaki}>
      <p className="teks-pudar" style={{ margin: 0 }}>WhatsApp {d.nama}: +{d.hp} · perkiraan {rupiah(totalPerkiraanSP(sp))}</p>
      <pre className="sp-teks">{teks}</pre>
    </Dialog>
  );
}

/** Faktur dari Surat Pesanan: catat barang yang benar-benar datang. */
export function DialogTerimaSP({ sp, onTutup, onSelesai }: { sp: SuratPesanan; onTutup: () => void; onSelesai: (nomor: string) => void }) {
  const terbuka = sp.baris.filter((b) => !b.diterima);
  const [nomorDist, setNomorDist] = useState('');
  const [cara, setCara] = useState<'cash' | 'tempo'>(ambilDistributor(sp.distributorId).terminHari > 0 ? 'tempo' : 'cash');
  const [isi, setIsi] = useState(() =>
    Object.fromEntries(terbuka.map((b) => [b.id, { qty: b.qty, harga: b.hargaPerkiraan ?? 0, produkId: b.produkId ?? '', satuanProdukId: b.satuanProdukId ?? '' }])),
  );
  const [dicek, setDicek] = useState(false);
  const [tutupSisa, setTutupSisa] = useState(false);
  const ubah = (id: string, patch: Partial<(typeof isi)[string]>) => setIsi((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const ada = terbuka.map((b) => ({ b, x: isi[b.id] }));
  const kurang = ada.some(({ b, x }) => x.qty < b.qty);
  const belumCocok = ada.some(({ x }) => x.qty > 0 && (!x.produkId || !x.satuanProdukId));
  const total = ada.reduce((t, { x }) => t + x.qty * x.harga, 0);
  // Faktur cash dibayar saat barang diterima: pilih sumber uangnya supaya tercatat di kas (laci/brankas/rekening).
  const dana = useSumberDana(cara === 'cash' ? total : 0);
  const siap = nomorDist.trim() && dicek && !belumCocok && ada.some(({ x }) => x.qty > 0) && (cara === 'tempo' || dana.siap);

  const simpan = () => {
    if (!siap) return;
    const nomor = terimaDariSP(sp.id, {
      nomorDistributor: nomorDist.trim(),
      cara,
      tutupSisa,
      baris: ada.map(({ b, x }) => ({ barisId: b.id, qty: x.qty, harga: x.harga, produkId: x.produkId || undefined, satuanProdukId: x.satuanProdukId || undefined })),
    });
    if (cara === 'cash' && total > 0) {
      const nama = ambilDistributor(sp.distributorId).nama;
      catatArus({
        jenis: 'bayar-distributor', nomor: nomorArus('BD'), sumber: dana.nilai.sumber, bank: dana.bank, ...dana.uang(total),
        penerima: nama, keterangan: `Bayar cash faktur ${nomorDist.trim()} · ${nama}`,
        faktur: [{ id: `fk:${nomor}`, nomor: nomorDist.trim(), jumlah: total }],
      });
    }
    onSelesai(nomor);
  };

  const kaki = (
    <>
      <div className="ringkas-total ringkas-total--besar"><span>Total faktur</span><strong>{rupiah(total)}</strong></div>
      <label className="centang"><input type="checkbox" checked={dicek} onChange={(e) => setDicek(e.target.checked)} /> Isi kemasan dan jumlah sudah dicek fisik</label>
      <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan faktur</button>
    </>
  );

  return (
    <Dialog judul={`Terima barang · ${sp.nomor}`} onTutup={onTutup} lebar={760} kaki={kaki}>
      <div className="dua-kolom">
        <label className="isian">
          No. faktur distributor
          <input className="isian__kontrol" value={nomorDist} onChange={(e) => setNomorDist(e.target.value)} placeholder="sesuai kertas faktur" autoFocus />
        </label>
        <div className="isian">
          Pembayaran
          <div className="saklar" role="group" aria-label="Cash atau tempo" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={cara === 'cash'} onClick={() => setCara('cash')}>Cash</button>
            <button type="button" aria-pressed={cara === 'tempo'} onClick={() => setCara('tempo')}>Tempo</button>
          </div>
        </div>
      </div>
      {cara === 'cash' && dana.tampil}
      {ada.map(({ b, x }) => {
        const p = x.produkId ? ambilProduk(x.produkId) : undefined;
        return (
          <div key={b.id} className="sp-rencana">
            <div className="sp-rencana__nama">
              <strong>{b.produkId ? ambilProduk(b.produkId).nama : b.permintaan}</strong>
              <span className="teks-pudar">Dipesan {angka(b.qty)} {b.labelSatuan}{b.untukPesanan.length ? ' · untuk pesanan pelanggan' : ''}</span>
            </div>
            {!b.produkId && (
              <label className="isian">
                Barang yang datang (pilih produk terdaftar)
                <select className="isian__kontrol" value={x.produkId} onChange={(e) => {
                  const pr = produkContoh.find((y) => y.id === e.target.value);
                  ubah(b.id, { produkId: e.target.value, satuanProdukId: pr ? satuanBeliUrut(pr.id)[0]?.id ?? '' : '' });
                }}>
                  <option value="">— pilih —</option>
                  {produkContoh.map((y) => <option key={y.id} value={y.id}>{y.nama}</option>)}
                </select>
                <span className="isian__bantuan">Barang benar-benar baru didaftarkan pemilik dengan nama asli di kemasan (Gudang → Stok Barang → Tambah Barang).</span>
              </label>
            )}
            <div className="sp-rencana__isian">
              {p && !b.produkId && (
                <label className="isian">
                  Satuan
                  <select className="isian__kontrol" value={x.satuanProdukId} onChange={(e) => ubah(b.id, { satuanProdukId: e.target.value })}>
                    {satuanBeliUrut(p.id).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </label>
              )}
              <label className="isian">
                Jumlah diterima
                <input className="isian__kontrol" inputMode="numeric" value={x.qty} onChange={(e) => ubah(b.id, { qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </label>
              <label className="isian">
                Harga di faktur / satuan
                <InputRupiah id={`hf-${b.id}`} nilai={x.harga} onUbah={(n) => ubah(b.id, { harga: n })} />
              </label>
            </div>
            {b.hargaPerkiraan !== undefined && x.harga !== b.hargaPerkiraan && (
              <span className="catatan catatan--peringatan">Beda dari perkiraan SP {rupiah(b.hargaPerkiraan)}</span>
            )}
            {x.qty < b.qty && <span className="catatan catatan--peringatan">Kurang {angka(b.qty - x.qty)} {b.labelSatuan} dari SP</span>}
          </div>
        );
      })}
      {kurang && (
        <div className="kotak">
          <strong>Ada barang yang datang kurang dari SP</strong>
          <label className="centang"><input type="radio" name="sisa" checked={!tutupSisa} onChange={() => setTutupSisa(false)} /> SP tetap terbuka, sisanya ditunggu</label>
          <label className="centang"><input type="radio" name="sisa" checked={tutupSisa} onChange={() => setTutupSisa(true)} /> Tutup SP, sisanya dibatalkan</label>
        </div>
      )}
    </Dialog>
  );
}
