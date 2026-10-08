import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputRupiah } from '../../components/InputRupiah';
import { distributorContoh, produkContoh } from '../../data/contoh';
import { buatSP, stokBebas, useToko, type BarisSP } from '../../data/toko';
import { rupiah } from '../../lib/format';
import { ambilProduk, ambilSatuan, idBaru } from '../penjualan/model';
import { hargaTerakhir, labelDasar, satuanBeliUrut } from '../pesanan/bersama';
import { DialogDokumenSP } from './DialogSP';
import '../../styles/pesanan.css';

interface Baris {
  id: string;
  produkId?: string;
  permintaan?: string;
  penggantiProdukId?: string;
  satuanProdukId?: string;
  labelSatuan: string;
  qty: number;
  harga: number;
}

/** Buat SP manual: barang terdaftar atau baris permintaan (barang belum terdaftar). */
export function BuatSPManual() {
  useToko();
  const navigasi = useNavigate();
  const [distributorId, setDistributorId] = useState('');
  const [baris, setBaris] = useState<Baris[]>([]);
  const [catatan, setCatatan] = useState('');
  const [cari, setCari] = useState('');
  const [spId, setSpId] = useState<string | null>(null);

  const q = cari.trim().toLowerCase();
  const hasil = q ? produkContoh.filter((p) => satuanBeliUrut(p.id).length && (p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))).slice(0, 8) : [];
  const ubah = (id: string, patch: Partial<Baris>) => setBaris((xs) => xs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const tambahProduk = (produkId: string) => {
    const s = satuanBeliUrut(produkId)[0];
    setBaris((xs) => [...xs, { id: idBaru(), produkId, satuanProdukId: s.id, labelSatuan: s.label, qty: 1, harga: (distributorId && hargaTerakhir(produkId, distributorId, s.id)) || 0 }]);
    setCari('');
  };
  const tambahPermintaan = () =>
    setBaris((xs) => [...xs, { id: idBaru(), permintaan: q ? cari.trim() : '', labelSatuan: 'Karton', qty: 1, harga: 0 }]);

  const total = baris.reduce((t, b) => t + b.qty * b.harga, 0);
  const siap = !!distributorId && baris.length > 0 && baris.every((b) => b.qty > 0 && (b.produkId || (b.permintaan ?? '').trim()) && b.labelSatuan.trim());

  const simpan = () => {
    if (!siap) return;
    const id = buatSP({
      distributorId,
      sumber: 'baru',
      catatan: catatan.trim() || undefined,
      baris: baris.map((b): Omit<BarisSP, 'id'> => ({
        produkId: b.produkId, permintaan: b.permintaan?.trim(), penggantiProdukId: b.penggantiProdukId,
        satuanProdukId: b.satuanProdukId, labelSatuan: b.labelSatuan, qty: b.qty, hargaPerkiraan: b.harga || undefined, untukPesanan: [],
      })),
    });
    setSpId(id);
  };

  return (
    <div className="ps-halaman">
      <div className="ps-buat">
        <section className="ps-kolom">
          <div className="kartu tumpuk">
            <div className="dua-kolom">
              <label className="isian">
                Distributor
                <select className="isian__kontrol" value={distributorId} onChange={(e) => {
                  const dId = e.target.value;
                  setDistributorId(dId);
                  // Harga perkiraan ikut harga beli terakhir dari distributor yang dipilih.
                  setBaris((xs) => xs.map((x) => (x.produkId && x.satuanProdukId ? { ...x, harga: hargaTerakhir(x.produkId, dId, x.satuanProdukId) ?? x.harga } : x)));
                }} style={!distributorId ? { color: 'var(--teks-3)' } : undefined}>
                  <option value="" disabled>Pilih distributor…</option>
                  {distributorContoh.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
                </select>
              </label>
              <label className="isian">
                Catatan untuk distributor (opsional)
                <input className="isian__kontrol" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. kirim sebelum Sabtu" />
              </label>
            </div>
          </div>

          <div className="kartu tumpuk">
            <h2>Barang</h2>
            <label className="pj__cari-kotak">
              <span className="sr">Cari barang</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari barang terdaftar" autoComplete="off" />
            </label>
            {hasil.length > 0 && (
              <ul className="ps-hasil">
                {hasil.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => tambahProduk(p.id)}>
                      <span>{p.nama}</span>
                      <span className="teks-pudar">stok bebas {labelDasar(p.id, Math.max(0, stokBebas(p.id)))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="tombol tombol--putus" style={{ alignSelf: 'flex-start' }} onClick={tambahPermintaan}>
              + Permintaan barang belum terdaftar{q && !hasil.length ? `: "${cari.trim()}"` : ''}
            </button>

            {baris.length === 0 ? (
              <p className="ps-kosong">Belum ada barang. Cari barang terdaftar, atau tambah permintaan untuk barang yang belum ada datanya.</p>
            ) : (
              baris.map((b) => {
                const p = b.produkId ? ambilProduk(b.produkId) : undefined;
                return (
                  <div key={b.id} className="sp-rencana">
                    <div className="sp-rencana__nama">
                      {p ? <strong>{p.nama}</strong> : <span className="chip-status chip-status--kuning">Permintaan · belum terdaftar</span>}
                      <button type="button" className="tautan" onClick={() => setBaris((xs) => xs.filter((x) => x.id !== b.id))}>Hapus</button>
                    </div>
                    {!p && (
                      <div className="dua-kolom">
                        <label className="isian">
                          Barang yang diminta
                          <input className="isian__kontrol" value={b.permintaan ?? ''} onChange={(e) => ubah(b.id, { permintaan: e.target.value })} placeholder="mis. Minyak goreng 1 L, merek lain" />
                        </label>
                        <label className="isian">
                          Pengganti dari (opsional)
                          <select className="isian__kontrol" value={b.penggantiProdukId ?? ''} onChange={(e) => ubah(b.id, { penggantiProdukId: e.target.value || undefined })}>
                            <option value="">—</option>
                            {produkContoh.map((x) => <option key={x.id} value={x.id}>{x.nama}</option>)}
                          </select>
                        </label>
                      </div>
                    )}
                    <div className="sp-rencana__isian">
                      {p ? (
                        <label className="isian">
                          Satuan beli
                          <select className="isian__kontrol" value={b.satuanProdukId} onChange={(e) => {
                            const s = ambilSatuan(p, e.target.value);
                            ubah(b.id, { satuanProdukId: s.id, labelSatuan: s.label, harga: hargaTerakhir(p.id, distributorId, s.id) ?? b.harga });
                          }}>
                            {satuanBeliUrut(p.id).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </label>
                      ) : (
                        <label className="isian">
                          Satuan (tulis isinya)
                          <input className="isian__kontrol" value={b.labelSatuan} onChange={(e) => ubah(b.id, { labelSatuan: e.target.value })} placeholder="mis. Karton isi 12" />
                        </label>
                      )}
                      <label className="isian">
                        Jumlah
                        <input className="isian__kontrol" inputMode="numeric" value={b.qty || ''} onChange={(e) => ubah(b.id, { qty: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                      </label>
                      <label className="isian">
                        Harga perkiraan
                        <InputRupiah id={`spm-${b.id}`} nilai={b.harga} onUbah={(n) => ubah(b.id, { harga: n })} />
                      </label>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="ps-ringkas kartu tumpuk">
          <h2>Ringkasan</h2>
          <div className="ringkas-total"><span>{baris.length} baris</span></div>
          <div className="ringkas-total ringkas-total--besar"><span>Perkiraan</span><strong>{rupiah(total)}</strong></div>
          <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>
            Barang permintaan tidak didaftarkan sekarang. Produknya dipilih atau didaftarkan saat barang datang, sesuai nama asli di kemasan.
          </p>
          {!distributorId && <p className="teks-pudar" style={{ margin: 0, fontSize: 12.5 }}>Pilih distributor dulu.</p>}
          <button type="button" className="tombol tombol--utama tombol--besar" disabled={!siap} onClick={simpan}>Simpan & kirim SP</button>
        </aside>
      </div>
      {spId && <DialogDokumenSP spId={spId} onTutup={() => navigasi('../daftar')} />}
    </div>
  );
}
