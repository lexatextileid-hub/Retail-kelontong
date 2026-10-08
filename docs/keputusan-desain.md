# Keputusan Desain — Retail Kelontong

Dokumen ini mencatat aturan bisnis yang sudah disepakati. Kode di `src/domain/` mengikuti dokumen ini, dan tesnya (`src/domain/domain.test.ts`) memakai contoh-contoh di bawah. Angka harga hanya ilustrasi.

## Gambaran usaha

- Toko kelontong di pasar, toko fisik (POS/kasir), dengan **tiga model penjualan**: retail (eceran), grosir (pembeli datang langsung), dan **pesanan grosir**.
- **12 ruko di pasar:** 1 ruko pusat untuk berjualan (semua pembeli dilayani di sini, satu kasir/kas), 11 ruko sebagai gudang penyimpanan.
- Usaha sudah berjalan; sistem harus bisa mulai dari saldo awal.
- Barang dibeli dari banyak distributor, cash atau tempo, dengan harga berbeda-beda.
- Barang datang diinput dari **kertas faktur**, polanya mirip apotek. Scan barcode tidak wajib.
- Aplikasi web. Rencana: modul retail di dalam LEXA OMS (React + Supabase), data barang/transaksi terpisah dari bisnis apparel.

## Struktur aplikasi

**Operasional (khusus kasir):** Penjualan, Kasbon, Barang Masuk, Hitung Stok, Riwayat, Kas masuk/keluar, Buka/Tutup kasir. Kasir tidak melihat modal dan laba.

**Back Office (pemilik/admin):** Dashboard, Produk, Kontak, Pembelian, Inventori, Hutang & Piutang, Keuangan, Laporan, Pengaturan.

Beberapa hal ada di dua sisi dengan peran berbeda: kasir input faktur/hitung stok, pemilik memeriksa dan menyetujui di Back Office.

## Peran akun

- **Tiga peran saja: Pemilik, Admin, Kasir.** Jumlah akun per peran bebas (mis. 2 kasir, 2 admin); setiap akun punya PIN sendiri dan semua pekerjaan tercatat atas nama akunnya.
- Admin dan kasir bisa bergantian menjaga kasir (admin punya akses Mode Kasir).

| Pekerjaan | Pemilik | Admin | Kasir |
| --- | --- | --- | --- |
| Mode Kasir: penjualan, kasbon, retur, kas laci | ✓ | ✓ | ✓ |
| Mencatat pesanan pelanggan | ✓ | ✓ | ✓ |
| Mode Gudang: barang masuk, faktur dari SP, repack, hitung stok | ✓ | ✓ | — |
| Membuat & mengirim SP | ✓ | ✓ | — |
| Melihat harga beli & modal | ✓ | ✓ | — |
| Tambah produk, ubah harga jual, data pelanggan/distributor | ✓ | PIN pemilik | — |
| Batas kasbon, setujui selisih kas & opname, harga di bawah target | ✓ | — | — |
| Brankas, prive, laporan laba, pengaturan | ✓ | — | — |

## Mode kerja & hak akses

- Operasional dibagi per **mode**:
  - **Kasir:** Penjualan (retail & grosir datang langsung), Pesanan, Kasbon, Retur, Riwayat, Kas Laci
  - **Gudang:** Stok Barang, Barang Masuk, Siapkan Pesanan, Repack, Hitung Stok, Retur ke Distributor, Barang Rusak
  - Ditambah **Back Office** untuk pemilik/admin.
- Setiap orang masuk dengan **PIN sendiri**; semua pekerjaan tercatat atas namanya. Pindah mode cukup dengan PIN.
- Diatur pemilik di Back Office → Pengaturan → Pengguna & Hak Akses: mode yang boleh dibuka per orang, izin rinci per mode, aturan per mode.
- Izin yang tidak dimiliki bisa dijalankan di tempat dengan **PIN pemilik**; tercatat siapa yang menyetujui.
- **Tertutup untuk pegawai secara bawaan:** menambah produk baru, mengelola data pelanggan, mengelola data distributor.
- **Pelanggan baru dari kasir:** boleh, hanya nama + nomor HP, **batas kasbon otomatis Rp 0**. Hanya pemilik yang bisa menaikkan batas kasbon (dan mengubah diskon/data lain) di Back Office.
- Kasir boleh mencari & memilih pelanggan terdaftar.
- Faktur yang memuat barang belum terdaftar bisa disimpan sebagai **draf**; diselesaikan setelah pemilik mendaftarkan barangnya.
- Belum diputuskan: kasir melihat sisa kasbon atau tidak; gudang melihat riwayat harga beli atau tidak; kasir boleh menjual "Barang lain-lain" (nama + harga manual, tanpa stok) atau tidak.

## Tidak ada data ganda

- **1 barang = 1 SKU.** Satuan (pcs, renteng, karton, kemasan isi berbeda) adalah baris satuan dari SKU yang sama, bukan SKU baru. Barang hasil repack adalah barang fisik berbeda sehingga punya SKU sendiri.
- **Satuan hanya dipilih dari dropdown Master Satuan**, tidak pernah diketik bebas di form barang/faktur/kasir. Nama satuan baku (mis. "Pcs", bukan "picis"/"PCS"/"pcs.").
- Master Satuan ada di **Back Office → Pengaturan → Data Induk → Satuan**; hanya pemilik yang menambah/mengubah. "+ Satuan baru" di dropdown hanya untuk pemilik dan menulis ke master yang sama.
- Pencegahan ganda saat menambah data induk (satuan, kategori, barang, pelanggan, distributor): nama dibandingkan tanpa beda huruf besar/kecil, spasi, dan tanda baca, dan nama yang mirip ditampilkan sebagai peringatan sebelum disimpan. Singkatan satuan unik. Pelanggan/distributor juga dicek dari nomor HP.
- Bila terlanjur ganda, pemilik bisa **menggabungkan** dua data menjadi satu (semua riwayat ikut pindah).
- **Master satuan bawaan** (`src/domain/satuanBawaan.ts`): nama baku memakai sebutan resmi Coretax DJP bila ada (Karton, Boks, Lusin, Lembar, Kilogram, Gram, Liter, Piece→Pcs), sisanya sebutan lapangan (Bungkus, Sachet, Renteng, Pak, Slop, Bal, Karung, Botol, Kaleng, Galon, Tabung, Krat, Tray, Butir, Ikat, Mililiter). Setiap satuan menyimpan padanan kode Coretax (UM.0033 = Lainnya). Singkatan: Bungkus = **bks**, Boks = **boks**. Satuan lain ditambah sendiri oleh pemilik.

## Kategori & SKU

- **Dua tingkat: kelompok → kategori** (mengikuti pola GS1 GPC dan minimarket). Kasir memfilter per kategori; laporan bisa diringkas per kelompok. Kode di `src/domain/kategoriBawaan.ts`.
- Kategori bawaan (kode): **Makanan** — Sembako (SMB), Bumbu Dapur (BMB), Mi & Makanan Instan (MIN), Makanan Ringan (SNK), Susu (SSU); **Minuman** — Minuman (MNM); **Rokok** — Rokok (RKK); **Perawatan Diri** — Perawatan Diri (PRD); **Kebersihan & Rumah Tangga** — Kebersihan Rumah (KBR), Perlengkapan Rumah Tangga (RTG), Gas & Air Galon (GAS); **Bayi** — Perlengkapan Bayi (BYI); **Kesehatan** — Obat & Kesehatan (OBT); **Lainnya** — Alat Tulis (ATK), Pakan Hewan (PKN), Lain-lain (LLN).
- Pemilik bisa menambah kategori; kode 3 huruf, unik.
- **SKU = kode kategori + nomor urut 5 digit** (mis. SMB-00012), dibuat otomatis, unik, **tidak berubah** walau barang dipindah kategori.
- Selain SKU: **kode cepat** (opsional, unik, untuk ketik cepat) dan **barcode per satuan** (opsional, unik).
- Barang hasil repack masuk kategori barangnya (Gula 1 kg bungkus → Sembako).
- **Kategori tambahan (kelompok Makanan):** **Bawang & Umbi (UMB)** — bawang merah, bawang bombai, bawang putih, kentang, jahe; **Rempah Kering (RMP)** — bumbu tradisional kering (kemiri, ketumbar, lada, kunyit kering, asam jawa, cengkeh, kayu manis, pala, daun salam kering, dsb.). Bumbu Dapur (BMB) tetap untuk bumbu kemasan pabrik.
- Barang segar lain (cabai, tomat, dsb.) belum dibahas.

## Barang timbang (Bawang & Umbi, Rempah Kering)

- **Di kasir, harga per kg bisa diubah** (harga bawaan tetap ada sebagai isian awal), lalu tetap bisa diberi diskon per kg atau total. Harga yang diubah ditandai "harga diubah" dan tercatat; tidak dihitung ke batas diskon Rp 10.000.
- **Dijual ditimbang sesuai kebutuhan.** Satuan dasar kg dengan desimal; harga jual per kg; kasir mengetik berat (dalam kg atau gram), total dihitung otomatis tanpa pembulatan.
- **Pembelian kadang tanpa nota** (pasar/pengepul): Barang Masuk punya jenis **"pembelian tanpa nota"** — pilih/ketik sumber, berat aktual, harga total, sumber uang (biasanya dibayar langsung); sistem membuat nomor nota internal; foto opsional; ditandai untuk diperiksa pemilik.
- **Harga sangat sering berubah:** layar **ubah harga cepat** — daftar barang per kategori dengan modal terakhir, harga jual, dan usulan dari % untung; ubah banyak barang sekaligus; riwayat harga tersimpan.
- Susut (kering, busuk, bertunas) dicatat lewat penyesuaian stok dengan alasan, sebagai kerugian terpisah.

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

## Stok Barang (Mode Gudang)

- **Tempat utama mengelola barang**: Mode Gudang → Stok Barang. Datanya satu; Back Office membaca dan merangkum dari sini.
- **Mode Gudang hanya untuk pemilik dan admin** (tiga peran saja; kasir tidak masuk Gudang), jadi **semua kolom tampil**, termasuk harga beli, modal, nilai stok, dan untung.
- **Tambah / ubah barang: pemilik langsung; admin dengan PIN pemilik.** SKU otomatis dari kategori dan tidak pernah berubah; satuan dasar tidak bisa diubah setelah barang dibuat (stok tercatat dalam satuan itu). Barang baru stoknya 0, bertambah lewat Barang Masuk atau hitung stok.
- **Stok = buku stok (mutasi), tidak diedit langsung.** Sumber mutasi: saldo awal, faktur dari Surat Pesanan, faktur tunai, penjualan, retur pembeli (barang bagus kembali), tukar barang, serah pesanan. Stok bebas = stok fisik − yang dikunci untuk pesanan.
- **Jumlah stok ditampilkan dua-duanya**: bertingkat ("4 ktn 2 rtg 7 pcs") dan satuan dasar ("227 pcs").
- **Daftar Barang** (format seragam): ringkasan barang aktif + nilai stok · stok menipis · habis/minus · barang berhenti (nilai mengendap); cari nama/SKU/kode; filter kategori, status gerak, kondisi stok, umur stok, urutan, barang nonaktif. Kolom: barang (nama, SKU, kategori), stok, **cukup untuk ± hari** (stok ÷ rata-rata terjual 30 hari), **gerak · umur**, harga jual **kecil · sedang · besar** dengan untung % dari modal (bertingkat: per tingkat; level ke-4+ ditandai "+n"), **nilai stok + beli terakhir** per satuan beli; total nilai stok.
- **Detail Barang** (tab):
  - **Ringkasan**: stok, dipesan/bebas, minimum, terjual 30 hari & rata-rata per hari, cukup untuk, terakhir terjual, status gerak (x dari 13 minggu), umur stok, modal FIFO, nilai stok, beli terakhir, letak; peringatan stok minus belum terjelaskan.
  - **Kartu stok** (pola Accurate/Majoo): tanggal, no. sumber, jenis, keterangan, masuk (dengan modal), keluar, **saldo berjalan**; filter periode dan masuk/keluar; baris saldo sebelum periode.
  - **Satuan & harga**: satuan, isi, dipakai beli/jual, barcode, modal, harga jual, untung; tabel tingkat harga untuk barang bertingkat.
  - **Per kedatangan (FIFO)**: tanggal masuk, no. sumber, jumlah masuk, sisa, modal, nilai, umur.
  - **Harga beli per distributor**: beli terakhir, harga per satuan beli, terendah, jumlah faktur.
- **Status gerak barang (analisis FSN)**, otomatis tiap hari dari **jumlah minggu terjual dalam 13 minggu terakhir** (frekuensi, bukan jumlah — supaya satu pembelian grosir tidak membuat barang tampak laku): **Laku** ≥ 7 minggu · **Lambat** 2–6 · **Berhenti** 0–1 · **Baru** = barang pertama masuk < 90 hari · **Musiman** = barang bertanda musiman yang sedang tidak laku (tidak dicap Berhenti). Penjualan dan serah pesanan dihitung.
- Data barang juga punya **stok minimum** (masuk Stok Menipis) dan **stok maksimum** (saran pesan "sampai maks").
- Form satuan menampilkan kalimat penjelas "1 Karton = 25 Pcs" dan memperingatkan bila satuan besar tampak terbalik (mis. satuan dasar Galon, satuan besar Liter).
- Ditunda: kelas **Andalan** (penyumbang omzet terbesar, analisis ABC), pilihan letak per ruko, **tanggal kedaluwarsa & nomor batch** (penting untuk retur barang, tapi terlalu rumit untuk sekarang), barcode, distributor utama, foto barang.
- Di kasir, jika barang tidak ditemukan: tombol "Tambah barang baru" (pemilik/PIN pemilik) membuka form yang sama, nama terisi dari kata yang dicari; setelah disimpan barang langsung masuk keranjang.
- **Tidak ada "Barang lain-lain"**: barang belum terdaftar tidak bisa dijual sebelum didaftarkan.
- Di masa awal pemilik memegang kasir sambil merapikan data barang.

## Persen untung

- **Patokan utama: untung dari modal (markup).** Modal Rp 10.000 + 10% = Rp 11.000.
- Di form barang, tiap satuan (dan tiap tingkat harga grosir) punya **harga beli, harga jual, untung %, untung Rp — isi salah satu dari harga jual / untung % / untung Rp**, yang lain terhitung otomatis. Persen diatur per level satuan (grosir biasanya lebih kecil). Untung di bawah target ditandai merah.
- **Dasar hitung untung di form dan daftar barang = harga beli terakhir.** **Satuan beli bisa lebih dari satu** (mis. per slop dan per karton) dan **masing-masing punya harga beli sendiri** (karton biasanya lebih murah per bungkus): yang sudah pernah difaktur memakai harga faktur terakhir satuan itu, yang belum memakai harga beli perkiraan yang diisi di form. Satuan yang tidak dibeli (eceran) dihitung dari harga beli terakhir per satuan dasar, atau — sebelum ada faktur — dari satuan beli terkecil (paling hati-hati untuk untung). Laporan laba tetap memakai modal FIFO.
- **Harga beli dari faktur boleh diubah** di form barang (mis. distributor mengabari harga naik sebelum barang datang): harga yang diubah diberi waktu, dipakai sebagai acuan untung **sampai faktur berikutnya masuk**, lalu faktur kembali jadi acuan. Ditandai "diubah manual" / "perkiraan" / "dari faktur …".
- **Pembanding harga antar satuan (berlaku untuk semua barang & kategori):** setiap harga beli dan harga jual ditampilkan juga per satuan dasar (mis. "= Rp 31.000/bks"); dari satuan kecil ke besar harga per satuan dasar **harus turun atau sama** (karton ≤ slop ≤ bungkus; karung ≤ kg; karton ≤ pcs). Satuan besar yang lebih mahal ditandai ⚠ dengan selisihnya — di form barang, detail barang, dan daftar barang. Peringatan, tidak memblokir simpan.
- Baris satuan dasar ditandai tersendiri (bukan karena isinya 1); satuan besar wajib isi > 1.
- **Urutan satuan: kecil → besar** (satuan dasar paling atas), tersusun otomatis setelah isi diisi. Pengecualian: Barang Masuk mengikuti kertas faktur (besar → kecil).
- **Isi ditulis berantai** seperti cara menyebutnya: "Karton isi 10 **Slop**", "Slop isi 10 **Bungkus**"; sistem menghitung isi dalam satuan dasar (1 Karton = 10 Slop = 100 Bungkus) dan nama tampil terisi otomatis. Data tetap disimpan dalam satuan dasar.
- **Pembulatan** harga hasil hitung ke kelipatan yang diatur di Pengaturan (mis. ke atas ke Rp 100); % ditampilkan dari harga setelah dibulatkan.
- Laporan memakai **untung dari penjualan (margin)**. Label selalu ditulis jelas ("dari modal" / "dari penjualan").
- Harga beli naik → sistem bisa mengusulkan harga jual baru dengan % untung yang sama.
- **Pembulatan harga bawaan: tanpa pembulatan** (usaha semi-FMCG, selisih Rp 100 berarti bagi pembeli). Harga hasil hitung hanya usulan; ada pilihan cepat di sekitarnya dengan % untung masing-masing. Pembulatan bisa diatur per barang bila perlu. Harga yang diketik manual tidak pernah diubah sistem.

## Diskon per barang (kasir)

- Di pop-up Atur Barang: diskon **per item** (× jumlah) atau **total baris**. Berlaku untuk semua pelanggan; diskon khusus pelanggan tetap terisi otomatis dan bisa diubah.
- Diskon per barang yang diketik kasir + potongan akhir dihitung bersama ke batas Rp 10.000 tanpa PIN.

## Potongan di akhir transaksi (kasir)

- Total belanja **tidak dibulatkan** otomatis.
- Kasir mengetik **jumlah yang dibayar pelanggan**; sistem menghitung selisihnya dan menawarkan "Jadikan potongan" (atau "Jadikan kasbon" untuk pelanggan terdaftar).
- **Pembulatan:** potongan sampai **Rp 500** → kasir langsung boleh.
- **Diskon akhir (nego):** potongan sampai **Rp 10.000** → kasir boleh tanpa PIN; **di atas Rp 10.000 perlu PIN pemilik**. Kedua batas diatur di Pengaturan.
- Berlaku juga untuk pelanggan Umum (potongan, bukan kasbon).
- Potongan dibagi **proporsional ke semua barang** di transaksi supaya margin per barang tetap akurat.
- Laporan menampilkan pembulatan, diskon akhir, dan diskon pelanggan secara terpisah, per hari dan per kasir.

## Penjualan: hal teknis

- **Internet mati:** kasir tetap bisa berjualan; transaksi disimpan di perangkat dan otomatis terkirim saat online. Selama offline, kasbon dan diskon akhir di atas batas tidak bisa dipakai.
- **Metode bayar: tunai, transfer, kasbon, atau campuran. Tanpa QRIS.**
- **Retur dari pembeli:** uang kembali, tukar barang, atau potong kasbon. Barang kembali: masuk stok lagi atau rusak. Selalu perlu PIN pemilik.
- **Tahan transaksi (hold):** beberapa keranjang bisa ditahan sekaligus, masing-masing diberi nama (mis. "Bu Sri"). Stok belum berkurang sampai transaksi dibayar.
- **Kasir bersamaan:** boleh beberapa perangkat sekaligus, tapi **setiap perangkat harus akun yang berbeda** (satu akun hanya aktif di satu perangkat).

## Kas Laci, Riwayat & Laporan Harian (Mode Kasir)

- **Tidak ada shift.** Satu akun kasir = satu laci. Setelah tutup kasir **boleh buka lagi** di hari yang sama (laporan terpisah).
- **Wajib buka kasir sebelum berjualan.** Layar buka kasir menampilkan **data laci sebelumnya**: penjualan, seharusnya di laci, uang fisik, selisih, transfer masuk, dan pembagian (sisa laci, brankas, bank, prive). Modal awal = sisa laci sebelumnya, bisa ditambah dari brankas (PIN pemilik).
- **Tidak memakai hitung buta:** kasir melihat **seharusnya tunai di laci** dan **total masuk lewat transfer** sepanjang hari dan saat tutup kasir.
- **Kas masuk lain** di kasir: pendapatan lain-lain (jual kardus bekas, barang rusak/kedaluwarsa) atau uang dari brankas (pindah dana, PIN pemilik).
- Pengeluaran / bayar distributor dari laci tidak boleh melebihi uang di laci.
- Bayar distributor: pilih faktur tempo (dari Surat Pesanan) atau **hutang lama** (tanpa rincian barang); satu pembayaran satu distributor, bisa beberapa faktur, bisa sebagian.
- **Kas Laci satu kesatuan (mode akuntansi):** semua sub-menu memakai susunan yang sama — bilah status laci di atas (nomor laci, akun, jam buka, tunai di laci, transfer), tombol aksi, kartu ringkasan, filter (periode / kategori / distributor), lalu tabel dengan baris total.
  - **Laci Hari Ini:** buku kas laci (jam, no. bukti, jenis, keterangan, masuk, keluar, **saldo laci berjalan**, transfer), mulai dari baris modal awal; filter semua/masuk/keluar/transfer.
  - **Pengeluaran:** daftar bukti kas keluar (no. bukti, tanggal, kategori, keterangan, penerima, nilai, oleh) + total per kategori; formulir bukti kas keluar bisa **beberapa baris** (kategori, keterangan, jumlah) dengan satu penerima.
  - **Laporan Harian:** tabel per buka–tutup laci (modal, masuk, keluar, seharusnya, fisik, selisih, transfer, penjualan) dengan total periode.
  - **Klik nomor faktur → detail faktur asli**: kepala faktur (distributor, no. faktur kertas, tanggal, jatuh tempo, barang masuk PB-…, Surat Pesanan asal, cash/tempo, dicatat oleh), rincian barang (jumlah, harga, subtotal), total, dan riwayat pembayaran. Hutang lama ditandai tanpa rincian barang.
- **Bayar Distributor (mode akuntansi, mengikuti "Pembayaran Pembelian" Accurate):**
  - **Faktur hutang**: tabel no. faktur, distributor, tanggal, jatuh tempo (tanggal + termin distributor), total, dibayar, terutang, status (belum dibayar / sebagian / lewat X hari / lunas). Ringkasan: total hutang, lewat jatuh tempo, jatuh tempo 7 hari. Filter distributor, status, no. faktur. Centang faktur → bayar.
  - **Bukti pembayaran**: no. bukti (BD-…), tanggal, distributor, faktur dibayar, dibayar dari, diskon, nilai bayar, oleh; filter periode, distributor, nomor; total periode.
  - **Formulir pembayaran**: distributor, tanggal, no. bukti otomatis, dibayar dari, keterangan; tabel faktur distributor itu: bayar ✓, no. faktur, tanggal, jatuh tempo, total, terutang, **diskon** (potongan dari distributor, mengurangi hutang tanpa uang), bayar. Satu bukti = satu distributor.
- **Buka kasir (awal hari):** modal awal laci.
- **Selama hari itu:** pengeluaran operasional (dengan keterangan), **bayar distributor** (pilih fakturnya; boleh dilakukan kasir), **setor tunai ke bank** (bisa beberapa kali; dicatat sebagai pindah dana laci → rekening, bukan pengeluaran), retur uang kembali.
- **Tutup kasir (akhir hari):** kasir mengetik **total uang fisik** (tidak per pecahan); sistem menampilkan selisih.
- **Selisih wajib disetujui pemilik**, karena itu kerugian. Saat menyetujui pemilik memilih: ditanggung toko (biaya) atau **dibebankan ke kasir** (tercatat sebagai tagihan ke kasir).
- **Laporan harian kasir** (struk thermal, per buka–tutup laci; tanpa modal/laba):
  - **I. Pendapatan** — 1. Penjualan: tunai / transfer / kasbon (jumlah nota + rupiah), total penjualan, retur penjualan (−, bersih setelah tukar), penjualan bersih, info potongan/pembulatan. 2. Pesanan pelanggan: **DP** dan **pelunasan** (termasuk bayar sebagian). 3. Pendapatan lain-lain per kategori. Total pendapatan.
  - **II. Pengeluaran dari laci** — 1. Belanja barang: per faktur (faktur tempo yang dibayar + faktur tunai). 2. Operasional per kategori + daftar bukti. Total. Info terpisah: pengeluaran yang dicatat kasir tapi **dibayar pemilik** (brankas/rekening, PIN) — tidak mengurangi laci.
  - **III. Kasbon pelanggan** — kasbon baru, dibayar hari ini (tunai/transfer), dipotong retur, **total kasbon semua pelanggan**.
  - **IV. Kas laci (tunai)** — saldo awal + dari pemilik + pendapatan tunai + bayar kasbon tunai − uang kembali retur − pengeluaran laci − setor bank = seharusnya; uang fisik; selisih; pembagian.
  - **V. Transfer masuk** (dicek di mutasi) — penjualan, DP, pelunasan, bayar kasbon, pendapatan lain, total.
  - **VI. Barang terjual** — per kategori (jumlah barang, rupiah) dan 10 barang terlaris.
  - Daftar per nota penjualan tidak dicetak (ada di Riwayat).
  - Retur mengurangi penjualan, bukan pengeluaran. Bayar kasbon bukan pendapatan (pendapatannya saat penjualan kasbon). Bayar kasbon lama yang ikut di nota penjualan dicatat terpisah sebagai bayar kasbon (diambil dari tunai dulu).
- **Riwayat transaksi:** semua nota (penjualan, pembayaran kasbon, pesanan, retur), bisa dicari/difilter; buka nota untuk cetak ulang, kirim WhatsApp, atau retur (PIN pemilik).

## Retur

- **Kebijakan retur pembeli: wajib dengan nota, maksimal 3×24 jam** sejak transaksi. Tanpa nota atau lewat 72 jam → ditolak. Kalimat "Retur barang harus dengan nota, maksimal 3×24 jam" dicetak di bawah setiap struk.
- **Retur dari pembeli → Mode Kasir → Retur.** Nota dicocokkan lewat nomor nota di struk, atau dicari lewat **Riwayat (pilih tanggal)** atau **nama pelanggan**. Pilih barang & jumlah → uang kembali / tukar barang / potong kasbon. Barang kembali ditandai bagus (masuk stok) atau rusak. Harga & modal mengikuti nota asli. Perlu PIN pemilik.
- **Retur ke distributor → Mode Gudang → Retur ke Distributor.** Pilih distributor & faktur asal → potong hutang / uang kembali / diganti barang. Fitur aktif untuk semua; di data distributor ada tanda **"menerima retur: ya/tidak"** sebagai panduan.
- **Barang Rusak (Mode Gudang):** penampung barang rusak dari retur pembeli, hitung stok, atau gudang; diputuskan dikembalikan ke distributor atau dibuang (dicatat sebagai kerugian).

- **Aturan retur bisa diatur pemilik** (Back Office → Pengaturan → Aturan): batas waktu (bawaan 3×24 jam, dihitung dari jam di nota), boleh **lewat batas dengan PIN pemilik**, boleh **tanpa nota dengan PIN pemilik** (harga jual sekarang). Untuk pelanggan tertentu yang dekat dengan pemilik / ngeyel. Pengecualian tercatat di bukti retur.
- **Nilai uang retur = harga setelah diskon** (diskon baris, diskon pelanggan, dan potongan akhir nota dibagi sebanding ke setiap barang), bukan harga barang sekarang.
- **Uang kembali bisa dipilih**: tunai atau transfer (nama bank sebagai keterangan), atau potong kasbon (pelanggan terdaftar).
- **Tukar barang boleh barang lain.** Selisih: toko mengembalikan uang / potong kasbon, atau pelanggan menambah bayar (tunai, transfer, atau kasbon untuk pelanggan terdaftar).
- **Pesanan pelanggan juga bisa diretur** (barang yang sudah diserahkan, batas dihitung dari tanggal serah); selisih bisa memotong sisa tagihan pesanan.
- Jumlah yang sudah diretur dicatat per baris nota, jadi tidak bisa diretur dua kali.
- **Susunan menu Retur** (mengikuti Loyverse/Majoo): **Daftar Retur** (filter periode, pelanggan, nomor, sumber; total retur) → **Tambah Retur**: langkah 1 pilih transaksi (nota penjualan atau pesanan; cari nomor, tanggal, pelanggan; tanpa nota sebagai pengecualian), langkah 2 barang, tukar, penyelesaian, alasan, PIN.
- Barang rusak dari retur masuk **Gudang → Barang Rusak** (tidak dihitung stok jual).
- **Riwayat** (Mode Kasir): periode bisa dipilih — hari ini, kemarin, 7 hari, bulan ini, bulan lalu, **pilih bulan**, atau **rentang tanggal**; daftar dikelompokkan per hari dengan total harian; semua transaksi (penjualan, bayar kasbon, retur), cari nomor/pelanggan, cetak ulang struk (bertanda SALINAN), lanjut retur dari nota.

## Periode laporan

- Laporan **harian** (per kasir) dan **bulanan**. Periode bulanan mengikuti kalender: tanggal 1 sampai akhir bulan (28/29/30/31 menyesuaikan).
- Rentang tanggal bebas tetap bisa dipilih untuk melihat laporan.

## Tempat uang (akun kas)

- Tiga jenis tempat uang: **Laci** (satu per kasir), **Brankas**, **Rekening bank — cukup 1 rekening toko**. Nama bank yang dipilih saat transfer hanya keterangan.
- Perpindahan antar tempat dicatat sebagai **pindah dana**, bukan pemasukan/pengeluaran: laci → brankas, laci → bank, brankas → bank, brankas → laci (modal awal).
- Setiap pembayaran (dari pelanggan atau ke distributor) dan pengeluaran menyebut tempat uangnya.
- Saldo tiap tempat tampil di posisi usaha.
- **Akhir hari (tutup kasir):** uang fisik laci dibagi ke:
  - **disisakan di laci** sebagai modal besok (saldo laci terbawa ke hari berikutnya; modal awal besok = sisa ini, bisa ditambah dari brankas);
  - **diserahkan ke brankas lewat pemilik** (pemilik konfirmasi jumlah dengan PIN);
  - **disetor ke bank** (tidak tentu, kadang-kadang);
  - **diambil pemilik sebagai prive** (dicatat "ambil pemilik", bukan biaya toko; tidak mengurangi laba).
  Jumlah pembagian harus sama dengan uang fisik.
- **Pengeluaran: satu catatan, dua pintu input**, sumber dana dipilih di keduanya:
  - **Back Office:** laci kasir mana pun, brankas, atau rekening bank mana pun.
  - **Kasir:** sumber dana dipilih: **laci kasir** (bawaan), **brankas**, atau **rekening (transfer)**. Brankas/rekening perlu **PIN pemilik** dan saldonya tidak ditampilkan ke kasir.
  Back Office menampilkan semua pengeluaran dari kedua pintu (cermin); kasir hanya melihat pengeluaran yang ia catat.
- **Format pengeluaran** (mengikuti Expense QuickBooks / Biaya Majoo): kepala — tanggal (otomatis), no. bukti (otomatis), **dibayar dari** (laci / brankas / rekening + nama bank), **nama penerima (wajib)**, no. referensi nota/kuitansi (opsional); rincian — beberapa baris **kategori, keterangan (wajib), jumlah**; potongan (opsional); total; memo (opsional); foto nota (opsional); dicatat oleh (otomatis). Daftar: no. bukti, tanggal, penerima, kategori, keterangan, dibayar dari, total, oleh; ringkasan per sumber dana; filter periode, kategori, sumber, cari.
- Setiap pengeluaran bisa **dicetak sebagai bukti kas keluar** (lewat stasiun printer atau unduh PDF) dengan kolom tanda tangan penerima, untuk ditandatangani manual.
- **Ongkos angkut barang dari distributor = pengeluaran biasa** (kategori bongkar muat & angkut), tidak ditambahkan ke modal barang.
- **Kategori awal** (bisa diubah di Pengaturan): bongkar muat & angkut; retribusi & keamanan pasar; kemasan; kebutuhan toko harian; listrik, air, internet; gaji & uang makan; sewa ruko; perbaikan & perawatan; lain-lain (wajib keterangan).
- Bukan pengeluaran (punya jalur sendiri): bayar distributor, prive, setor bank/brankas, retur ke pembeli.
- **Prive (ambil pemilik)** bisa dari tempat uang mana pun: laci (saat tutup kasir), brankas, atau bank. Selalu dicatat sebagai prive, tidak mengurangi laba. Laporan bulanan menampilkan total prive per sumber.
- **Bayar distributor bisa dua cara:** kasir membayar dari laci memakai pendapatan hari itu; atau pemilik **menitipkan uang dari brankas** ke kasir (dicatat pindah dana brankas → laci "titipan bayar distributor"), lalu kasir membayar dan memilih fakturnya.
- **Brankas hanya diakses pemilik**, dikelola di **Back Office**: pembayaran distributor, setor ke bank, dan pengeluaran lain dari brankas dicatat di sana dengan **buku brankas** sendiri (saldo + daftar keluar-masuk).
- Laporan harian kasir **hanya mencakup laci**; kasir tidak perlu tahu atau menghitung isi brankas.
- **Kasir hanya tahu isi lacinya sendiri.** Di Mode Kasir tidak ada brankas, bank (selain setor bank dari laci), atau prive. Uang dari pemilik ke laci disebut "dari pemilik" (PIN pemilik); saat tutup kasir uang fisik dibagi ke: sisa di laci, **diserahkan ke pemilik**, setor bank. Pemilik yang mencatat di Back Office apakah uang itu masuk brankas atau prive.

## Laporan harian toko (3 tempat uang)

Sumber utama laporan bulanan (bulanan = jumlah harian). Back Office → Laporan → Harian Toko; hanya pemilik.

- **1. Posisi uang** — satu baris per tempat: setiap laci yang dibuka (per kasir), laci lain yang tidak dibuka, **brankas**, **rekening bank**, dan **total uang toko**. Kolom: saldo awal, masuk, keluar, pindah masuk, pindah keluar, selisih, saldo akhir, cek fisik.
  Saldo akhir = saldo awal + masuk − keluar + pindah masuk − pindah keluar ± selisih. Pindah dana tidak mengubah total uang toko.
- **2. Rincian uang masuk** dan **3. Rincian uang keluar** — per kelompok dan rinciannya, kolom laci / brankas / rekening / total:
  - Masuk: **A. Pendapatan usaha** (penjualan, pesanan DP & pelunasan, tambah bayar tukar barang, **pendapatan lain-lain** per kategori); **B. Terima piutang** (bayar kasbon pelanggan, cicilan kasbon karyawan); **tambahan modal pemilik**.
  - Keluar: **D. Biaya operasional** per kategori; **E. Belanja barang** (bayar faktur distributor; **faktur tunai** untuk belanja tanpa nota); **F. Kembali ke pelanggan** (uang retur); **kasbon karyawan**; **prive**.
- **4. Pindah dana** (C masuk / G keluar): laci → pemilik/brankas dan laci → bank saat tutup kasir, setor bank dari laci, brankas → laci (tambahan modal / "dari pemilik"), brankas ↔ rekening.
- **5. Catatan non-kas**: total penjualan, penjualan kasbon, potongan pembulatan/diskon akhir, diskon dari distributor.
- Transfer yang diterima kasir (penjualan, kasbon, pesanan) langsung masuk **rekening**, bukan laci.
- **Belanja barang tanpa nota = faktur tunai.** Barang dagangan yang dibeli tunai tanpa faktur distributor (mis. dari toko sebelah saat stok habis) dibuatkan **faktur oleh toko** (FT-…): penjual (distributor terdaftar atau penjual lain), barang, satuan, jumlah, harga beli; langsung dibayar (laci, atau brankas/rekening dengan PIN pemilik) dan stok bertambah. Masuk belanja barang, bukan operasional. Kebutuhan toko (plastik, sapu, token) tetap di Pengeluaran. Pintu: Kas Laci → Laci Hari Ini → Belanja tanpa nota, atau Bayar Distributor → Faktur tunai.
- **Pendapatan lain-lain** (kategori awal, nanti bisa diubah di Pengaturan): jual kardus/karung bekas; jual barang rusak/kedaluwarsa; kelebihan bayar/pembulatan; sewa tempat/titip jual; bonus/cashback distributor; bunga/cashback bank; lain-lain. Dicatat kasir lewat Kas masuk → Pendapatan lain (laci), atau pemilik di buku brankas/rekening.
- **Buku Brankas** dan **Rekening Bank** (Back Office → Keuangan): saldo awal (sekali saat mulai), kas masuk (pendapatan lain, tambahan modal, cicilan karyawan), kas keluar (prive, kasbon karyawan), biaya (lewat Pengeluaran), pindah dana; tabel dengan saldo berjalan; PIN pemilik bila bukan pemilik.
- **Hitung fisik brankas dan cocokkan rekening dengan mutasi bank: oleh pemilik, mingguan.** Saldo buku dibandingkan dengan uang fisik / saldo mutasi; selisih wajib dijelaskan, dicatat sebagai penyesuaian hari itu, dan saldo buku ikut angka fisik/mutasi. Sebelum mencocokkan, pastikan semua pengeluaran sudah dicatat (selisih biasanya karena lupa dicatat). Lewat seminggu tanpa pencocokan → ditandai.
- **Kasbon karyawan hanya di Back Office** (kasir tidak melihat): pinjaman ke karyawan dari brankas/rekening = piutang karyawan, bukan biaya. Kembali lewat cicilan; bila dipotong gaji, catat cicilan dan catat gaji penuh di Pengeluaran.

## Pembayaran (pelanggan & distributor)

- Pembayaran dicatat **terpisah dari faktur/nota**: satu faktur bisa dibayar berkali-kali, dengan metode campuran (tunai + transfer); satu pembayaran bisa menutup beberapa faktur.
- Status otomatis: belum dibayar → sebagian → lunas.
- Setiap pembayaran mengurangi/menambah saldo sumbernya: laci kasir, brankas/kas besar, atau rekening tertentu.
- Pembayaran ke distributor mengurangi hutang, **bukan biaya** (modal barang sudah dihitung lewat FIFO). Yang masuk biaya hanya pengeluaran operasional.

## Posisi usaha

- Yang dimiliki: **saldo tunai** (laci + brankas), **saldo rekening** (bisa beberapa), **stok** (nilai modal FIFO, termasuk barang terkunci untuk pesanan), **piutang** (kasbon + pesanan tempo).
- Dikurangi **hutang ke distributor**. Hasilnya **modal bersih**.
- Semua dihitung otomatis dari transaksi harian. **Aset tetap tidak dicatat.**

## Kasbon di layar Penjualan

- Saat pelanggan dipilih, tampil kasbon berjalan (jumlah, banyak nota, nota tertua) dan batasnya. Kasir boleh melihat ini.
- Pelanggan bisa **bayar kasbon sekalian belanja**, boleh sebagian: tombol "Bayar kasbon" menambah baris pembayaran ke tagihan yang sama; sekali terima uang.
- Dicatat terpisah: belanja = penjualan, kasbon = pembayaran piutang (omzet tidak tercampur). Pembayaran menutup nota tertua dulu.
- Struk mencetak sisa kasbon setelah transaksi.
- Dalam satu transaksi: bayar kasbon **atau** tambah kasbon baru, tidak keduanya.

## Struk

- Perangkat kasir campuran (iPhone, Android). Web app tidak bisa langsung mencetak ke printer Bluetooth dari iPhone/iPad.
- **Dipilih: antrian cetak + satu stasiun printer.** Printer thermal Bluetooth dipasangkan ke satu perangkat tetap di meja kasir (mis. HP Android lama/laptop) yang selalu menyala dan membuka halaman "Stasiun Printer". Semua perangkat kasir mengirim struk ke antrian di database; stasiun mencetaknya.
- Struk juga bisa **diunduh** (gambar/PDF) dan **dikirim lewat WhatsApp** sebagai cadangan.

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
- **Satu tagihan per pelanggan** berisi: nota kasbon dari kasir, **kasbon lama**, dan **pesanan tempo**. Pesanan tempo sama dengan kasbon; bedanya biasanya ada DP. Pesanan baru **dihitung kasbon setelah barang diterima pelanggan** (nota/surat jalan terbit), senilai barang yang diserahkan dikurangi DP dan pembayaran.
- **Tempo bayar per pelanggan** (hari sejak nota), diatur pemilik. Jatuh tempo = tanggal nota + tempo. Pelanggan yang punya tagihan **lewat jatuh tempo**: ditandai merah di Kasbon dan Penjualan, dan **kasbon baru perlu PIN pemilik** walau masih dalam batas.
- Pelanggan baru dari kasir: **tempo bayar harus disetujui pemilik** (akun selain pemilik memakai PIN pemilik). Bila tidak diisi, tempo "belum diatur" sampai pemilik mengaturnya di Back Office.
- **Tidak ada tagih lewat WhatsApp.**
- Bayar transfer: nama bank (BCA, BRI, dsb.) dicatat **sebagai keterangan saja**.
- Pembayaran kasbon yang mengenai pesanan dicatat juga di pesanan itu (status pesanan ikut jadi Lunas).
- **Layar bayar kasbon** (pola seperti QuickBooks/Accurate "terima pembayaran"): daftar nota belum lunas dengan **centang** dan **kolom bayar per nota**. Ketik jumlah total → otomatis menutup nota tertua dulu; centang nota → dibayar penuh; jumlah per nota bisa diubah. Satu transaksi bisa satu nota atau beberapa nota. Di detail pelanggan setiap nota punya status di kanan: Belum lunas / Dibayar sebagian / Lewat tempo / Lunas; nota bisa dicentang lalu "Bayar n nota".
- **Kasbon lama** (sebelum memakai aplikasi): dicatat tanpa rincian barang, nota boleh sudah hilang. Isi: pelanggan, tanggal (perkiraan bila lupa), jumlah, keterangan, no. nota lama bila ada; bisa beberapa baris. Ditandai "Kasbon lama". Hanya **pemilik**, atau akun lain dengan **PIN pemilik**.
- **Back Office → Hutang & Piutang → Piutang Pelanggan** membaca data yang sama dengan Kasir → Kasbon. Hutang lama ke distributor dicatat dengan cara yang sama (tanpa rincian barang) saat modul Hutang dikerjakan.

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

## Pesanan kecil (WA, barang sudah ada di stok)

- **Bukan menu Pesanan**, tapi keranjang kasir yang ditahan:
  1. Pesanan WA masuk → kasir input di layar Penjualan.
  2. **Cetak "Daftar Siapkan"** (barang, jumlah, letak, kolom nama penyiap) untuk staf.
  3. **Tahan** dengan nama, mis. "Warung Bu Sri (WA)".
  4. Staf menyiapkan dari kertas.
  5. Barang diserahkan → kasir membuka keranjang tertahan → bayar atau tempo. **Transaksi baru terjadi di sini.**
- Selama ditahan stok belum berkurang, tapi barangnya ditandai **"sedang dipesan"**; kasir lain diingatkan bila menjual barang yang sama melebihi stok yang tersisa.

## Surat Pesanan (SP) ke distributor

- **Dua jenis pesanan, nama dibedakan tegas:**
  - **Pesanan Pelanggan** (Mode Kasir): pelanggan memesan ke toko.
  - **Pesanan Toko** (Mode Gudang): toko memesan ke distributor; dokumennya **Surat Pesanan**.
- **Pesanan Toko punya 3 sumber**, masing-masing sub-menu sendiri: (1) **Dari Pesanan Pelanggan** (pre-order yang barangnya belum ada, jumlah sesuai pesanan), (2) **Stok Menipis**, (3) **Pesanan Baru** (manual). Ditambah **Daftar Pesanan Toko**.
- Setiap Surat Pesanan menyimpan **sumbernya** dan pembuatnya. Semua masuk satu daftar yang sama, dan **Back Office → Pembelian → Pesanan Toko** membaca data yang sama (bukan salinan). Terima barang tetap dikerjakan gudang (Barang Masuk).
- Pelanggan (Buat Pesanan) dan distributor (Pesanan Baru) **tidak terisi otomatis**; wajib dipilih.
- **SP adalah satu-satunya jalur membeli barang ke distributor.**
- Saran SP otomatis dari: (1) stok habis / di bawah stok minimum, (2) baris pesanan pelanggan yang barangnya belum ada (ditandai "untuk pesanan PS-xxx"). Dikelompokkan per distributor; distributor bawaan = yang terakhir paling murah, bisa diganti.
- SP bisa dikirim ke distributor lewat **WhatsApp** (teks siap kirim), disalin, atau dicetak.
- **Faktur dibuat dari SP**: baris terisi otomatis, penerima mengecek isi kemasan, jumlah, dan harga. Selisih dengan SP (kurang kirim, beda harga, salah barang) terlihat.
- Barang untuk pesanan langsung terkunci saat faktur dari SP dicatat.
- **SP manual** bisa dibuat kapan saja. Barisnya: barang terdaftar, atau **permintaan** (teks bebas, mis. "Minyak goreng 1 L, merek lain"; boleh ditandai sebagai pengganti barang terdaftar).
- **Produk tidak dibuat saat SP.** Nama di SP sering berbeda dengan barang yang datang. Saat faktur dibuat dari SP, baris permintaan dicocokkan dengan barang fisik: pilih produk yang sudah terdaftar, atau daftarkan produk baru dengan **nama asli di kemasan/faktur** (pemilik/PIN pemilik). SP menyimpan catatan permintaan mana dipenuhi produk apa.
- **Pembuat & pengirim SP: admin** (dan pemilik). Kasir hanya menandai "perlu diorder".
- **Jumlah saran SP memakai tiga cara sekaligus**, ditampilkan berdampingan dan admin memilih: (a) sampai **stok maksimum** (maks − stok, dibulatkan ke satuan beli), (b) **jumlah order tetap** per barang, (c) dari **rata-rata penjualan** (mis. kebutuhan 2 minggu). Data barang menyimpan stok minimum, stok maksimum, dan jumlah order tetap.
- **Kiriman sebagian:** admin memilih per SP: **tetap terbuka** menunggu sisa, atau **ditutup** (sisa batal).
- **Harga final dicatat di faktur**, tidak ada langkah konfirmasi harga sebelum barang datang.

## Pesanan grosir (barang belum ada, perlu order ke distributor)

- **Menu tersendiri, terpisah dari POS.** POS untuk pembeli yang datang dan langsung membawa barang; Pesanan untuk pembeli yang memesan dulu.
- Status: Perlu diorder → Menunggu barang → (Perlu persetujuan) → Barang siap → Disiapkan → Diserahkan sebagian → Tempo / Lunas, atau Dibatalkan.
- **Kunci stok per baris:** bila stok bebas cukup, jumlahnya langsung dikunci untuk pesanan. Bila tidak cukup, **seluruh baris diorder** lewat SP, supaya stok eceran tidak terkuras.
- Di layar Saran SP, baris dari pesanan memakai jumlah "sesuai pesanan" (dibulatkan ke satuan beli); kelebihan dari pembulatan masuk stok umum.
- Kasir/pemilik mencatat dan menagih (Mode Kasir → Pesanan); gudang menyiapkan dan menyerahkan, cetak nota/surat jalan (Mode Gudang → Siapkan Pesanan). Satu data pesanan, status bergerak bersama.
- **Barang numpang lewat:** faktur bisa berisi barang yang sudah dipesan pembeli (mis. 72 karton). Saat input faktur baris ditandai "untuk pesanan X": stok masuk lalu **langsung terkunci** untuk pesanan itu, tidak bisa dijual kasir.
- Modal pesanan seperti ini diambil **langsung dari baris faktur tersebut** (bukan antrian FIFO stok umum), jadi untung pesanan tepat.
- Faktur campuran: sisa di luar pesanan masuk stok umum seperti biasa.
- **Harga pesanan:** dicatat saat pesanan dibuat (perkiraan), lalu **disesuaikan saat faktur dengan harga beli baru masuk**. Sistem menghitung ulang untung; bila **di bawah target untung** barang itu, pesanan berhenti di status "perlu persetujuan" sampai **pemilik menyetujui** (tetap dengan harga lama, atau ubah harga ke pembeli).
- **Target untung** (% dari modal) diatur per barang (atau kategori) sebagai batas bawah yang wajar.
- **Uang muka (DP):** opsional; mengurangi tagihan saat serah terima. Bila pesanan batal, DP dikembalikan atau disimpan sebagai saldo pelanggan.
- **Pengantaran:** diambil pembeli atau diantar toko. Ongkos antar **tidak ditagihkan**, dicatat sebagai pengeluaran biasa. Bila diantar, nota otomatis disertai **surat jalan** (kolom tanda tangan penerima).
- **Serah terima sebagian ke pembeli: boleh.**
- **Aksi di detail pesanan:** cetak nota pesanan (thermal/unduh/WhatsApp, tanpa modal/untung), ubah data (tanggal, cara serah, alamat, catatan; pelanggan tidak bisa diganti), tambah barang, ubah barang (harga/diskon selalu bisa; jumlah hanya bila belum masuk Surat Pesanan/datang/diserahkan), hapus barang (syarat sama, minimal tersisa satu barang). **Hapus pesanan** hanya untuk salah catat (belum ada pembayaran, Surat Pesanan, atau serah terima); selain itu pakai **Batalkan**.
- **Barang yang diterima dari distributor harus sesuai faktur.** Bila distributor mengirim kurang/beda, toko meminta **faktur pengganti**; faktur yang diinput selalu mengikuti barang yang benar-benar diterima. Selisih ditandai di Barang Masuk sampai faktur pengganti diterima.
- **Pembayaran pesanan: lunas saat terima atau tempo** (keduanya). Tempo tercatat sebagai piutang pelanggan dengan jatuh tempo.
- **Urutan: pembeli pesan dulu → baru order ke distributor.** Pesanan yang belum ada stoknya muncul di daftar "perlu diorder".
- **Barang tidak pernah diantar langsung dari distributor ke pembeli** (risiko). Selalu masuk ke ruko dulu, dicek, lalu diserahkan.

## Lokasi stok (12 ruko)

- **Dipilih: satu stok per barang + catatan letak.** Jumlah stok dihitung satu angka (toko + semua gudang), cukup untuk akurasi penjualan, modal, laba, hutang.
- Data barang punya kolom **letak** (mis. "Rak toko, Gudang ruko 5") supaya pegawai tahu mengambil ke mana.
- Faktur boleh mencatat **diturunkan di ruko berapa**, untuk memperbarui catatan letak.
- Tidak ada pencatatan perpindahan antar ruko.
- Hitung stok wajib mencakup toko + 11 ruko; form menyediakan baris per tempat lalu dijumlahkan.
- Bisa ditingkatkan nanti ke stok terpisah Toko vs Gudang tanpa membongkar data.

## Barang ikutan (bundling) & pantauan per distributor

- Distributor kadang mewajibkan barang ikutan (mis. beli 20 slop A Mild wajib ambil 1 slop rokok lain yang sulit laku, sehingga dijual rugi atau pokok).
- Barang ikutan ditandai di baris faktur (terhubung ke barang utama & distributor) tapi **masuk stok seperti biasa**; modalnya tidak dialihkan ke barang utama.

## Umur stok

- Dihitung per kedatangan (lapisan FIFO); umur barang = umur kedatangan tertua yang masih tersisa. Menu **Gudang → Stok Barang → Umur Stok** menampilkan barang berumur ≥ 3 bulan dengan nilai dan saran tindakan. Warna di Stok Barang dan Dashboard:
  - **< 3 bulan:** normal.
  - **3–6 bulan: kuning** — segera keluarkan (taruh depan, tawarkan, harga khusus).
  - **6–12 bulan: oranye** — mendesak; **saatnya retur ke distributor**.
  - **≥ 12 bulan: merah** — nilai modalnya dicatat sebagai **kerugian tahunan**. Barang **dibuang** (lewat Barang Rusak), atau bila masih layak **dijual dan hasilnya masuk pendapatan lain-lain** (bukan penjualan biasa, modal 0), karena bisa jadi sudah dianggap kedaluwarsa.
- Laporan per distributor ikut menampilkan barang berumur ini sebagai bahan nego.
- **Laporan per distributor untuk bahan nego:** barang dari tiap distributor dikelompokkan **laku / lambat / berhenti** (tidak ada penjualan dalam X hari), nilai stok yang mengendap, dan total rugi dari barang ikutan.

## Angka bawaan

- **Target untung bawaan: 5%** dari modal (bisa ditimpa per kategori/barang).
- **Batas susut repack: 1 kg per 50 kg (2%)**; lebih dari itu muncul peringatan dan wajib alasan.

## Printer

- **Satu printer thermal untuk semua**: struk, daftar siapkan, surat jalan, bukti kas keluar.
- Laporan harian bisa dipilih **cetak thermal** atau **cetak biasa/PDF** (unduh).

## Stok habis

- Barang yang habis atau di bawah stok minimum otomatis masuk **daftar order** di Back Office (dengan distributor yang terakhir paling murah).
- Kasir punya tombol "Lapor: barang tidak ada di rak" bila sistem mencatat stok tapi barang tidak ada.
- **Barang ada di rak tapi stok sistem 0:** penjualan **tetap jalan** (pembeli tidak ditolak), stok jadi minus, kasir melihat peringatan.
- Sistem otomatis membuat **tugas tindak lanjut untuk admin**: "cek apakah semua faktur barang ini sudah diinput" (barang datang setiap hari).
  - Faktur belum diinput → admin menginput, stok minus beres sendiri, modal sementara dikoreksi.
  - Semua faktur sudah diinput → barang ditandai **"stok minus belum terjelaskan"** dan diselidiki asal kelebihannya (salah hitung, salah isi kemasan, dll.) sampai dibetulkan lewat penyesuaian/opname.

## Contoh SKU gula (pola untuk barang curah lain)

| Barang | SKU | Satuan jual | Catatan |
| --- | --- | --- | --- |
| Gulaku 5 kg (pabrikan) | SMB-00001 | Bungkus (Karton bila ada) | Merek & kemasan pabrik |
| Gula Pasir curah | SMB-00002 | **Hanya Karung 50 kg** | Satuan dasar kg; tidak pernah ditimbang eceran |
| Gula Pasir 1 kg (bungkus) | SMB-00003 | Bungkus | Hasil repack dari gula curah; harga bertingkat dipasang di sini (mis. 5 bungkus ke atas lebih murah) |

- Pembeli karungan → SKU curah. Pembeli 1, 2, 3 kg → SKU bungkus 1 kg sebanyak itu.
- Contoh harga bertingkat per kg di bagian Harga jual tetap berlaku sebagai ilustrasi mekanisme untuk barang yang memang dijual per kg.

## Repack (bungkus ulang)

- Barang besar dibeli lewat faktur seperti biasa (mis. Gula Pasir 50 kg); stoknya langsung masuk dan bisa dijual curah.
- Barang hasil repack adalah **barang tersendiri** (mis. "Gula Pasir 1 kg (bungkus)", "½ kg (bungkus)"). Tidak pernah dibeli dari distributor; stoknya hanya bertambah lewat **transaksi Repack**.
- Di data barang hasil repack diisi sekali: bahan + takaran per bungkus (1 bungkus = 1 kg Gula Pasir), dan **batas susut wajar** (mis. 2%).
- Repack dicatat terpisah dari faktur, kapan pun dikerjakan, sekaligus atau sebagian. Input: bahan dipakai, hasil jadi, sisa dikembalikan.
- **Susut dihitung sistem** = bahan − (hasil × takaran) − sisa. Bisa negatif (kelebihan). Tumpah/tercecer tidak perlu ditimbang; otomatis masuk susut.
- Susut melewati batas → wajib pilih alasan (tumpah, kemasan rusak, karung kurang, lainnya + catatan) dan ditandai untuk diperiksa pemilik.
- Modal per bungkus = (modal bahan terpakai menurut FIFO + biaya plastik bila dihitung) ÷ jumlah bungkus jadi.
- **Data susut disimpan per repack**: tanggal, pegawai, barang, bahan, hasil, sisa, susut (kg, %, Rp), alasan, distributor asal bahan. Laporan susut per barang, per pegawai, per distributor.
- Opsional: kolom "berat aktual" saat barang datang, supaya karung kurang dari distributor terpisah dari susut saat membungkus.
- Belum diputuskan: siapa yang mengerjakan repack (menu di kasir atau Back Office); biaya plastik dihitung atau tidak.

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

## Keterhubungan data (hulu → hilir)

Dikunci oleh tes `src/data/hulu-hilir.test.ts` (satu barang dibawa melewati semua alur).

- **Barang** (Gudang) → **Surat Pesanan** → **barang masuk/faktur** → stok (buku stok) + harga beli terakhir per satuan + hutang distributor (tempo) **atau pembayaran cash** → buku kas laci/brankas/rekening → laporan (E. belanja barang).
- **Faktur cash dari Surat Pesanan dibayar saat barang diterima**: pilih dibayar dari laci / brankas / rekening (PIN pemilik bila bukan pemilik); tercatat sebagai bukti bayar distributor dan faktur langsung lunas.
- **Bayar distributor** (Kasir → Kas Laci dan Back Office → Hutang Distributor, data sama) bisa dari laci, brankas, atau rekening.
- **Penjualan** → stok keluar + kartu stok + analisis barang (terjual, status gerak) + kas laci (tunai) / rekening (transfer) + kasbon pelanggan → laporan kasir & toko.
- **Pesanan pelanggan** → stok dikunci → SP bila kurang → barang datang → serah (stok keluar) → tagihan di Kasbon/Piutang; DP & pelunasan → kas. **Batal dengan uang dikembalikan → uang keluar tercatat** (tunai dari laci / transfer) di kelompok F. Kembali ke pelanggan.
- **Retur** → stok kembali (bagus) / Barang Rusak, uang kembali / potong kasbon / potong tagihan pesanan → kas & laporan.
- **Tutup kasir** → pindah dana ke brankas/rekening → buku brankas/rekening → laporan harian toko (pindah dana selalu seimbang).
- **Saran pesan (Stok Menipis)** memakai stok bebas dari buku stok, stok minimum/maksimum dari data barang, dan **rata-rata penjualan nyata 30 hari**.
- **Untung pesanan** memakai harga beli terakhir (sama dengan data barang).
- Belum tersambung (perlu keputusan): **DP yang "jadi saldo pelanggan"** saat pesanan batal belum bisa dipakai di transaksi berikutnya.

## Prinsip data

1. Tidak ada hapus, hanya batal (dengan alasan, nama pengguna, mutasi pembalik).
2. Nomor dokumen berurutan per jenis: `PJ-` penjualan, `PB-` pembelian, `RJ-` retur jual, `RB-` retur beli, `OP-` opname, `BY-` pembayaran.
3. Setiap rupiah lewat buku kas pada akun kas tertentu.
4. Hutang/piutang = dokumen + pembayaran yang dialokasikan; saldo dihitung.

## Tampilan

- **Format daftar seragam** (Pesanan Pelanggan, Kasbon, Retur, Riwayat, Kas Laci, Bayar Distributor, Piutang): tombol utama kanan atas → kartu ringkasan (bisa diklik sebagai filter) → kotak filter (periode / pelanggan / distributor / cari / status) → tabel gaya akuntansi dengan baris total; klik baris membuka detail. Di HP tabel berubah menjadi kartu per baris. Komponen bersama: `src/components/Daftar.tsx`.
- **Bilah alat daftar (pola Accurate):** satu baris berisi kotak cari, tombol **Filter**, ringkasan filter aktif, dan tombol tambah. **Panel filter tertutup secara bawaan** dan dibuka lewat tombol Filter (posisi diingat per halaman), supaya layar tidak penuh. Di HP kartu ringkasan menjadi satu baris yang bisa digeser.

- Warna biru–putih (lihat `src/styles/global.css`), font Plus Jakarta Sans.
- Gaya bersih seperti aplikasi kasir Indonesia (Moka, majoo), bukan gaya "template AI".
- Bahasa antarmuka: Indonesia.
