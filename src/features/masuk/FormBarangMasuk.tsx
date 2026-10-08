import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import { DialogPilihBarang } from '../../components/DialogPilihBarang';
import { InputRupiah } from '../../components/InputRupiah';
import { useSumberDana } from '../../components/PilihSumberDana';
import { distributorContoh, PIN_PEMILIK_CONTOH } from '../../data/contoh';
import { infoBarang, simpanProduk, terimaBarangMasuk, useToko, type InfoBarang } from '../../data/toko';
import { diskonDariPersen, hitungFakturMasuk, perubahanHarga } from '../../domain/faktur';
import { cekTurunHarga, hargaDariPersen, untungDariModal } from '../../domain/harga';
import { tambahHari } from '../../domain/kasbon';
import type { Produk, SatuanProduk } from '../../domain/tipe';
import { rupiah } from '../../lib/format';
import { tanggalPendek } from '../kasbon/bersama';
import { IsianPin } from '../kaslaci/DialogLaci';
import { ambilProduk, singkatan } from '../penjualan/model';
import { FormBarang } from '../stok/FormBarang';
import '../../styles/stok.css';
import '../../styles/masuk.css';

interface Lapis { qty: number; harga: number }
interface Baris {
  kunci: string;
  produkId: string; // '' = barang permintaan dari SP yang belum dipilih
  permintaan?: string;
  spBarisId?: string;
  dipesan?: string; // teks jumlah di SP
  lapis: Record<string, Lapis>;
  diskonRp: number;
  bonus: boolean;
  ikutan: boolean;
  dicek: boolean;
  terapkan: boolean;
}

const kunci = () => Math.random().toString(36).slice(2);
/** Lapis satuan yang dibeli, besar → kecil seperti di kertas faktur. Tidak ada yang dicentang Beli → satuan dasar. */
const lapisBeli = (p: Produk): SatuanProduk[] => {
  const beli = p.satuan.filter((s) => s.dibeli).sort((a, b) => b.isi - a.isi);
  return beli.length ? beli : p.satuan.filter((s) => s.isi === 1);
};
const hargaAwal = (s: SatuanProduk, i: InfoBarang) =>
  Math.round(i.beliPerSatuan[s.id]?.harga ?? s.hargaBeli ?? (i.beliAcuan ? i.beliAcuan * s.isi : 0));

function barisBaru(p: Produk, toko: ReturnType<typeof useToko>, isi?: Partial<Baris>): Baris {
  const i = infoBarang(p.id, toko);
  return {
    kunci: kunci(), produkId: p.id, diskonRp: 0, bonus: false, ikutan: false, dicek: false, terapkan: true,
    lapis: Object.fromEntries(lapisBeli(p).map((s) => [s.id, { qty: 0, harga: hargaAwal(s, i) }])), ...isi,
  };
}

/** Usulan harga jual baru bila harga beli naik: untung % lama dipertahankan (dari harga beli terakhir). */
function usulanHarga(p: Produk, i: InfoBarang, modalPerDasarBaru: number, hargaNettoPerSatuan: Record<string, number>) {
  if (p.metodeHarga !== 'per_satuan') return [];
  return p.satuan.filter((s) => s.dijual && s.hargaJual).flatMap((s) => {
    const modalLama = i.beliPerSatuan[s.id]?.harga ?? (i.beliAcuan ? i.beliAcuan * s.isi : undefined);
    const modalBaru = hargaNettoPerSatuan[s.id] ?? modalPerDasarBaru * s.isi;
    if (!modalLama || !modalBaru || modalBaru <= modalLama) return [];
    const persen = untungDariModal(s.hargaJual!, modalLama);
    const baru = hargaDariPersen(modalBaru, persen);
    return baru > s.hargaJual! ? [{ satuan: s, lama: s.hargaJual!, baru, persen }] : [];
  });
}

/**
 * Barang Masuk — faktur distributor (dari Pesanan Toko atau tanpa SP). Satu baris per barang dengan lapis satuan beli
 * (karton · slop · bungkus) sesuai kertas faktur; diskon per baris & per faktur; total dicocokkan dengan kertas faktur.
 */
export function FormBarangMasuk() {
  const toko = useToko();
  const navigasi = useNavigate();
  const [params] = useSearchParams();
  const sp = toko.sp.find((x) => x.id === params.get('sp'));
  const [distributorId, setDistributorId] = useState(sp?.distributorId ?? '');
  const [nomorDist, setNomorDist] = useState('');
  const termin = distributorContoh.find((d) => d.id === distributorId)?.terminHari ?? 0;
  const [cara, setCara] = useState<'cash' | 'tempo'>(sp ? (termin > 0 ? 'tempo' : 'cash') : 'tempo');
  const [ruko, setRuko] = useState('');
  const [baris, setBaris] = useState<Baris[]>(() => (sp ? sp.baris.filter((b) => !b.diterima).map((b) => {
    if (!b.produkId) return { kunci: kunci(), produkId: '', permintaan: b.permintaan, spBarisId: b.id, dipesan: `${b.qty} ${b.labelSatuan}`, lapis: {}, diskonRp: 0, bonus: false, ikutan: false, dicek: false, terapkan: true };
    const p = ambilProduk(b.produkId);
    const r = barisBaru(p, toko, { spBarisId: b.id, dipesan: `${b.qty} ${b.labelSatuan}` });
    if (b.satuanProdukId) r.lapis[b.satuanProdukId] = { qty: b.qty, harga: r.lapis[b.satuanProdukId]?.harga || b.hargaPerkiraan || 0 };
    return r;
  }) : []));
  const [diskonFaktur, setDiskonFaktur] = useState(0);
  const [totalKertas, setTotalKertas] = useState(0);
  const [setujuSelisih, setSetujuSelisih] = useState(false);
  const [pin, setPin] = useState('');
  const [pilih, setPilih] = useState<null | { untuk?: string }>(null);
  const [daftarBaru, setDaftarBaru] = useState<null | { untuk?: string; nama?: string }>(null);
  const [coba, setCoba] = useState(false);

  const ubah = (k: string, patch: Partial<Baris>) => setBaris((xs) => xs.map((x) => (x.kunci === k ? { ...x, ...patch } : x)));
  const ubahLapis = (k: string, sid: string, patch: Partial<Lapis>) =>
    setBaris((xs) => xs.map((x) => (x.kunci === k ? { ...x, lapis: { ...x.lapis, [sid]: { ...x.lapis[sid], ...patch } } } : x)));
  const pakaiProduk = (p: Produk, untuk?: string) => {
    if (untuk) setBaris((xs) => xs.map((x) => (x.kunci === untuk ? { ...barisBaru(p, toko), kunci: x.kunci, spBarisId: x.spBarisId, dipesan: x.dipesan, permintaan: x.permintaan } : x)));
    else setBaris((xs) => [...xs, barisBaru(p, toko)]);
  };

  const terisi = baris.filter((b) => b.produkId);
  const hit = useMemo(() => hitungFakturMasuk(terisi.map((b) => {
    const p = ambilProduk(b.produkId);
    return { kunci: b.kunci, diskonRp: b.diskonRp, bonus: b.bonus, lapis: lapisBeli(p).map((s) => ({ kunci: s.id, qty: b.lapis[s.id]?.qty ?? 0, harga: b.lapis[s.id]?.harga ?? 0, isi: s.isi })) };
  }), diskonFaktur), [terisi, diskonFaktur]);
  const hasilDari = (k: string) => hit.barang.find((x) => x.kunci === k);

  const dana = useSumberDana(cara === 'cash' ? hit.total : 0);
  const selisih = totalKertas ? hit.total - totalKertas : 0;
  const perluPinSelisih = selisih !== 0 && toko.peran !== 'pemilik';
  const usulan = terisi.map((b) => {
    const p = ambilProduk(b.produkId);
    const h = hasilDari(b.kunci);
    if (!h || b.bonus || !h.jumlahDasar) return { b, list: [] };
    const netto = Object.fromEntries(h.lapis.filter((l) => l.jumlahDasar > 0).map((l) => [l.kunci, l.hargaNetto]));
    return { b, list: usulanHarga(p, infoBarang(p.id, toko), h.modalPerDasar, netto) };
  });
  const terapkanAda = usulan.some((u) => u.b.terapkan && u.list.length);
  const perluPinHarga = terapkanAda && toko.peran !== 'pemilik';
  const pinOk = !(perluPinSelisih || perluPinHarga) || pin === PIN_PEMILIK_CONTOH;

  const masalah: string[] = [];
  if (!distributorId) masalah.push('Pilih distributor.');
  if (!nomorDist.trim()) masalah.push('Isi no. faktur distributor.');
  if (!terisi.length || hit.barang.every((x) => !x.jumlahDasar)) masalah.push('Isi jumlah barang yang datang.');
  if (baris.some((b) => !b.produkId && !sp)) masalah.push('Ada baris tanpa barang.');
  if (terisi.some((b) => (hasilDari(b.kunci)?.jumlahDasar ?? 0) > 0 && !b.dicek)) masalah.push('Centang "isi kemasan dicek fisik" di setiap barang.');
  if (!totalKertas) masalah.push('Isi total yang tertulis di kertas faktur.');
  if (selisih !== 0 && toko.peran === 'pemilik' && !setujuSelisih) masalah.push('Total tidak cocok dengan kertas faktur — periksa lagi atau setujui selisihnya.');
  if (cara === 'cash' && !dana.siap) masalah.push(dana.masalah);
  if (!pinOk) masalah.push('Perlu PIN pemilik.');

  const simpan = () => {
    setCoba(true);
    if (masalah.length) return;
    const catatanCek = [
      ...(selisih !== 0 ? [`Total input ${rupiah(hit.total)} beda ${rupiah(Math.abs(selisih))} dari kertas faktur ${rupiah(totalKertas)} (disetujui ${toko.peran === 'pemilik' ? 'pemilik' : 'PIN pemilik'})`] : []),
      // Harga beli naik dibanding faktur terakhir (per satuan) → ditandai untuk dicek pemilik.
      ...terisi.flatMap((b) => {
        const p = ambilProduk(b.produkId);
        const i = infoBarang(p.id, toko);
        const naik = lapisBeli(p).filter((s) => (b.lapis[s.id]?.qty ?? 0) > 0 && perubahanHarga(b.lapis[s.id].harga, i.beliPerSatuan[s.id]?.harga)?.naik);
        if (!naik.length || b.bonus) return [];
        const ub = usulan.find((u) => u.b.kunci === b.kunci);
        return [`Harga beli ${p.nama} naik (${naik.map((s) => s.label).join(', ')})${ub?.list.length ? (b.terapkan ? ' — harga jual disesuaikan' : ' — harga jual belum disesuaikan') : ''}`];
      }),
    ];
    const r = terimaBarangMasuk({
      spId: sp?.id, distributorId, nomorDistributor: nomorDist.trim(), cara, ruko, diskonFaktur, totalKertas, catatanCek, tutupSisa: true,
      bayar: cara === 'cash' ? { sumber: dana.nilai.sumber, bank: dana.bank } : undefined,
      barang: terisi.map((b) => ({
        produkId: b.produkId, spBarisId: b.spBarisId, diskonRp: b.diskonRp, bonus: b.bonus, ikutan: b.ikutan,
        lapis: lapisBeli(ambilProduk(b.produkId)).map((s) => ({ satuanProdukId: s.id, qty: b.lapis[s.id]?.qty ?? 0, harga: b.lapis[s.id]?.harga ?? 0 })).filter((l) => l.qty > 0),
      })),
    });
    // Terapkan usulan harga jual (untung % tetap).
    for (const u of usulan) {
      if (!u.b.terapkan || !u.list.length) continue;
      const p = ambilProduk(u.b.produkId);
      simpanProduk({ ...p, satuan: p.satuan.map((s) => { const x = u.list.find((y) => y.satuan.id === s.id); return x ? { ...s, hargaJual: x.baru } : s; }) });
    }
    navigasi(`../daftar?info=${encodeURIComponent(`Faktur ${nomorDist.trim()} tersimpan sebagai ${r.nomor}. Stok bertambah${cara === 'tempo' ? '; masuk hutang distributor' : '; pembayaran tercatat'}.`)}`);
  };

  return (
    <div className="ps-halaman">
      <div className="ps-atas">
        <div>
          <h2 style={{ margin: 0 }}>{sp ? `Terima barang · ${sp.nomor}` : 'Barang masuk (tanpa Surat Pesanan)'}</h2>
          <span className="teks-pudar" style={{ fontSize: 13 }}>Isi sesuai kertas faktur: satu barang bisa beberapa satuan (karton · slop · bungkus).</span>
        </div>
        <Link to={sp ? '../dari-sp' : '../daftar'} className="tautan">← Kembali</Link>
      </div>

      <div className="kartu bd-kepala">
        <label className="isian">
          Distributor
          <select className="isian__kontrol" value={distributorId} disabled={!!sp} onChange={(e) => { setDistributorId(e.target.value); setCara((distributorContoh.find((d) => d.id === e.target.value)?.terminHari ?? 0) > 0 ? 'tempo' : 'cash'); }}
            style={!distributorId ? { color: 'var(--teks-3)' } : undefined}>
            <option value="" disabled>Pilih distributor…</option>
            {distributorContoh.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
          </select>
        </label>
        <label className="isian">
          No. faktur distributor
          <input className="isian__kontrol" value={nomorDist} onChange={(e) => setNomorDist(e.target.value)} placeholder="sesuai kertas faktur" />
        </label>
        <label className="isian">Tanggal<input className="isian__kontrol" readOnly value={tanggalPendek(new Date().toISOString().slice(0, 10))} /></label>
        <div className="isian">
          Pembayaran
          <div className="saklar" role="group" aria-label="Cash atau tempo" style={{ alignSelf: 'flex-start' }}>
            <button type="button" aria-pressed={cara === 'tempo'} onClick={() => setCara('tempo')}>Tempo</button>
            <button type="button" aria-pressed={cara === 'cash'} onClick={() => setCara('cash')}>Cash</button>
          </div>
          {cara === 'tempo' && distributorId && <span className="isian__bantuan">Jatuh tempo {tanggalPendek(tambahHari(new Date().toISOString().slice(0, 10), termin))} (termin {termin} hari)</span>}
        </div>
        <label className="isian">
          Diturunkan di (opsional)
          <input className="isian__kontrol" value={ruko} onChange={(e) => setRuko(e.target.value)} placeholder="mis. Gudang ruko 5" />
        </label>
        {sp && <div className="isian bd-kepala__lebar"><span className="teks-pudar" style={{ fontSize: 13 }}>Dari Surat Pesanan {sp.nomor}. Barang yang tidak datang dibiarkan 0; sisa pesanan ditutup.</span></div>}
        {cara === 'cash' && dana.tampil}
      </div>

      {baris.map((b) => {
        if (!b.produkId) {
          return (
            <div key={b.kunci} className="kartu bm-barang">
              <div className="bm-barang__kepala">
                <div><strong>{b.permintaan ?? 'Barang'}</strong> <span className="chip-status chip-status--kuning">belum terdaftar</span>
                  {b.dipesan && <div className="teks-pudar" style={{ fontSize: 12.5 }}>Dipesan {b.dipesan}</div>}</div>
              </div>
              <div className="baris-tombol">
                <button type="button" className="tombol" onClick={() => setPilih({ untuk: b.kunci })}>Pilih barang terdaftar</button>
                <button type="button" className="tombol" onClick={() => setDaftarBaru({ untuk: b.kunci, nama: b.permintaan })}>+ Daftarkan barang baru</button>
              </div>
            </div>
          );
        }
        const p = ambilProduk(b.produkId);
        const i = infoBarang(p.id, toko);
        const h = hasilDari(b.kunci);
        const lapis = lapisBeli(p);
        const cek = cekTurunHarga(lapis.map((s) => ({ id: s.id, isi: s.isi, harga: b.lapis[s.id]?.harga || undefined })));
        const u = usulan.find((x) => x.b.kunci === b.kunci)?.list ?? [];
        const sub = h?.subtotal ?? 0;
        return (
          <div key={b.kunci} className="kartu bm-barang">
            <div className="bm-barang__kepala">
              <div>
                <strong>{p.nama}</strong> <span className="teks-pudar" style={{ fontSize: 12.5 }}>{p.sku}</span>
                {b.dipesan && <div className="teks-pudar" style={{ fontSize: 12.5 }}>Dipesan {b.dipesan}</div>}
              </div>
              {!b.spBarisId && <button type="button" className="tautan teks-bahaya" onClick={() => setBaris((xs) => xs.filter((x) => x.kunci !== b.kunci))}>Hapus</button>}
            </div>
            <table className="ps-tabel ps-tabel--hp bm-lapis">
              <thead><tr><th>Satuan</th><th className="kanan">Jumlah</th><th className="kanan">Harga @</th><th className="kanan">Subtotal</th></tr></thead>
              <tbody>
                {lapis.map((s) => {
                  const l = b.lapis[s.id] ?? { qty: 0, harga: 0 };
                  const lama = i.beliPerSatuan[s.id]?.harga;
                  const ub = perubahanHarga(l.harga, lama);
                  const c = [...cek].find(([k]) => k.id === s.id)?.[1];
                  return (
                    <tr key={s.id} style={{ cursor: 'default' }}>
                      <td data-label="Satuan"><strong>{s.label}</strong><div className="teks-pudar" style={{ fontSize: 12 }}>{s.isi.toLocaleString('id-ID')} {singkatan(p.satuanDasarId)}</div></td>
                      <td data-label="Jumlah" className="kanan">
                        <input className="isian__kontrol kk-qty" type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${s.label} ${p.nama}`} value={l.qty || ''}
                          onChange={(e) => ubahLapis(b.kunci, s.id, { qty: Number(e.target.value) })} />
                      </td>
                      <td data-label="Harga @" className="kanan">
                        {b.bonus ? <span className="teks-pudar">bonus (Rp 0)</span> : (
                          <>
                            <InputRupiah id={`bm-${b.kunci}-${s.id}`} nilai={l.harga} label={`Harga ${s.label} ${p.nama}`} onUbah={(n) => ubahLapis(b.kunci, s.id, { harga: n })} />
                            {ub && ub.selisih !== 0 && <div className={ub.naik ? 'sb-mahal' : 'sb-perdasar'}>{ub.naik ? '▲' : '▼'} {rupiah(Math.abs(ub.selisih))} ({ub.persen > 0 ? '+' : ''}{ub.persen.toLocaleString('id-ID')}%) dari faktur terakhir</div>}
                            {c?.lebihMahal && <div className="sb-mahal">⚠ lebih mahal per {singkatan(p.satuanDasarId)} dari satuan lebih kecil</div>}
                          </>
                        )}
                      </td>
                      <td data-label="Subtotal" className="kanan">{l.qty && !b.bonus ? rupiah(l.qty * l.harga) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="bm-barang__kaki">
              <div className="bm-cek">
                <label><input type="checkbox" checked={b.bonus} onChange={(e) => ubah(b.kunci, { bonus: e.target.checked })} /> Bonus (harga 0)</label>
                <label><input type="checkbox" checked={b.ikutan} onChange={(e) => ubah(b.kunci, { ikutan: e.target.checked })} /> Barang ikutan</label>
                <label className={coba && !b.dicek && (h?.jumlahDasar ?? 0) > 0 ? 'teks-bahaya' : undefined}><input type="checkbox" checked={b.dicek} onChange={(e) => ubah(b.kunci, { dicek: e.target.checked })} /> Isi kemasan & jumlah dicek fisik</label>
              </div>
              <div className="bm-angka">
                {!b.bonus && (
                  <div className="bm-diskon">
                    <span>Diskon baris</span>
                    <span className="sb-persen"><input className="isian__kontrol" inputMode="decimal" aria-label={`Diskon persen ${p.nama}`} placeholder="%"
                      onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (Number.isFinite(n)) ubah(b.kunci, { diskonRp: diskonDariPersen(sub, n) }); }} /><span>%</span></span>
                    <InputRupiah id={`bmd-${b.kunci}`} nilai={b.diskonRp} label={`Diskon rupiah ${p.nama}`} onUbah={(n) => ubah(b.kunci, { diskonRp: n })} />
                  </div>
                )}
                <div className="ringkas-total"><span>= {(h?.jumlahDasar ?? 0).toLocaleString('id-ID')} {singkatan(p.satuanDasarId)}{h?.jumlahDasar ? ` · modal ${rupiah(h.modalPerDasar)}/${singkatan(p.satuanDasarId)}` : ''}</span><strong>{rupiah((h?.subtotal ?? 0) - (h?.diskonBaris ?? 0))}</strong></div>
              </div>
            </div>
            {u.length > 0 && (
              <div className="bm-usulan">
                <label><input type="checkbox" checked={b.terapkan} onChange={(e) => ubah(b.kunci, { terapkan: e.target.checked })} /> <strong>Harga beli naik — terapkan usulan harga jual baru</strong> (untung % tetap)</label>
                {u.map((x) => <div key={x.satuan.id} className="ringkas-total"><span>{x.satuan.label} · untung {x.persen.toLocaleString('id-ID')}%</span><span>{rupiah(x.lama)} → <strong>{rupiah(x.baru)}</strong></span></div>)}
              </div>
            )}
          </div>
        );
      })}

      {!sp && (
        <div className="baris-tombol">
          <button type="button" className="tombol tombol--putus" onClick={() => setPilih({})}>+ Tambah barang</button>
          <button type="button" className="tombol tombol--putus" onClick={() => setDaftarBaru({})}>+ Barang belum terdaftar</button>
        </div>
      )}

      <div className="kartu bd-kaki">
        <div className="bd-kaki__angka">
          <label className="isian">
            Total di kertas faktur
            <InputRupiah id="bm-kertas" nilai={totalKertas} onUbah={setTotalKertas} />
            <span className="isian__bantuan">Diketik dari kertas faktur untuk dicocokkan.</span>
          </label>
          {totalKertas > 0 && (selisih === 0
            ? <p className="catatan catatan--info" style={{ margin: 0 }}>✓ Cocok dengan kertas faktur.</p>
            : <div className="catatan catatan--peringatan" style={{ margin: 0 }}>
                Beda {rupiah(Math.abs(selisih))} ({selisih > 0 ? 'input lebih besar' : 'input lebih kecil'}). Periksa jumlah, harga, dan diskon.
                {toko.peran === 'pemilik' && <label style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={setujuSelisih} onChange={(e) => setSetujuSelisih(e.target.checked)} /> Setujui selisih (dicatat untuk dicek)</label>}
              </div>)}
          {(perluPinSelisih || perluPinHarga) && <IsianPin pin={pin} setPin={setPin} alasan={[perluPinSelisih && 'setujui selisih total', perluPinHarga && 'ubah harga jual'].filter(Boolean).join(' & ')} />}
        </div>
        <div className="bd-kaki__angka">
          <div className="ringkas-total"><span>Subtotal ({hit.barang.filter((x) => x.jumlahDasar).length} barang)</span><span>{rupiah(hit.subtotal)}</span></div>
          <div className="ringkas-total"><span>Diskon baris</span><span>−{rupiah(hit.diskonBaris)}</span></div>
          <div className="ringkas-total">
            <span>Diskon faktur</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className="sb-persen"><input className="isian__kontrol" inputMode="decimal" aria-label="Diskon faktur persen" placeholder="%"
                onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (Number.isFinite(n)) setDiskonFaktur(diskonDariPersen(hit.subtotal - hit.diskonBaris, n)); }} /><span>%</span></span>
              <span style={{ width: 150 }}><InputRupiah id="bm-diskon-faktur" nilai={diskonFaktur} label="Diskon faktur" onUbah={setDiskonFaktur} /></span>
            </span>
          </div>
          <div className="ringkas-total ringkas-total--besar"><span>Total faktur</span><strong>{rupiah(hit.total)}</strong></div>
          {coba && masalah.length > 0 && <ul className="catatan catatan--peringatan" style={{ margin: 0, paddingLeft: 28 }}>{masalah.map((m) => <li key={m}>{m}</li>)}</ul>}
          <div className="baris-tombol" style={{ justifyContent: 'flex-end' }}>
            <Link to={sp ? '../dari-sp' : '../daftar'} className="tombol">Batal</Link>
            <button type="button" className="tombol tombol--utama" onClick={simpan}>Simpan barang masuk</button>
          </div>
        </div>
      </div>

      {pilih && <DialogPilihBarang judul="Pilih barang di faktur" onTutup={() => setPilih(null)} onPilih={(p) => { pakaiProduk(p, pilih.untuk); setPilih(null); }} />}
      {daftarBaru && (
        <Dialog judul="Daftarkan barang baru" onTutup={() => setDaftarBaru(null)} lebar={1100}>
          <FormBarang namaAwal={daftarBaru.nama} onBatal={() => setDaftarBaru(null)}
            onSimpan={(pid) => { pakaiProduk(ambilProduk(pid), daftarBaru.untuk); setDaftarBaru(null); }} />
        </Dialog>
      )}
    </div>
  );
}
