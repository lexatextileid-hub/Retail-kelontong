/**
 * Tes aturan bisnis memakai contoh-contoh yang disepakati saat perancangan.
 * Angka harga hanya ilustrasi.
 */
import { describe, expect, it } from 'vitest';
import { formatStok } from '../lib/format';
import { ambilFifo, modalBarisFaktur } from './fifo';
import { hitungHargaBaris } from './harga';
import { cekKasbon } from './kasbon';
import { kunciNama, satuanBawaan } from './satuanBawaan';
import { buatSku, kategoriBawaan, kelompokBawaan } from './kategoriBawaan';
import type { DiskonPelanggan, LapisanStok, Pelanggan, Produk } from './tipe';

const gula: Produk = {
  id: 'gula', sku: 'SMB-00001', nama: 'Gula Pasir', kategoriId: 'sembako', satuanDasarId: 'kg', stokMinimum: 25,
  metodeHarga: 'bertingkat', aktif: true,
  satuan: [
    { id: 'gula-kg', satuanId: 'kg', label: 'kg', isi: 1, dibeli: false, dijual: true },
    { id: 'gula-karung', satuanId: 'karung', label: 'Karung 25 kg', isi: 25, dibeli: true, dijual: true },
  ],
  tingkatHarga: [
    { mulaiJumlah: 0, harga: 8000 },
    { mulaiJumlah: 5, harga: 6000 },
    { mulaiJumlah: 25, harga: 4600 },
  ],
};

const rokok: Produk = {
  id: 'rokok-a', sku: 'RKK-00001', nama: 'Rokok A', kategoriId: 'rokok', satuanDasarId: 'bungkus', stokMinimum: 10,
  metodeHarga: 'per_satuan', aktif: true, tingkatHarga: [],
  satuan: [
    { id: 'rk-bks', satuanId: 'bungkus', label: 'Bungkus', isi: 1, dibeli: false, dijual: true, hargaJual: 32000 },
    { id: 'rk-slop', satuanId: 'slop', label: 'Slop', isi: 10, dibeli: true, dijual: true, hargaJual: 310000 },
  ],
};

const umum: Pelanggan = { id: 'umum', nama: 'Umum', jenis: 'umum', batasKasbon: 0 };
const antok: Pelanggan = { id: 'antok', nama: 'Antok', jenis: 'terdaftar', batasKasbon: 500000 };
const amir: Pelanggan = { id: 'amir', nama: 'Amir', jenis: 'terdaftar', batasKasbon: 300000 };
const diskon: DiskonPelanggan[] = [{ pelangganId: 'antok', produkId: 'gula', jenis: 'potongan_rp', nilai: 200 }];

describe('harga bertingkat (gula)', () => {
  it('di bawah 5 kg: Rp 8.000/kg', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 3, umum, diskon).netto).toBe(24000);
  });
  it('5 kg ke atas: Rp 6.000/kg untuk seluruh jumlah', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 7, umum, diskon).netto).toBe(42000);
  });
  it('1 karung = 25 kg kena harga karung', () => {
    const h = hitungHargaBaris(gula, 'gula-karung', 1, umum, diskon);
    expect(h.jumlahDasar).toBe(25);
    expect(h.netto).toBe(115000);
  });
  it('memberi tahu kurang berapa kg ke tingkat berikutnya', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 4, umum, diskon).tingkatBerikutnya).toEqual({
      tingkat: { mulaiJumlah: 5, harga: 6000 }, kurang: 1,
    });
  });
});

describe('diskon pelanggan', () => {
  it('Antok: harga normal lalu potongan Rp 200/kg', () => {
    const h = hitungHargaBaris(gula, 'gula-kg', 7, antok, diskon);
    expect(h.bruto).toBe(42000);
    expect(h.diskonSaran).toBe(1400);
    expect(h.netto).toBe(40600);
  });
  it('Antok beli karung tetap lebih murah dari harga umum', () => {
    expect(hitungHargaBaris(gula, 'gula-karung', 1, antok, diskon).netto).toBe(110000);
  });
  it('kasir boleh mengubah diskon dan perubahan ditandai', () => {
    const h = hitungHargaBaris(gula, 'gula-kg', 7, antok, diskon, 2100);
    expect(h.netto).toBe(39900);
    expect(h.diskonDiubah).toBe(true);
  });
  it('Amir tanpa entri diskon: harga normal', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 7, amir, diskon).diskon).toBe(0);
  });
  it('pelanggan Umum tidak pernah dapat diskon pelanggan', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 7, umum, diskon, 5000).diskon).toBe(0);
  });
});

describe('harga per satuan (rokok)', () => {
  it('bungkus dan slop punya harga sendiri', () => {
    expect(hitungHargaBaris(rokok, 'rk-bks', 3, umum, []).netto).toBe(96000);
    const slop = hitungHargaBaris(rokok, 'rk-slop', 1, umum, []);
    expect(slop.netto).toBe(310000);
    expect(slop.jumlahDasar).toBe(10);
  });
});

describe('kasbon', () => {
  it('pelanggan Umum tidak bisa kasbon', () => {
    expect(cekKasbon(umum, 0, 1000)).toEqual({ boleh: false, alasan: 'pelanggan_umum' });
  });
  it('melebihi sisa batas perlu PIN pemilik', () => {
    expect(cekKasbon(antok, 145000, 361100)).toEqual({
      boleh: false, alasan: 'melebihi_batas', sisaBatas: 355000, perluPinPemilik: true,
    });
  });
  it('di bawah batas boleh', () => {
    expect(cekKasbon(amir, 0, 50000)).toEqual({ boleh: true, sisaSetelah: 250000 });
  });
});

describe('FIFO (Sarimi)', () => {
  const lapisan: LapisanStok[] = [
    { id: 'L2', produkId: 'sarimi', sumber: 'faktur', tanggal: '2026-10-05', jumlahAwal: 100, sisa: 100, modalPerSatuanDasar: 2100 },
    { id: 'L1', produkId: 'sarimi', sumber: 'faktur', tanggal: '2026-10-01', jumlahAwal: 100, sisa: 100, modalPerSatuanDasar: 2060 },
  ];

  it('jual 120 bks: 100 dari faktur lama + 20 dari faktur baru', () => {
    const h = ambilFifo(lapisan, 120, 2100);
    expect(h.pemakaian.map((p) => [p.lapisanId, p.jumlah])).toEqual([['L1', 100], ['L2', 20]]);
    expect(h.totalModal).toBe(248000);
    expect(h.kurang).toBe(0);
  });
  it('jual melebihi stok: sisanya pakai modal sementara', () => {
    const h = ambilFifo(lapisan, 210, 2120);
    expect(h.kurang).toBe(10);
    expect(h.modalSementara).toBe(21200);
  });
  it('bagian dari saldo awal dilaporkan terpisah', () => {
    const awal: LapisanStok[] = [
      { id: 'SA', produkId: 'x', sumber: 'saldo_awal', tanggal: '2026-10-01', jumlahAwal: 10, sisa: 10, modalPerSatuanDasar: 1000 },
      { id: 'F', produkId: 'x', sumber: 'faktur', tanggal: '2026-10-02', jumlahAwal: 10, sisa: 10, modalPerSatuanDasar: 1100 },
    ];
    const h = ambilFifo(awal, 15, 1100);
    expect(h.modalDariSaldoAwal).toBe(10000);
    expect(h.totalModal).toBe(15500);
  });
  it('barang bonus menurunkan modal per satuan dasar', () => {
    // beli 10 dus isi 40 @ Rp 120.000, bonus 1 dus
    expect(modalBarisFaktur(1_200_000, 400, 40)).toBeCloseTo(2727.27, 2);
  });
});

describe('master satuan bawaan', () => {
  it('nama dan singkatan tidak ada yang ganda', () => {
    const nama = satuanBawaan.map((s) => kunciNama(s.nama));
    const singkatan = satuanBawaan.map((s) => kunciNama(s.singkatan));
    expect(new Set(nama).size).toBe(nama.length);
    expect(new Set(singkatan).size).toBe(singkatan.length);
  });
  it('"PCS", "pcs." dan " Pcs " dianggap sama', () => {
    expect(new Set(['PCS', 'pcs.', ' Pcs ']).size).toBe(3);
    expect(new Set(['PCS', 'pcs.', ' Pcs '].map(kunciNama)).size).toBe(1);
  });
});

describe('kategori & SKU', () => {
  it('kode kategori 3 huruf dan unik, kelompoknya terdaftar', () => {
    const kode = kategoriBawaan.map((k) => k.kode);
    expect(new Set(kode).size).toBe(kode.length);
    expect(kode.every((k) => /^[A-Z]{3}$/.test(k))).toBe(true);
    expect(kategoriBawaan.every((k) => (kelompokBawaan as readonly string[]).includes(k.kelompok))).toBe(true);
  });
  it('SKU lanjut dari nomor terbesar dalam kategori yang sama', () => {
    expect(buatSku('SMB', [])).toBe('SMB-00001');
    expect(buatSku('SMB', ['SMB-00001', 'SMB-00002', 'RKK-00009'])).toBe('SMB-00003');
    expect(buatSku('rkk', ['SMB-00001', 'RKK-00009'])).toBe('RKK-00010');
  });
});

describe('format stok', () => {
  it('132 pcs dengan dus isi 40 → 3 dus 12 pcs', () => {
    expect(formatStok(132, [{ label: 'pcs', isi: 1 }, { label: 'dus', isi: 40 }])).toBe('3 dus 12 pcs');
  });
});
