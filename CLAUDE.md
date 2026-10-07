# Retail Kelontong

Sistem kasir, stok, pembelian, hutang-piutang untuk toko kelontong (eceran + grosir).

## Wajib dibaca dulu

`docs/keputusan-desain.md` — semua aturan bisnis yang sudah disepakati pemilik toko. Jangan mengubah aturan di sana tanpa persetujuan pemilik.

## Stack

- React 18 + TypeScript + Vite, react-router (HashRouter)
- CSS biasa dengan token warna di `src/styles/global.css` (biru–putih). Tidak memakai Tailwind.
- Tes: Vitest. Database direncanakan Supabase (belum tersambung).

## Perintah

- `npm run dev` — jalankan lokal
- `npm test` — tes aturan bisnis
- `npm run build` — cek tipe + build

## Struktur

- `src/domain/` — aturan bisnis murni (tanpa React): harga, diskon, kasbon, FIFO. Setiap aturan baru wajib punya tes.
- `src/navigasi.tsx` — daftar menu Operasional & Back Office. Modul yang selesai mengisi `halaman`.
- `src/layouts/` — LayoutOperasional (kasir) dan LayoutBackOffice (pemilik).
- `src/components/` — komponen bersama.

## Konvensi

- Bahasa antarmuka dan penamaan domain: Indonesia (`hargaJual`, `satuanDasar`, `pelanggan`).
- Uang dalam rupiah bulat; tampilkan dengan `rupiah()` dari `src/lib/format.ts`.
- Jumlah stok dan modal selalu dalam satuan dasar barang.
- Kasir tidak boleh melihat modal atau laba.
