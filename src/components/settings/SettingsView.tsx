import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  ShieldCheck,
  Sparkles,
  Database,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Server,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { StoreSettings } from '../../types';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  syncToGoogleSheets
} from '../../utils/spreadsheetSync';
import { exportToExcel } from '../../utils/formatters';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, seedStoreData, products, sales } = useStore();
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'integrations'>('profile');

  // Form State
  const [formData, setFormData] = useState<StoreSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Localhost Database / Emulator State
  const [useLocalEmulator, setUseLocalEmulator] = useState<boolean>(() => {
    return localStorage.getItem('razka_use_local_emulator') === 'true';
  });
  const [emulatorHost, setEmulatorHost] = useState(
    localStorage.getItem('razka_emulator_host') || 'localhost'
  );
  const [emulatorFirestorePort, setEmulatorFirestorePort] = useState(
    localStorage.getItem('razka_emulator_firestore_port') || '8080'
  );
  const [emulatorAuthPort, setEmulatorAuthPort] = useState(
    localStorage.getItem('razka_emulator_auth_port') || '9099'
  );

  // Google Spreadsheet Webhook State
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState(() => {
    return localStorage.getItem('razka_sheets_webhook_url') || '';
  });
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  // Save General Profile Settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Save Localhost Emulator Settings
  const handleSaveLocalEmulator = () => {
    localStorage.setItem('razka_use_local_emulator', useLocalEmulator ? 'true' : 'false');
    localStorage.setItem('razka_emulator_host', emulatorHost);
    localStorage.setItem('razka_emulator_firestore_port', emulatorFirestorePort);
    localStorage.setItem('razka_emulator_auth_port', emulatorAuthPort);

    if (
      confirm(
        `Konfigurasi database ${useLocalEmulator ? 'Localhost (Emulator)' : 'Cloud Firestore'} berhasil disimpan. Muat ulang halaman sekarang untuk menerapkan perubahan koneksi?`
      )
    ) {
      window.location.reload();
    }
  };

  // Test & Sync Products to Google Sheets
  const handleSyncToSheets = async () => {
    if (!sheetsWebhookUrl) {
      alert('Silakan masukkan URL Webhook Google Apps Script terlebih dahulu!');
      return;
    }

    setIsSyncingSheets(true);
    setSheetsSyncResult(null);
    try {
      localStorage.setItem('razka_sheets_webhook_url', sheetsWebhookUrl);
      const res = await syncToGoogleSheets(sheetsWebhookUrl, 'sync_products', products);
      setSheetsSyncResult('✅ Berhasil mengirimkan data stok barang ke Google Spreadsheet!');
    } catch (err) {
      setSheetsSyncResult(`❌ Gagal: ${err instanceof Error ? err.message : 'Koneksi ditolak'}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Copy Google Apps Script to Clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Seed sample data
  const handleSeed = async () => {
    if (confirm('Muat ulang data contoh material toko (Semen, Besi SNI, Cat, Pipa, Pasir dll) ke Firebase Firestore?')) {
      setIsSeeding(true);
      try {
        await seedStoreData();
        alert('Data contoh material toko berhasil dimuat!');
      } finally {
        setIsSeeding(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pengaturan & Integrasi Database
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Konfigurasi profil toko, koneksi database Localhost, dan integrasi otomatis Google Spreadsheet.
          </p>
        </div>

        {isSaved && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pengaturan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Profil Toko & Struk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'integrations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Koneksi Localhost & Google Spreadsheet</span>
        </button>
      </div>

      {/* TAB 1: PROFIL & STRUK */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: PROFIL TOKO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Store className="w-4 h-4 text-blue-400" />
              <span>Profil Toko Material & Umum</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Toko *
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cabang / Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slogan / Tagline Toko
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Lengkap Toko
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor Telepon / WhatsApp Toko
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat Email Toko
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PENGATURAN STRUK & PAJAK */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Format Struk Thermal & Pajak</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tarif PPN Default (%)
                </label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batas Minimum Peringatan Stok Rendah (Default)
                </label>
                <input
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catatan Footer Struk (Penutup)
                </label>
                <textarea
                  rows={2}
                  value={formData.receiptFooter}
                  onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: DATABASE INTI & DATA DEMO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Inisialisasi Data Demo Firestore</span>
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-white">Muat Ulang Data Sampel Toko Material</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mengisi ulang koleksi Firestore dengan data lengkap material (Semen Tiga Roda, Besi SNI, Pasir Cor, Cat Dulux, Triplek, dsb.)
                </p>
              </div>

              <button
                type="button"
                onClick={handleSeed}
                disabled={isSeeding}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSeeding ? 'Memuat...' : 'Inisialisasi Data Demo'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Pengaturan</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: INTEGRASI DATABASE (LOCALHOST & SPREADSHEET) */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* BAGIAN 1: KONEKSI GOOGLE SPREADSHEET */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  1. Integrasi Google Spreadsheet (Live Webhook)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Otomatisasi Spreadsheet
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda dapat menghubungkan aplikasi RAZKA JAYA dengan file <strong>Google Sheets</strong> milik Anda. Setiap kali transaksi terjadi atau saat Anda menekan tombol sinkronisasi, data stok dan penjualan akan otomatis tercatat ke baris Google Spreadsheet Anda secara real-time.
            </p>

            {/* Input Webhook URL */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                URL Webhook Google Apps Script (Web App URL):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={sheetsWebhookUrl}
                  onChange={(e) => setSheetsWebhookUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSyncToSheets}
                  disabled={isSyncingSheets || !sheetsWebhookUrl}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSyncingSheets ? 'Mengirim...' : 'Sinkronkan Stok Sekarang'}</span>
                </button>
              </div>

              {sheetsSyncResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-emerald-300">
                  {sheetsSyncResult}
                </div>
              )}
            </div>

            {/* Panduan 4 Langkah Menghubungkan Google Spreadsheet */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Cara Membuat Webhook Google Spreadsheet (Mudah & Gratis):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScriptModal(true)}
                  className="text-xs font-semibold text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Lihat Kode Script</span>
                </button>
              </div>

              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-400 underline">Google Sheets</a> baru di browser Anda.</li>
                <li>Klik menu <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>.</li>
                <li>Hapus kode bawaan, lalu salin dan tempel <strong>Kode Script RAZKA JAYA</strong> di bawah ini ke editor tersebut.</li>
                <li>Klik tombol <strong>Terapkan (Deploy)</strong> &rarr; <strong>Deployment baru (New deployment)</strong> &rarr; Pilih jenis <strong>Aplikasi Web (Web App)</strong>.</li>
                <li>Atur <em>Who has access (Siapa yang memiliki akses)</em> menjadi: <span className="text-amber-400 font-semibold font-mono">Anyone (Siapa saja)</span>, lalu klik <strong>Deploy</strong>.</li>
                <li>Salin <strong>Web App URL</strong> yang dihasilkan, lalu tempelkan pada kolom URL di atas dan klik <strong>Sinkronkan Stok Sekarang</strong>!</li>
              </ol>
            </div>
          </div>

          {/* BAGIAN 2: KONEKSI DATABASE LOCALHOST (FIREBASE EMULATOR / LOCAL SERVER) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">
                  2. Koneksi Database Localhost (Firebase Emulator Suite)
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  useLocalEmulator
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                }`}
              >
                {useLocalEmulator ? 'Mode Localhost Aktif' : 'Mode Cloud Firestore (Default)'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bila Anda ingin menjalankan database di komputer lokal Anda (offline/tanpa internet) menggunakan <strong>Firebase Local Emulator Suite</strong> atau server lokal, aktifkan opsi di bawah:
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLocalEmulator}
                  onChange={(e) => setUseLocalEmulator(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Gunakan Database Localhost (Firebase Emulator)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Aplikasi akan mengarahkan koneksi SDK ke alamat emulator lokal komputer Anda.
                  </div>
                </div>
              </label>

              {useLocalEmulator && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Host Emulator</label>
                    <input
                      type="text"
                      value={emulatorHost}
                      onChange={(e) => setEmulatorHost(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Port Firestore</label>
                    <input
                      type="text"
                      value={emulatorFirestorePort}
                      onChange={(e) => setEmulatorFirestorePort(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Port Auth</label>
                    <input
                      type="text"
                      value={emulatorAuthPort}
                      onChange={(e) => setEmulatorAuthPort(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Command Guide */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300">
                Perintah Menjalankan Emulator di Komputer Lokal:
              </span>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                {`# 1. Pastikan firebase-tools terpasang di komputer Anda:\nnpm install -g firebase-tools\n\n# 2. Jalankan emulator lokal untuk Firestore dan Auth:\nfirebase emulators:start --only firestore,auth`}
              </pre>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveLocalEmulator}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25"
              >
                <Save className="w-4 h-4" />
                <span>Simpan & Terapkan Konfigurasi Localhost</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE APPS SCRIPT CODE VIEWER */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Kode Google Apps Script Siap Pakai</h3>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-950">
              <p className="text-xs text-slate-400 mb-3">
                Salin seluruh kode JavaScript berikut dan tempelkan ke <strong>Google Sheets &rarr; Extensions &rarr; Apps Script</strong>:
              </p>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed select-all">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {copiedScript ? '✅ Kode berhasil disalin ke clipboard!' : 'Klik tombol untuk menyalin'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedScript ? 'Tersalin!' : 'Salin Seluruh Kode'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
