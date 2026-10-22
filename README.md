# RAZKA JAYA STORE MANAGEMENT SYSTEM (ERP & POS)

Sistem Manajemen Toko dan Kasir Point of Sale (POS) profesional berbasis **React TypeScript, Tailwind CSS, dan Firebase Cloud Firestore & Authentication**, dirancang khusus untuk toko bahan bangunan (material) dan toko umum.

---

## 🚀 Fitur Utama

### 1. Dashboard ERP Modern
- 9 Kartu Metrik Utama: Omzet Hari Ini, Omzet Bulan Ini, Estimasi Laba Kotor, Nilai Aset Persediaan, Saldo Kas & Bank, Piutang Pelanggan, Hutang Supplier, Beban Pengeluaran.
- Grafik Interaktif Recharts: Tren Omzet 7 Hari, Komposisi Penjualan per Kategori Material.
- Peringatan Otomatis Stok Minimum (Kritis) dan Daftar Transaksi Kasir Terbaru.

### 2. Master Barang Material & Retail
- Satuan material lengkap: **Sak, Batang, Meter, Lembar, Dus, M3, Truk, Pail, Kaleng, Roll, Kg, Pcs**.
- Harga Beli (Modal), Harga Jual Eceran, dan Harga Grosir otomatis berdasarkan kuantitas minimum.
- Cetak Label Barcode Rak Toko & Kartu Stok (Audit trail mutasi in/out per barang).
- Ekspor Katalog Barang ke Excel (`.xlsx`).

### 3. Kasir POS Cepat & Responsif
- Dukungan **USB Barcode Scanner** langsung dengan input listener otomatis.
- Keranjang belanja dinamis dengan pengali kuantitas cepat dan diskon per item / transaksi.
- Opsi Pajak PPN (11%) aktif/nonaktif.
- Fitur **Hold / Simpan Antrean Transaksi Sementara** & Panggil Kembali.
- Multi-metode Pembayaran: Tunai (dengan tombol pecahan cepat & hitung kembalian), Transfer Bank, dan **Tempo / Kredit (Piutang)**.
- Cetak Struk Kasir Thermal format **58mm dan 80mm**.

### 4. Pembelian & Hutang Supplier
- Input Faktur Pembelian (PO) dengan nomor faktur supplier/pabrik.
- **Penerimaan Barang**: Stok gudang hanya bertambah saat status barang dikonfirmasi *Diterima*.
- Modul Pelunasan Hutang Supplier bertahap dengan pencatatan mutasi kas/bank.

### 5. Inventaris & Pergudangan
- Manajemen Multi-Gudang (Gudang Utama & Berat, Toko Display Depan, Depo Pasir/Semen).
- **Audit Trail Mutasi Stok** yang tidak dapat diubah (immutable log).
- **Modul Stock Opname**: Membandingkan stok sistem dengan perhitungan fisik nyata, menghitung selisih dan nilai finansial, serta menerapkan penyesuaian otomatis.

### 6. Pelanggan & Analisis Umur Piutang
- Pencatatan Plafon Kredit Maksimal dan Saldo Hutang Pelanggan.
- **Aging Report Piutang**: Pengelompokan umur piutang (Belum jatuh tempo, 1-30 hari, 31-60 hari, 61-90 hari, dan >90 hari).
- Pelunasan Piutang dan Cetak Kuitansi Resmi Tanda Terima Pembayaran.

### 7. Keuangan & Sesi Shift Kasir
- Buka & Tutup Shift Kasir dengan perhitungan kas fisik dan rekonsiliasi selisih kas.
- Pencatatan Beban Pengeluaran Operasional (BBM truk, listrik, gaji, perawatan).
- Laporan Estimasi Laba Rugi Sederhana (Pendapatan - HPP - Beban Operasional = Laba Bersih).

---

## 🗄️ Struktur Koleksi Firestore

- `users`: Profil staf dengan role (`owner`, `admin`, `manager`, `cashier`, `warehouse`, `finance`).
- `products`: Katalog inventaris barang material dan stok.
- `categories`: Kategori produk (Semen, Besi, Cat, Pasir, Triplek, Pipa, dll).
- `warehouses`: Data lokasi gudang dan depo penyimpanan.
- `customers`: Data pelanggan dan limit plafon kredit.
- `suppliers`: Data distributor dan supplier material.
- `sales`: Transaksi penjualan kasir POS.
- `purchases`: Faktur pembelian barang ke distributor.
- `stockMovements`: Catatan audit perubahan stok (masuk, keluar, opname, rusak).
- `receivables` & `receivablePayments`: Piutang tempo penjualan pelanggan.
- `payables` & `payablePayments`: Hutang pembelian ke supplier.
- `cashSessions`: Sesi kasir shift dan rekonsiliasi kas.
- `expenses`: Biaya operasional toko.
- `bankAccounts`: Rekening kas toko dan giro bank.
- `settings`: Konfigurasi profil toko dan format struk.

---

## 👥 Hak Akses (Role-Based Access Control)
Sistem memiliki 6 peran pengguna yang dapat diuji coba langsung melalui dropdown navbar:
1. **Owner**: Hak akses penuh seluruh modul dan keuangan.
2. **Admin**: Pengelolaan master barang, stok, pembelian, dan sistem.
3. **Manajer**: Supervisi transaksi harian dan persetujuan opname.
4. **Kasir**: Akses kasir POS, penjualan, dan struk.
5. **Gudang**: Penerimaan barang, penyesuaian stok, dan opname fisik.
6. **Keuangan**: Buku kas, pelunasan hutang piutang, dan pencatatan biaya.

---

## 🔌 Panduan Koneksi Database Localhost & Google Spreadsheet

Aplikasi telah dilengkapi fitur konfigurasi langsung di menu **Pengaturan Toko -> Koneksi Localhost & Google Spreadsheet**.

### A. Menghubungkan ke Database Google Spreadsheet (Live Sync):
1. Buat Google Sheets baru di browser Anda: [sheets.new](https://sheets.new).
2. Klik menu **Ekstensi (Extensions)** -> **Apps Script**.
3. Buka menu **Pengaturan Toko** di aplikasi ini -> klik tab **Koneksi Localhost & Google Spreadsheet** -> klik tombol **"Lihat Kode Script"** dan salin kodenya.
4. Tempel ke editor Apps Script, lalu klik **Terapkan (Deploy)** -> **Deployment baru (New deployment)**.
5. Pilih tipe **Aplikasi Web (Web App)**, lalu atur *Akses (Who has access)* ke **Anyone (Siapa saja)**.
6. Salin **Web App URL** yang didapat, lalu tempelkan ke kolom URL Webhook di aplikasi ini dan klik **Simpan & Sinkronkan**.
7. Setiap penjualan kasir dan katalog produk material akan otomatis tercatat ke baris Google Spreadsheet Anda!

### B. Menghubungkan ke Database Localhost (Firebase Emulator / Offline):
1. Install Firebase CLI di komputer Anda:
   ```bash
   npm install -g firebase-tools
   ```
2. Jalankan emulator Firestore & Auth di komputer lokal:
   ```bash
   firebase emulators:start --only firestore,auth
   ```
3. Di aplikasi ini, buka **Pengaturan Toko** -> tab **Koneksi Localhost & Google Spreadsheet**.
4. Centang **"Gunakan Database Localhost (Firebase Emulator)"** (Host: `localhost`, Port Firestore: `8080`, Port Auth: `9099`).
5. Klik **Simpan & Terapkan Konfigurasi Localhost**. Aplikasi akan otomatis beralih ke database lokal di komputer Anda.

