# Keputusan Desain — Retail Kelontong

Dokumen ini mencatat aturan bisnis yang sudah disepakati. Kode di `src/domain/` mengikuti dokumen ini, dan tesnya (`src/domain/domain.test.ts`) memakai contoh-contoh di bawah. Angka harga hanya ilustrasi.

## Gambaran usaha

- Toko kelontong, eceran sekaligus grosir, toko fisik (POS/kasir).
- Usaha sudah berjalan; sistem harus bisa mulai dari saldo awal.
- Barang dibeli dari banyak distributor, cash atau tempo, dengan harga berbeda-beda.
- Barang datang diinput dari **kertas faktur**, polanya mirip apotek. Scan barcode tidak wajib.
- Aplikasi web. Rencana: modul retail di dalam LEXA OMS (React + Supabase), data barang/transaksi terpisah dari bisnis apparel.

## Struktur aplikasi

**Operasional (khusus kasir):** Penjualan, Kasbon, Barang Masuk, Hitung Stok, Riwayat, Kas masuk/keluar, Buka/Tutup kasir. Kasir tidak melihat modal dan laba.

**Back Office (pemilik/admin):** Dashboard, Produk, Kontak, Pembelian, Inventori, Hutang & Piutang, Keuangan, Laporan, Pengaturan.

Beberapa hal ada di dua sisi dengan peran berbeda: kasir input faktur/hitung stok, pemilik memeriksa dan menyetujui di Back Office.

## Satuan

- **Satuan dasar = satuan terkecil yang dijual**, bukan terkecil secara fisik. Gula: kg. Rokok: bungkus (tidak dijual per batang). Mi: pcs.
- Stok dan modal selalu disimpan dalam satuan dasar. Tampilan stok dikonversi, mis. 132 pcs → "3 dus 12 pcs".
- **Master Satuan** di Pengaturan: nama, singkatan, boleh desimal (kg/liter ya, dus/pcs tidak). Isi kemasan tidak disimpan di master.
- **Tabel satuan per barang:** label, isi (dalam satuan dasar), barcode opsional, dibeli, dijual, harga jual.
- Satu satuan bisa: dibeli saja, dijual saja, atau keduanya.
- **Satu barang bisa punya beberapa kemasan dengan isi berbeda**, mis. Sarimi "Dus isi 50" dan "Dus isi 25" sebagai dua baris satuan. Label di dropdown selalu menyebut isinya.
- Di dropdown satuan ada "+ Satuan baru" supaya tidak perlu pindah ke Pengaturan.
- Barang bisa punya 2 tingkat (besar + kecil, mis. Sarimi: karton isi 25 pcs) atau 3 tingkat (besar + sedang + kecil, mis. Taro: karton isi 5 renteng, renteng isi 10 pcs → karton = 50 pcs).
- **Isi ditulis relatif ke satuan di bawahnya** ("karton isi 5 renteng"); sistem menghitung isi dalam satuan dasar.
- **Urutan satuan:** saat menjual (kasir) dari kecil ke besar; saat membeli (faktur) dari besar ke kecil.
- Di kasir, pilihan satuan tampil langsung bersama harganya; satuan berbeda untuk barang yang sama = baris terpisah.
- Form faktur dan hitung stok memakai kolom per tingkat satuan (mis. Karton | Renteng | Pcs); hanya tingkat yang dimiliki barang itu yang tampil, total dihitung otomatis.

## Harga jual

Setiap barang memilih satu metode:

1. **Per satuan** — tiap satuan punya harga sendiri.
   Rokok A: bungkus Rp 32.000, slop (10 bks) Rp 310.000.
2. **Bertingkat per jumlah** — harga per satuan dasar turun mulai jumlah tertentu, **berlaku untuk seluruh jumlah**.
   Gula: < 5 kg Rp 8.000/kg; ≥ 5 kg Rp 6.000/kg; ≥ 25 kg Rp 4.600/kg.
   3 kg = 24.000 · 7 kg = 42.000 · 1 karung (25 kg) = 115.000 · 30 kg = 138.000.
   Kasir diberi pengingat bila jumlahnya mendekati tingkat berikutnya (4 kg = 32.000, lebih mahal dari 5 kg = 30.000).

## Pelanggan & diskon

- Pelanggan boleh dikosongkan → otomatis **Umum**. Umum hanya bayar lunas, **tidak bisa kasbon**, tidak dapat diskon pelanggan. Umum adalah data khusus yang tidak bisa dihapus.
- **Diskon khusus per pelanggan per barang**: potongan Rp (per satuan dasar) atau %.
  Antok: gula potongan Rp 200/kg. 7 kg → 42.000 − 1.400 = 40.600. Karung → 115.000 − 5.000 = 110.000.
  Amir: tidak ada entri → harga normal.
- Harga normal (termasuk tingkatan) dihitung dulu, lalu diskon dipasang di atasnya. Diskon **terisi otomatis** di kasir sebagai saran.
- **Kasir bebas mengubah diskon.** Sistem mencatat diskon saran, diskon dipakai, dan nama kasir.
- Golongan harga (Ecer/Warung) belum diperlukan; diskon per pelanggan dianggap cukup untuk fase awal.

## Kasbon (piutang)

- Hanya pelanggan terdaftar. Dicek terhadap batas kasbon; melebihi batas → perlu PIN pemilik.
- Pembayaran kasbon dialokasikan ke nota tertua (bisa diubah manual).
- Pembayaran campuran: sisa yang tidak dibayar hanya bisa jadi kasbon untuk pelanggan terdaftar.

## Pembelian & barang masuk

- Kepala faktur: distributor, nomor faktur kertas, tanggal, cash/tempo, jatuh tempo (dari termin distributor).
- Baris: barang (cari nama/kode pendek), satuan, isi (terisi otomatis, bisa diubah, tercatat & ditandai), qty, harga, diskon.
- **Isi kemasan wajib dicek fisik oleh penerima barang**, karena banyak faktur tidak mencantumkannya. Baris baru bisa disimpan setelah "Sudah dicek fisik" dicentang.
- Isi berbeda dari data barang → pilih: **kemasan baru** (dibuat satuan baru, mis. "Karton isi 4 renteng") atau **hanya kali ini** (dicatat di baris faktur, ditandai untuk diperiksa pemilik).
- Barang baru bisa dibuatkan rantai satuannya langsung dari layar Barang Masuk.
- Satuan dan harga terakhir dari distributor yang sama terisi otomatis.
- Total input dicocokkan dengan total yang tertulis di kertas faktur.
- Diskon faktur dibagi proporsional ke setiap baris. Barang bonus masuk dengan harga 0 (menurunkan modal).
- Retur pembelian memotong hutang dan mengurangi lapisan stok yang tepat.
- **Riwayat harga beli per distributor per barang** disimpan otomatis dari faktur; perbandingan dalam modal per satuan dasar.
- Belum diputuskan: perlukah padanan nama barang per distributor; reaksi saat harga beli naik (pengingat vs usulan harga jual otomatis).

## Modal (HPP): FIFO

- Setiap baris faktur menjadi **lapisan stok** dengan modal per satuan dasarnya sendiri. Penjualan menghabiskan lapisan tertua dulu.
  Sarimi: 100 bks @ 2.060 (1 Okt) + 100 bks @ 2.100 (5 Okt); jual 120 → modal 100×2.060 + 20×2.100 = 248.000.
- Modal disalin ke setiap baris penjualan saat transaksi; harga jual juga disalin.
- Total modal jangka panjang sama dengan metode lain; FIFO dipilih karena modal tiap penjualan bisa ditelusuri ke faktur asalnya.
- **Barang terjual sebelum fakturnya diinput**: pakai modal sementara (harga beli terakhir), dikoreksi otomatis saat faktur masuk.
- Penelitian di beberapa toko Indomaret juga menemukan pemakaian FIFO; FIFO di sistem harus dibarengi FIFO fisik di rak.

## Mulai dari usaha yang sudah berjalan

- Tidak memasukkan sejarah; cukup **saldo awal** per tanggal mulai.
- Data barang bertahap (mulai dari yang paling laku, import Excel).
- Stok awal dihitung **bergilir per kategori**; kategori yang belum dihitung tetap bisa dijual, ditandai "belum dihitung".
- Modal stok awal = harga beli terakhir (atau faktur lama bila ada) → lapisan "Saldo awal".
- Hutang awal: faktur tempo yang belum lunas (tanpa rincian barang). Kasbon awal: satu saldo per pelanggan. Kas awal: laci + rekening.
- Laporan laba memisahkan bagian **pasti** (dari faktur) dan **perkiraan** (dari saldo awal).

## Stok & opname

- Stok = buku besar mutasi, tidak diedit langsung.
- Opname bergilir per kategori/rak; selisih disetujui pemilik dan dicatat sebagai penyesuaian bernilai rupiah.
- Penyesuaian: rusak, kedaluwarsa, hilang, pakai sendiri.

## Prinsip data

1. Tidak ada hapus, hanya batal (dengan alasan, nama pengguna, mutasi pembalik).
2. Nomor dokumen berurutan per jenis: `PJ-` penjualan, `PB-` pembelian, `RJ-` retur jual, `RB-` retur beli, `OP-` opname, `BY-` pembayaran.
3. Setiap rupiah lewat buku kas pada akun kas tertentu.
4. Hutang/piutang = dokumen + pembayaran yang dialokasikan; saldo dihitung.

## Tampilan

- Warna biru–putih (lihat `src/styles/global.css`), font Plus Jakarta Sans.
- Gaya bersih seperti aplikasi kasir Indonesia (Moka, majoo), bukan gaya "template AI".
- Bahasa antarmuka: Indonesia.
