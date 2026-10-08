import { describe, expect, it } from 'vitest';
import { __state, buatPesanan, buatSP, ringkasPesanan, serahkan, terimaBayar, terimaDariSP } from './toko';

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
