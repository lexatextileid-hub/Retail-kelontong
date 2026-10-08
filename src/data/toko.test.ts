import { describe, expect, it } from 'vitest';
import {
  __state, bayarKasbon, buatPesanan, buatSP, catatKasbonLama, catatKasbonPenjualan, ringkasKasbon, ringkasPesanan, serahkan,
  tagihanPelanggan, tambahPelanggan, terimaBayar, terimaDariSP,
} from './toko';
import { tambahHari } from '../domain/kasbon';

const ambil = (id: string) => {
  const p = __state().pesanan.find((x) => x.id === id)!;
  return { p, r: ringkasPesanan(p) };
};
const ambilSP = (id: string) => __state().sp.find((x) => x.id === id)!;

describe('alur pesanan dengan Surat Pesanan', () => {
  it('stok tidak cukup → perlu diorder → SP → barang datang → serah → lunas', () => {
    const id = buatPesanan({
      pelangganId: 'amir', cara: 'ambil', tanggalJanji: '2026-10-10',
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-ktn', qty: 5 }], // 60 btl, stok 15 → order semua
      dp: { jumlah: 100000, metode: 'tunai' },
    });
    let { p, r } = ambil(id);
    expect(p.baris[0].dariStok).toBe(0);
    expect(r.status).toBe('Perlu diorder');

    const spId = buatSP({
      distributorId: 'dist-c',
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-ktn', labelSatuan: 'Karton isi 12', qty: 5, hargaPerkiraan: 246000,
        untukPesanan: [{ pesananId: id, barisId: p.baris[0].id, jumlahDasar: 60 }] }],
    });
    ({ r } = ambil(id));
    expect(r.status).toBe('Menunggu barang');

    const spBaris = ambilSP(spId).baris[0];
    terimaDariSP(spId, { nomorDistributor: 'F-001', cara: 'tempo', tutupSisa: false, baris: [{ barisId: spBaris.id, qty: 5, harga: 246000 }] });
    ({ p, r } = ambil(id));
    expect(p.baris[0].diterimaOrder).toBe(60);
    expect(p.baris[0].modalOrderPerDasar).toBe(20500);
    expect(r.status).toBe('Barang siap'); // 264.000 vs modal 246.000/ktn → untung > 5%

    serahkan(id, [{ barisId: p.baris[0].id, jumlahDasar: 60 }], false);
    ({ r } = ambil(id));
    expect(r.status).toBe('Tempo');
    terimaBayar(id, r.sisa, 'transfer', 'Pelunasan');
    ({ r } = ambil(id));
    expect(r.status).toBe('Lunas');
  });

  it('untung di bawah target setelah faktur → perlu persetujuan', () => {
    const id = buatPesanan({
      pelangganId: 'amir', cara: 'ambil', tanggalJanji: '2026-10-10',
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-ktn', qty: 10 }],
    });
    const { p } = ambil(id);
    const spId = buatSP({
      distributorId: 'dist-c',
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-ktn', labelSatuan: 'Karton isi 12', qty: 10, hargaPerkiraan: 246000,
        untukPesanan: [{ pesananId: id, barisId: p.baris[0].id, jumlahDasar: 120 }] }],
    });
    const b = ambilSP(spId).baris[0];
    terimaDariSP(spId, { nomorDistributor: 'F-002', cara: 'cash', tutupSisa: false, baris: [{ barisId: b.id, qty: 10, harga: 258000 }] });
    expect(ambil(id).r.status).toBe('Perlu persetujuan');
  });

  it('kiriman kurang & SP tetap terbuka → sisa ditunggu', () => {
    const id = buatPesanan({
      pelangganId: 'amir', cara: 'ambil', tanggalJanji: '2026-10-10',
      baris: [{ produkId: 'deterjen', satuanProdukId: 'det-ktn', qty: 4 }],
    });
    const { p } = ambil(id);
    const spId = buatSP({
      distributorId: 'dist-b',
      baris: [{ produkId: 'deterjen', satuanProdukId: 'det-ktn', labelSatuan: 'Karton isi 12', qty: 4, hargaPerkiraan: 228000,
        untukPesanan: [{ pesananId: id, barisId: p.baris[0].id, jumlahDasar: 48 }] }],
    });
    const st = () => ambilSP(spId);
    terimaDariSP(spId, { nomorDistributor: 'F-003', cara: 'cash', tutupSisa: false, baris: [{ barisId: st().baris[0].id, qty: 3, harga: 228000 }] });
    expect(st().status).toBe('sebagian');
    expect(st().baris.filter((x) => !x.diterima)[0].qty).toBe(1);
    expect(ambil(id).p.baris[0].diterimaOrder).toBe(36);
    expect(ambil(id).r.status).toBe('Menunggu barang');
  });
});

describe('kasbon', () => {
  it('kasbon lama + kasbon penjualan + pesanan yang sudah diserahkan jadi satu tagihan; bayar menutup yang tertua', () => {
    const plg = tambahPelanggan('Pak Uji', '0800');
    const hari = new Date();
    const iso = (h: number) => tambahHari(`${hari.getFullYear()}-${String(hari.getMonth() + 1).padStart(2, '0')}-${String(hari.getDate()).padStart(2, '0')}`, h);
    catatKasbonLama({ pelangganId: plg, tanggal: iso(-30), jumlah: 40000, keterangan: 'buku lama' });
    catatKasbonPenjualan(plg, 'PJ-UJI-1', 25000);

    // Pesanan dengan DP: belum jadi kasbon sebelum barang diterima.
    const ps = buatPesanan({
      pelangganId: plg, cara: 'ambil', tanggalJanji: iso(1),
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-btl', qty: 10 }], // dari stok
      dp: { jumlah: 50000, metode: 'tunai' },
    });
    expect(tagihanPelanggan(plg).map((t) => t.sumber)).toEqual(['lama', 'penjualan']);
    const p = __state().pesanan.find((x) => x.id === ps)!;
    serahkan(ps, p.baris.map((b) => ({ barisId: b.id, jumlahDasar: b.qty * 1 })), false);
    const total = ringkasPesanan(__state().pesanan.find((x) => x.id === ps)!).total;
    const tagihanPs = tagihanPelanggan(plg).find((t) => t.sumber === 'pesanan')!;
    expect(tagihanPs.sisa).toBe(total - 50000);
    expect(ringkasKasbon(plg).saldo).toBe(40000 + 25000 + total - 50000);
    expect(ringkasKasbon(plg).lewatTempo).toBe(40000); // tempo bawaan 7 hari

    // Bayar 50.000: kasbon lama lunas, 10.000 ke nota penjualan
    const b = bayarKasbon({ pelangganId: plg, jumlah: 50000, metode: 'transfer', bank: 'BCA' });
    expect(b.alokasi.map((a) => [a.nomor, a.jumlah])).toEqual([[tagihanPelanggan(plg)[0].nomor, 40000], ['PJ-UJI-1', 10000]]);
    expect(ringkasKasbon(plg).lewatTempo).toBe(0);

    // Lunasi semua: bagian pesanan tercatat juga di pesanan → status Lunas
    bayarKasbon({ pelangganId: plg, jumlah: ringkasKasbon(plg).saldo, metode: 'tunai' });
    expect(ringkasKasbon(plg).saldo).toBe(0);
    expect(ringkasPesanan(__state().pesanan.find((x) => x.id === ps)!).status).toBe('Lunas');
  });
});
