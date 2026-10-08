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

describe('retur', () => {
  it('retur sebagian dari nota kasbon: potong kasbon, barang bagus kembali ke stok, rusak ke barang rusak', async () => {
    const { catatPenjualan, simpanRetur, sudahDiretur, susunNotaPenjualan, stokBebas } = await import('./toko');
    const plg = tambahPelanggan('Bu Retur');
    const n = susunNotaPenjualan({
      nomor: 'PJ-UJI-R1', waktuIso: new Date().toISOString(), pelangganId: plg, kasir: 'uji',
      baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-btl', qty: 4 }], potongan: 0,
      tunai: 0, transfer: 0, kembalian: 0, kasbonBaru: 0, bayarKasbon: 0,
    });
    const notaId = catatPenjualan({ ...n, kasbonBaru: n.total });
    catatKasbonPenjualan(plg, 'PJ-UJI-R1', n.total);
    const stokSebelum = stokBebas('kecap');
    const per = n.baris[0].nilai / 4;
    simpanRetur({
      sumber: 'nota', notaId, nomorAsal: 'PJ-UJI-R1', pelangganId: plg,
      baris: [
        { produkId: 'kecap', asalBarisId: n.baris[0].id, jumlahDasar: 1, nilai: per, kondisi: 'bagus' },
        { produkId: 'kecap', asalBarisId: n.baris[0].id, jumlahDasar: 1, nilai: per, kondisi: 'rusak' },
      ],
      tukar: [], nilaiRetur: per * 2, nilaiTukar: 0, selisih: per * 2, cara: 'kasbon', alasan: 'Rusak / cacat',
    });
    expect(ringkasKasbon(plg).saldo).toBe(n.total - per * 2);
    expect(stokBebas('kecap')).toBe(stokSebelum + 1);
    expect(__state().barangRusak.some((b) => b.asal.startsWith('Retur') && b.produkId === 'kecap')).toBe(true);
    expect(sudahDiretur({ notaId }, n.baris[0].id)).toBe(2);
  });
});

describe('kas laci', () => {
  it('buka (dari sisa kemarin) → transaksi tunai/transfer → pengeluaran → tutup dengan selisih dan pembagian', async () => {
    const t = await import('./toko');
    t.setPeran('admin'); // akun [Admin A], belum punya laci
    expect(t.laciTerbuka()).toBeUndefined();
    const s = t.bukaLaci(100000);
    expect(s.dariKemarin).toBe(0);
    t.catatArus({ jenis: 'penjualan', nomor: 'PJ-UJI-L1', tunai: 50000, transfer: 20000, keterangan: 'uji' });
    t.catatArus({ jenis: 'pengeluaran', nomor: 'KK-UJI', tunai: -15000, transfer: 0, kategori: 'Kemasan', penerima: 'Toko plastik', keterangan: 'kantong' });
    t.catatArus({ jenis: 'pengeluaran', nomor: 'KK-UJI2', sumber: 'brankas', tunai: -99000, transfer: 0, kategori: 'Sewa ruko', penerima: 'x', keterangan: 'dari brankas' });
    const r = t.ringkasLaci(s.id);
    expect(r.seharusnya).toBe(100000 + 50000 - 15000); // pengeluaran dari brankas tidak mengurangi laci
    expect(r.totalTransfer).toBe(20000);
    t.tutupLaci({ uangFisik: 134000, selisihDitanggung: 'kasir', pembagian: { sisaLaci: 100000, brankas: 34000, bank: 0, prive: 0 } });
    const tutup = t.laciTerakhirDitutup()!;
    expect(tutup.selisih).toBe(-1000);
    expect(tutup.selisihDitanggung).toBe('kasir');
    // Buka lagi: modal = sisa laci tadi
    expect(t.bukaLaci(0).dariKemarin).toBe(100000);
    t.setPeran('pemilik');
  });
});

describe('buku kas per tempat uang (laci, brankas, rekening)', () => {
  it('laci yang ditutup berakhir di sisa laci; transfer masuk rekening; pindah dana seimbang', async () => {
    const t = await import('./toko');
    const { ringkasTempat } = await import('../domain/kas');
    const st = t.__state();
    const sesi = st.sesiLaci.find((x) => x.akun === '[Admin A]' && x.ditutupIso)!;
    const r = ringkasTempat(t.mutasiTempat('laci', st, sesi.id), '0000-01-01', '9999-12-31');
    expect(r.pindahMasuk).toBe(100000); // tambahan dari pemilik saat buka
    expect(r.masuk).toBe(50000);
    expect(r.keluar).toBe(15000); // pengeluaran dari brankas tidak ikut laci
    expect(r.selisih).toBe(-1000);
    expect(r.pindahKeluar).toBe(34000); // diserahkan ke pemilik saat tutup
    expect(r.saldoAkhir).toBe(sesi.pembagian!.sisaLaci);
    const bank = t.mutasiTempat('bank', st).find((m) => m.nomor === 'PJ-UJI-L1')!;
    expect(bank).toMatchObject({ kelompok: 'pendapatan', rincian: 'Penjualan', jumlah: 20000 });
    const brankasUji = t.mutasiTempat('brankas', st).find((m) => m.nomor === 'KK-UJI2')!;
    expect(brankasUji).toMatchObject({ kelompok: 'biaya', rincian: 'Sewa ruko', jumlah: -99000 });
    const pindah = t.mutasiKas(st).filter((m) => m.kelompok === 'pindah-masuk' || m.kelompok === 'pindah-keluar');
    expect(pindah.reduce((a, m) => a + m.jumlah, 0)).toBe(0);
  });

  it('brankas & rekening: pindah, prive, pendapatan lain, hitung fisik dengan selisih', async () => {
    const t = await import('./toko');
    const brankas0 = t.saldoTempat('brankas');
    const bank0 = t.saldoTempat('bank');
    t.catatKasPemilik({ jenis: 'pindah', nomor: 'PD-UJI', sumber: 'brankas', ke: 'bank', tunai: -1000000, transfer: 0, keterangan: 'uji' });
    t.catatKasPemilik({ jenis: 'prive', nomor: 'PR-UJI', sumber: 'brankas', tunai: -200000, transfer: 0, keterangan: 'uji' });
    t.catatKasPemilik({ jenis: 'kas-masuk', nomor: 'KM-UJI', sumber: 'bank', tunai: 0, transfer: 5000, kategori: 'Bunga/cashback bank', keterangan: 'uji' });
    expect(t.saldoTempat('brankas')).toBe(brankas0 - 1200000);
    expect(t.saldoTempat('bank')).toBe(bank0 + 1005000);
    const km = t.mutasiTempat('bank').find((m) => m.nomor === 'KM-UJI')!;
    expect(km.rincian).toBe('Pendapatan lain · Bunga/cashback bank');
    // Hitung fisik: uang kurang 5.000 (pengeluaran lupa dicatat) → selisih, saldo buku ikut fisik
    const c = t.cocokkanTempat('brankas', t.saldoTempat('brankas') - 5000, 'lupa catat parkir');
    expect(c.selisih).toBe(-5000);
    expect(t.saldoTempat('brankas')).toBe(c.fisik);
    expect(t.pencocokanTerakhir('brankas')?.id).toBe(c.id);
  });

  it('kasbon karyawan: diberi dikurangi cicilan', async () => {
    const t = await import('./toko');
    const rudi = t.kasbonKaryawan().find((k) => k.nama === 'Rudi')!;
    expect(rudi).toMatchObject({ diberi: 300000, dibayar: 100000, sisa: 200000 });
    expect(t.mutasiTempat('brankas').find((m) => m.nomor === 'KR-2610-0001')?.kelompok).toBe('kasbon-karyawan');
    expect(t.mutasiTempat('brankas').find((m) => m.nomor === 'KR-2610-0002')?.kelompok).toBe('piutang');
  });
});

describe('laporan harian kasir', () => {
  it('bayar kasbon di nota penjualan dipisah dari uang penjualan (tunai dulu)', async () => {
    const { pisahBayarKasbon } = await import('./toko');
    expect(pisahBayarKasbon(50000, 0, 20000)).toEqual({ jual: { tunai: 30000, transfer: 0 }, kasbon: { tunai: 20000, transfer: 0 } });
    expect(pisahBayarKasbon(5000, 30000, 10000)).toEqual({ jual: { tunai: 0, transfer: 25000 }, kasbon: { tunai: 5000, transfer: 5000 } });
  });

  it('pesanan DP/pelunasan, pendapatan lain, faktur tunai, operasional → kas laci seimbang', async () => {
    const t = await import('./toko');
    t.setPeran('admin');
    const sesi = t.laciTerbuka() ?? t.bukaLaci(0);
    const stok0 = t.stokFisik('gula-1kg');
    t.catatArus({ jenis: 'penjualan', nomor: 'PJ-UJI-K1', tunai: 30000, transfer: 0, keterangan: 'uji' });
    t.catatArus({ jenis: 'pesanan', tahap: 'DP', nomor: 'PS-UJI', tunai: 0, transfer: 100000, keterangan: 'DP' });
    t.catatArus({ jenis: 'pesanan', tahap: 'Pelunasan', nomor: 'PS-UJI', tunai: 50000, transfer: 0, keterangan: 'lunas' });
    t.catatArus({ jenis: 'kas-masuk', nomor: 'KM-UJI-K', tunai: 20000, transfer: 0, kategori: 'Jual kardus/karung bekas', keterangan: 'kardus' });
    const { faktur, arus } = t.buatFakturTunai({ distributorId: 'lain:Toko Sebelah', namaPemasok: 'Toko Sebelah', baris: [{ produkId: 'gula-1kg', satuanProdukId: 'gula-1kg-bks', qty: 2, harga: 15000 }] });
    t.catatArus({ jenis: 'pengeluaran', nomor: 'KK-UJI-K', tunai: -5000, transfer: 0, kategori: 'Kemasan', penerima: 'x', keterangan: 'plastik' });
    expect(faktur.total).toBe(30000);
    expect(t.stokFisik('gula-1kg')).toBe(stok0 + 2);
    expect(t.daftarFaktur().find((f) => f.id === `ft:${faktur.id}`)).toMatchObject({ status: 'lunas', sisa: 0 });
    expect(t.mutasiTempat('laci').find((m) => m.nomor === arus.nomor)?.rincian).toBe('Faktur tunai (tanpa nota)');
    expect(t.mutasiTempat('bank').find((m) => m.nomor === 'PS-UJI')?.rincian).toBe('Pesanan · DP');

    const l = t.laporanKasir(sesi.id);
    expect(l.pesanan.DP).toMatchObject({ n: 1, transfer: 100000 });
    expect(l.pesanan.Pelunasan).toMatchObject({ n: 1, tunai: 50000 });
    expect(l.lain).toContainEqual(['Jual kardus/karung bekas', { n: 1, tunai: 20000, transfer: 0 }]);
    expect(l.faktur.find((f) => f.tunaiTanpaNota)?.jumlah).toBe(30000);
    expect(l.operasional).toContainEqual(['Kemasan', { n: 1, jumlah: 5000 }]);
    expect(l.transfer.dp).toBe(100000);
    const k = l.kas;
    expect(k.saldoAwal + k.dariPemilik + k.pendapatan + k.bayarKasbon - k.returKembali - k.pengeluaran - k.setorBank).toBe(k.seharusnya);
    t.setPeran('pemilik');
  });
});

describe('buku stok', () => {
  it('pesanan dari stok: dikunci saat dipesan, keluar dari stok fisik saat diserahkan (stok bebas tidak naik lagi)', async () => {
    const t = await import('./toko');
    const fisik0 = t.stokFisik('amild');
    const bebas0 = t.stokBebas('amild');
    const id = t.buatPesanan({ pelangganId: 'amir', cara: 'ambil', tanggalJanji: t.hariIni(), baris: [{ produkId: 'amild', satuanProdukId: 'amild-bks', qty: 5 }] });
    expect(t.stokBebas('amild')).toBe(bebas0 - 5);
    expect(t.stokFisik('amild')).toBe(fisik0);
    const p = t.__state().pesanan.find((x) => x.id === id)!;
    t.serahkan(id, [{ barisId: p.baris[0].id, jumlahDasar: 5 }], false);
    expect(t.stokFisik('amild')).toBe(fisik0 - 5);
    expect(t.stokBebas('amild')).toBe(bebas0 - 5);
    expect(t.mutasiBarang('amild').some((m) => m.jenis === 'serah-pesanan' && m.jumlah === -5)).toBe(true);
  });

  it('info barang: status gerak, umur, nilai stok dari FIFO', async () => {
    const t = await import('./toko');
    expect(t.infoBarang('sarimi').status).toBe('laku');
    expect(t.infoBarang('kecap').status).toBe('lambat');
    expect(t.infoBarang('deterjen').status).toBe('berhenti');
    expect(t.infoBarang('bawang-merah').status).toBe('baru');
    expect(t.infoBarang('rokok-hs').umur?.warna).toBe('merah');
    const i = t.infoBarang('taro');
    expect(i.nilai).toBe(Math.round(i.lapisan.reduce((a, l) => a + l.sisa * l.modal, 0)));
    expect(i.lapisan.reduce((a, l) => a + l.sisa, 0)).toBeCloseTo(i.stok - 0, 3);
  });
});

describe('harga beli per satuan beli', () => {
  it('faktur mencatat harga per satuan beli; perkiraan memakai satuan beli terkecil', async () => {
    const t = await import('./toko');
    expect(t.infoBarang('sarimi').beliPerSatuan['sarimi-ktn50']?.harga).toBeGreaterThan(0);
    const p = { ...t.__state() && (await import('../features/penjualan/model')).ambilProduk('amild'), hargaBeliAcuan: undefined,
      satuan: [
        { id: 'a', satuanId: 'bks', label: 'Bungkus', isi: 1, dibeli: false, dijual: true },
        { id: 'b', satuanId: 'slp', label: 'Slop', isi: 10, dibeli: true, dijual: true, hargaBeli: 310000 },
        { id: 'c', satuanId: 'ktn', label: 'Karton', isi: 100, dibeli: true, dijual: false, hargaBeli: 3050000 },
      ] };
    expect(t.beliPerkiraan(p)).toBe(31000); // dari slop (satuan beli terkecil), bukan karton yang lebih murah
  });
});

describe('harga beli diubah manual', () => {
  it('lebih baru dari faktur → dipakai; faktur berikutnya kembali jadi acuan', async () => {
    const t = await import('./toko');
    const { ambilProduk } = await import('../features/penjualan/model');
    const p = ambilProduk('kecap');
    t.simpanProduk({ ...p, satuan: p.satuan.map((s) => (s.id === 'kecap-ktn' ? { ...s, hargaBeli: 300000, hargaBeliTanggal: new Date().toISOString() } : s)) });
    expect(t.infoBarang('kecap').beliPerSatuan['kecap-ktn']).toMatchObject({ harga: 300000, manual: true });
    expect(t.infoBarang('kecap').beliAcuan).toBe(25000);
    await new Promise((r) => setTimeout(r, 5));
    t.setPeran('kasir');
    t.buatFakturTunai({ distributorId: 'dist-c', namaPemasok: 'Distributor C', baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-ktn', qty: 1, harga: 264000 }] });
    t.setPeran('pemilik');
    expect(t.infoBarang('kecap').beliPerSatuan['kecap-ktn']).toMatchObject({ harga: 264000 });
    expect(t.infoBarang('kecap').beliAcuan).toBe(22000);
  });
});

describe('saldo pelanggan', () => {
  it('DP pesanan batal jadi saldo → dipakai bayar kasbon & pesanan → sisanya dikembalikan (uang keluar tercatat)', async () => {
    const t = await import('./toko');
    t.setPeran('kasir');
    const awal = t.saldoPelanggan('bu-sri');
    const ps = t.buatPesanan({ pelangganId: 'bu-sri', cara: 'ambil', tanggalJanji: t.hariIni(), baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-btl', qty: 2 }], dp: { jumlah: 30000, metode: 'tunai' } });
    t.batalkan(ps, 'uji', 'saldo');
    expect(t.saldoPelanggan('bu-sri')).toBe(awal + 30000);
    expect(t.pelangganDenganKasbon('bu-sri').saldo).toBe(awal + 30000);
    // dipakai bayar kasbon 10.000 (tanpa uang masuk laci)
    const arus0 = t.__state().arus.length;
    t.bayarKasbon({ pelangganId: 'bu-sri', jumlah: 10000, metode: 'saldo' });
    expect(t.__state().arus.length).toBe(arus0);
    expect(t.saldoPelanggan('bu-sri')).toBe(awal + 20000);
    // dipakai bayar pesanan lain 5.000
    const ps2 = t.buatPesanan({ pelangganId: 'bu-sri', cara: 'ambil', tanggalJanji: t.hariIni(), baris: [{ produkId: 'kecap', satuanProdukId: 'kecap-btl', qty: 1 }] });
    t.terimaBayar(ps2, 5000, 'saldo', 'DP');
    expect(t.saldoPelanggan('bu-sri')).toBe(awal + 15000);
    expect(t.__state().arus.length).toBe(arus0);
    // pesanan ps2 batal "kembali" → bagian dari saldo kembali ke saldo, bukan uang keluar
    t.batalkan(ps2, 'uji', 'kembali');
    expect(t.saldoPelanggan('bu-sri')).toBe(awal + 20000);
    // dikembalikan tunai → uang keluar laci, kelompok "kembali ke pelanggan"
    const x = t.kembalikanSaldo('bu-sri', 20000, 'tunai')!;
    expect(t.saldoPelanggan('bu-sri')).toBe(awal);
    expect(t.mutasiTempat('laci').find((m) => m.nomor === x.nomor)).toMatchObject({ kelompok: 'kembali', jumlah: -20000 });
    t.setPeran('pemilik');
  });
});
