/**
 * Tes HULU → HILIR: satu barang baru dibawa melewati semua alur, dan setiap sambungan data dicek.
 * Barang baru → Surat Pesanan → barang datang (faktur cash, dibayar dari brankas) → stok & harga beli →
 * penjualan kasir → pesanan pelanggan (DP, serah, tagihan) → retur → batal pesanan (uang kembali) →
 * pengeluaran → tutup kasir → buku brankas/rekening → laporan harian kasir & toko.
 */
import { describe, expect, it } from 'vitest';
import * as t from './toko';
import { ringkasTempat } from '../domain/kas';
import { produkContoh } from './contoh';

const ID = 'uji-teh-botol';

describe('hulu → hilir: semua alur saling terhubung', () => {
  it('satu barang dari didaftarkan sampai masuk laporan', () => {
    // 1. Barang baru (Gudang → Tambah Barang)
    t.setPeran('pemilik');
    t.simpanProduk({
      id: ID, sku: 'MNM-09999', nama: 'Teh Botol Uji', kategoriId: 'MNM', satuanDasarId: 'pcs', stokMinimum: 12, stokMaksimum: 48,
      metodeHarga: 'per_satuan', tingkatHarga: [], aktif: true,
      satuan: [
        { id: `${ID}-pcs`, satuanId: 'pcs', label: 'Pcs', isi: 1, dibeli: false, dijual: true, hargaJual: 4000 },
        { id: `${ID}-ktn`, satuanId: 'ktn', label: 'Karton isi 24 Pcs', isi: 24, dibeli: true, dijual: true, hargaJual: 90000 },
      ],
    });
    expect(t.stokFisik(ID)).toBe(0);
    expect(t.infoBarang(ID).status).toBe('baru');

    // 2. Pesanan Toko (SP) → barang datang, faktur CASH dibayar dari brankas
    const brankas0 = t.saldoTempat('brankas');
    const spId = t.buatSP({ distributorId: 'dist-a', sumber: 'stok', baris: [{ produkId: ID, satuanProdukId: `${ID}-ktn`, labelSatuan: 'Karton isi 24 Pcs', qty: 2, hargaPerkiraan: 72000, untukPesanan: [] }] });
    t.tandaiSPDikirim(spId);
    const sp = t.__state().sp.find((x) => x.id === spId)!;
    const pb = t.terimaDariSP(spId, { nomorDistributor: 'UJI-001', cara: 'cash', baris: [{ barisId: sp.baris[0].id, qty: 2, harga: 72000 }], tutupSisa: true });
    t.catatArus({ jenis: 'bayar-distributor', nomor: t.nomorArus('BD'), sumber: 'brankas', tunai: -144000, transfer: 0, penerima: 'Distributor A', keterangan: 'cash', faktur: [{ id: `fk:${pb}`, nomor: 'UJI-001', jumlah: 144000 }] });
    expect(t.stokFisik(ID)).toBe(48); // → stok
    expect(t.infoBarang(ID).beliPerSatuan[`${ID}-ktn`].harga).toBe(72000); // → harga beli terakhir per satuan
    expect(t.infoBarang(ID).beliAcuan).toBe(3000); // → dasar untung per pcs
    expect(t.daftarFaktur().find((f) => f.id === `fk:${pb}`)).toMatchObject({ status: 'lunas', sisa: 0 }); // → hutang (lunas)
    expect(t.saldoTempat('brankas')).toBe(brankas0 - 144000); // → buku brankas
    expect(t.mutasiTempat('brankas').some((m) => m.kelompok === 'belanja' && m.jumlah === -144000)).toBe(true); // → laporan (E. belanja)

    // 3. Kasir menjual 5 pcs tunai (laci Kasir A sedang buka)
    t.setPeran('kasir');
    const sesi = t.laciTerbuka()!;
    const nomorJual = t.nomorNotaBaru();
    const nota = t.susunNotaPenjualan({ nomor: nomorJual, waktuIso: new Date().toISOString(), pelangganId: 'umum', kasir: '[Kasir A]',
      baris: [{ produkId: ID, satuanProdukId: `${ID}-pcs`, qty: 5 }], potongan: 0, tunai: 20000, transfer: 0, kembalian: 0, kasbonBaru: 0, bayarKasbon: 0 });
    t.catatPenjualan(nota);
    t.catatArus({ jenis: 'penjualan', nomor: nomorJual, tunai: nota.total, transfer: 0, keterangan: 'uji' });
    expect(t.stokFisik(ID)).toBe(43); // → stok keluar
    expect(t.mutasiBarang(ID).some((m) => m.nomor === nomorJual && m.jumlah === -5)).toBe(true); // → kartu stok
    expect(t.infoBarang(ID).terjual30).toBe(5); // → analisis barang
    expect(t.laporanKasir(sesi.id).perKategori.length).toBeGreaterThan(0); // → barang terjual di laporan

    // 4. Pesanan pelanggan 10 pcs dari stok, DP tunai → dikunci → diserahkan → jadi tagihan
    const psId = t.buatPesanan({ pelangganId: 'amir', cara: 'ambil', tanggalJanji: t.hariIni(), baris: [{ produkId: ID, satuanProdukId: `${ID}-pcs`, qty: 10 }], dp: { jumlah: 20000, metode: 'tunai' } });
    expect(t.stokBebas(ID)).toBe(33); // → stok dikunci
    expect(t.stokFisik(ID)).toBe(43);
    expect(t.laporanKasir(sesi.id).pesanan.DP.tunai).toBeGreaterThanOrEqual(20000); // → laporan kasir DP
    const ps = t.__state().pesanan.find((x) => x.id === psId)!;
    t.serahkan(psId, [{ barisId: ps.baris[0].id, jumlahDasar: 10 }], false);
    expect(t.stokFisik(ID)).toBe(33); // → stok keluar saat serah
    expect(t.stokBebas(ID)).toBe(33);
    expect(t.tagihanPelanggan('amir').some((x) => x.id === `ps:${psId}` && x.sisa === 20000)).toBe(true); // → kasbon/piutang

    // 5. Retur 1 pcs dari nota (bagus, uang tunai kembali)
    t.simpanRetur({ sumber: 'nota', notaId: t.__state().penjualan.find((n) => n.nomor === nomorJual)!.id, nomorAsal: nomorJual, pelangganId: 'umum',
      baris: [{ produkId: ID, satuanProdukId: `${ID}-pcs`, asalBarisId: nota.baris[0].id, jumlahDasar: 1, nilai: 4000, kondisi: 'bagus' }],
      tukar: [], nilaiRetur: 4000, nilaiTukar: 0, selisih: 4000, cara: 'tunai', alasan: 'uji' });
    expect(t.stokFisik(ID)).toBe(34); // → stok kembali
    expect(t.laporanKasir(sesi.id).retur.bersih).toBeGreaterThanOrEqual(4000); // → retur mengurangi penjualan

    // 6. Pesanan lain dengan DP transfer dibatalkan → uang kembali tercatat
    const ps2 = t.buatPesanan({ pelangganId: 'amir', cara: 'ambil', tanggalJanji: t.hariIni(), baris: [{ produkId: ID, satuanProdukId: `${ID}-pcs`, qty: 3 }], dp: { jumlah: 5000, metode: 'transfer' } });
    expect(t.stokBebas(ID)).toBe(31);
    t.batalkan(ps2, 'uji', 'kembali');
    expect(t.stokBebas(ID)).toBe(34); // → kunci stok dilepas
    expect(t.mutasiTempat('bank').some((m) => m.nomor === t.__state().pesanan.find((x) => x.id === ps2)!.nomor && m.kelompok === 'kembali' && m.jumlah === -5000)).toBe(true); // → uang kembali

    // 7. Tutup kasir: seharusnya di laci = buku kas laci; uang diserahkan masuk brankas
    const r = t.ringkasLaci(sesi.id);
    const k = t.ringkasSesiKas(sesi.id);
    expect(k.r.saldoAkhir).toBe(r.seharusnya); // laporan kasir & buku kas sama
    const brankasSebelum = t.saldoTempat('brankas');
    t.tutupLaci({ uangFisik: r.seharusnya, pembagian: { sisaLaci: 500000, brankas: r.seharusnya - 500000, bank: 0, prive: 0 } });
    expect(t.saldoTempat('brankas')).toBe(brankasSebelum + r.seharusnya - 500000); // → brankas

    // 8. Laporan harian toko: pindah dana seimbang; saldo akhir = saldo awal + semua mutasi hari ini
    const semua = t.mutasiKas();
    const hari = t.hariIni();
    const pindah = semua.filter((m) => m.tanggal === hari && m.kelompok.startsWith('pindah')).reduce((a, m) => a + m.jumlah, 0);
    expect(pindah).toBe(0);
    for (const tempat of ['laci', 'brankas', 'bank'] as const) {
      const x = ringkasTempat(semua.filter((m) => m.tempat === tempat), hari, hari);
      const mutasiHariIni = semua.filter((m) => m.tempat === tempat && m.tanggal === hari && m.kelompok !== 'saldo-awal').reduce((a, m) => a + m.jumlah, 0);
      expect(x.saldoAkhir).toBe(x.saldoAwal + mutasiHariIni);
    }
    t.setPeran('pemilik');
  });

  it('setiap laci: laporan kasir (ringkasLaci) = buku kas (mutasi) untuk semua sesi', () => {
    const s = t.__state();
    for (const sesi of s.sesiLaci) {
      const r = t.ringkasLaci(sesi.id, s);
      const k = t.ringkasSesiKas(sesi.id, s);
      const sebelumTutup = sesi.ditutupIso ? k.r.saldoAkhir - k.r.selisih + (sesi.pembagian ? sesi.pembagian.brankas + sesi.pembagian.bank + sesi.pembagian.prive : 0) : k.r.saldoAkhir;
      expect(sebelumTutup).toBe(r.seharusnya);
    }
  });

  it('setiap faktur dibayar tercatat di kas; setiap barang: stok = jumlah lapisan FIFO − minus', () => {
    const s = t.__state();
    const dibayar = s.arus.filter((a) => a.jenis === 'bayar-distributor');
    for (const a of dibayar) expect(t.mutasiKas(s).some((m) => m.nomor === a.nomor && m.kelompok === 'belanja')).toBe(true);
    for (const p of produkContoh.map((x) => x.id)) {
      const i = t.infoBarang(p, s);
      expect(Math.round((i.lapisan.reduce((a, l) => a + l.sisa, 0) - i.minus) * 1000) / 1000).toBe(i.stok);
    }
  });
});
