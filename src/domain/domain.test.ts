/**
 * Tes aturan bisnis memakai contoh-contoh yang disepakati saat perancangan.
 * Angka harga hanya ilustrasi.
 */
import { describe, expect, it } from 'vitest';
import { formatStok } from '../lib/format';
import { ringkasTempat, saldoBerjalan, type MutasiKas } from './kas';
import { ambilFifo, modalBarisFaktur } from './fifo';
import { hitungHargaBaris } from './harga';
import { alokasiTertua, cekKasbon, selisihHari, tambahHari } from './kasbon';
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
  it('pelanggan Umum tidak dapat diskon pelanggan (saran 0)', () => {
    const h = hitungHargaBaris(gula, 'gula-kg', 7, umum, [{ pelangganId: 'umum', produkId: 'gula', jenis: 'potongan_rp', nilai: 200 }]);
    expect(h.diskonSaran).toBe(0);
    expect(h.diskon).toBe(0);
  });
  it('diskon yang diketik kasir berlaku juga untuk Umum, maksimal sebesar harga', () => {
    expect(hitungHargaBaris(gula, 'gula-kg', 7, umum, diskon, 2000).netto).toBe(40000);
    expect(hitungHargaBaris(gula, 'gula-kg', 1, umum, diskon, 99999).netto).toBe(0);
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
  it('ada nota lewat jatuh tempo: kasbon baru perlu PIN pemilik walau masih dalam batas', () => {
    expect(cekKasbon(amir, 0, 50000, true)).toEqual({ boleh: false, alasan: 'lewat_tempo', perluPinPemilik: true });
  });
  it('pembayaran menutup nota tertua dulu', () => {
    const nota = [
      { id: 'b', tanggal: '2026-09-26', sisa: 60000 },
      { id: 'a', tanggal: '2026-08-29', sisa: 50000 }, // kasbon lama
      { id: 'c', tanggal: '2026-10-05', sisa: 35000 },
    ];
    expect(alokasiTertua(nota, 80000)).toEqual([{ notaId: 'a', jumlah: 50000 }, { notaId: 'b', jumlah: 30000 }]);
    expect(alokasiTertua(nota, 145000).map((x) => x.jumlah)).toEqual([50000, 60000, 35000]);
  });
  it('jatuh tempo = tanggal nota + tempo pelanggan', () => {
    expect(tambahHari('2026-09-26', 14)).toBe('2026-10-10');
    expect(tambahHari('2026-12-25', 14)).toBe('2027-01-08');
    expect(selisihHari('2026-10-10', '2026-10-08')).toBe(-2);
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

describe('harga diubah kasir (barang timbang)', () => {
  const bawang: Produk = {
    id: 'bawang', sku: 'UMB-00001', nama: 'Bawang Merah', kategoriId: 'UMB', satuanDasarId: 'kg', stokMinimum: 5,
    metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
    satuan: [{ id: 'bwm-kg', satuanId: 'kg', label: 'kg', isi: 1, dibeli: true, dijual: true, hargaJual: 38000 }],
  };
  it('harga bawaan dipakai bila tidak diubah', () => {
    const h = hitungHargaBaris(bawang, 'bwm-kg', 0.25, umum, []);
    expect(h.bruto).toBe(9500);
    expect(h.hargaDiubah).toBe(false);
  });
  it('harga per kg diubah kasir, lalu tetap bisa diberi diskon', () => {
    const h = hitungHargaBaris(bawang, 'bwm-kg', 0.5, umum, [], 500, 40000);
    expect(h.bruto).toBe(20000);
    expect(h.netto).toBe(19500);
    expect(h.hargaDiubah).toBe(true);
    expect(h.hargaNormal).toBe(38000);
  });
});


import { cekBatasRetur, nilaiAkhirBaris, nilaiRetur, selisihTukar } from './retur';

describe('retur', () => {
  it('nilai retur memakai harga setelah diskon, termasuk potongan akhir dibagi sebanding', () => {
    // Nota 756.250 dibayar 750.000 (potongan 6.250)
    const baris = [
      { id: 'a', netto: 500000, jumlahDasar: 50 },
      { id: 'b', netto: 256250, jumlahDasar: 25 },
    ];
    const n = nilaiAkhirBaris(baris, 750000);
    expect(n.a + n.b).toBe(750000);
    expect(n.a).toBe(495868); // 500.000 × 750.000 / 756.250
    // Retur 10 dari 50 → sebanding
    expect(nilaiRetur(n.a, 50, 10)).toBe(99174);
    // Retur penuh = persis nilai baris
    expect(nilaiRetur(n.b, 25, 25)).toBe(n.b);
  });
  it('batas 3×24 jam', () => {
    expect(cekBatasRetur('2026-10-05T10:00:00', '2026-10-08T09:59:00', 3).dalamBatas).toBe(true);
    expect(cekBatasRetur('2026-10-05T10:00:00', '2026-10-08T10:01:00', 3).dalamBatas).toBe(false);
  });
  it('tukar barang lain: bisa kembali uang atau tambah bayar', () => {
    expect(selisihTukar(35000, 20000)).toBe(15000); // toko mengembalikan
    expect(selisihTukar(35000, 50000)).toBe(-15000); // pelanggan menambah
  });
});

describe('laporan kas per tempat uang', () => {
  const m = (tanggal: string, kelompok: MutasiKas['kelompok'], jumlah: number, rincian = 'x'): MutasiKas =>
    ({ id: `${tanggal}${kelompok}${jumlah}`, nomor: '-', waktuIso: `${tanggal}T10:00:00`, tanggal, tempat: 'brankas', akun: '-', kelompok, rincian, jumlah, keterangan: '' });
  const data = [
    m('2026-10-01', 'saldo-awal', 10000000),
    m('2026-10-02', 'pindah-masuk', 2000000),
    m('2026-10-03', 'biaya', -150000, 'Kemasan'),
    m('2026-10-03', 'biaya', -50000, 'Kemasan'),
    m('2026-10-03', 'pendapatan', 35000, 'Pendapatan lain · Jual kardus/karung bekas'),
    m('2026-10-03', 'pindah-keluar', -5000000),
    m('2026-10-03', 'selisih', -5000),
    m('2026-10-04', 'prive', -1000000),
  ];
  it('saldo awal hari = semua mutasi sebelumnya; saldo akhir = awal + masuk − keluar ± pindah + selisih', () => {
    const r = ringkasTempat(data, '2026-10-03', '2026-10-03');
    expect(r.saldoAwal).toBe(12000000);
    expect(r).toMatchObject({ masuk: 35000, keluar: 200000, pindahMasuk: 0, pindahKeluar: 5000000, selisih: -5000 });
    expect(r.saldoAkhir).toBe(12000000 + 35000 - 200000 - 5000000 - 5000);
    expect(r.perKelompok.biaya?.rincian.Kemasan).toBe(-200000);
  });
  it('laporan bulanan = jumlah harian (saldo akhir hari sebelumnya = saldo awal hari berikutnya)', () => {
    const bulan = ringkasTempat(data, '2026-10-01', '2026-10-31');
    expect(bulan.saldoAwal).toBe(10000000);
    expect(bulan.saldoAkhir).toBe(ringkasTempat(data, '2026-10-04', '2026-10-04').saldoAkhir);
    expect(ringkasTempat(data, '2026-10-03', '2026-10-03').saldoAkhir).toBe(ringkasTempat(data, '2026-10-04', '2026-10-04').saldoAwal);
    expect(saldoBerjalan(data).slice(-1)[0].saldo).toBe(bulan.saldoAkhir);
  });
});
