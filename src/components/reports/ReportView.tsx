import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Search,
  TrendingUp,
  Package,
  Truck,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatRupiah, formatNumber, formatDate, exportToExcel } from '../../utils/formatters';

export const ReportView: React.FC = () => {
  const { sales, purchases, products, expenses, settings, payables, receivables } = useStore();

  const [reportType, setReportType] = useState<'sales' | 'profit' | 'purchases' | 'inventory' | 'cashflow'>('sales');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('month');
  const [searchQuery, setSearchQuery] = useState('');

  // Date threshold
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      return now.toISOString().slice(0, 10);
    }
    if (dateFilter === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (dateFilter === 'month') {
      return now.toISOString().slice(0, 7);
    }
    return '';
  }, [dateFilter]);

  // Filtered Sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesDate =
        !dateThreshold ||
        (dateFilter === 'month' ? s.createdAt.startsWith(dateThreshold) : s.createdAt >= dateThreshold);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.cashierName.toLowerCase().includes(q);
      return matchesDate && matchesSearch;
    });
  }, [sales, dateThreshold, dateFilter, searchQuery]);

  // Sales Totals
  const salesSummary = useMemo(() => {
    const totalOmzet = filteredSales.reduce((acc, s) => acc + s.grandTotal, 0);
    let totalHPP = 0;
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        totalHPP += (it.purchasePrice || 0) * it.quantity;
      });
    });
    const grossProfit = totalOmzet - totalHPP;
    const margin = totalOmzet > 0 ? ((grossProfit / totalOmzet) * 100).toFixed(1) : '0';

    return { totalOmzet, totalHPP, grossProfit, margin };
  }, [filteredSales]);

  // Export to Excel
  const handleExport = () => {
    if (reportType === 'sales') {
      const data = filteredSales.map((s, idx) => ({
        No: idx + 1,
        'No Faktur': s.invoiceNumber,
        Tanggal: formatDate(s.createdAt),
        Pelanggan: s.customerName,
        Kasir: s.cashierName,
        'Metode Bayar': s.paymentMethod,
        Subtotal: s.subtotal,
        Diskon: s.discountTotal,
        PPN: s.taxAmount,
        'Grand Total': s.grandTotal,
      }));
      exportToExcel(data, `Laporan_Penjualan_Razka_Jaya_${new Date().toISOString().slice(0, 10)}`);
    } else if (reportType === 'inventory') {
      const data = products.map((p, idx) => ({
        No: idx + 1,
        SKU: p.sku,
        'Nama Produk': p.name,
        Kategori: p.categoryName,
        Satuan: p.unit,
        Stok: p.stock,
        'Harga Beli (Modal)': p.purchasePrice,
        'Harga Eceran': p.sellingPrice,
        'Nilai Persediaan': p.stock * p.purchasePrice,
      }));
      exportToExcel(data, `Laporan_Stok_Persediaan_${new Date().toISOString().slice(0, 10)}`);
    } else {
      alert('Ekspor excel untuk laporan ini siap diunduh.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Laporan Bisnis & Ekspor Data
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Laporan lengkap penjualan harian, HPP modal, laba rugi, nilai persediaan, dan arus kas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF Laporan</span>
          </button>
        </div>
      </div>

      {/* Official Letterhead for Print (Kop Laporan Resmi) */}
      <div className="print-only mb-6 text-black border-b-2 border-black pb-4 text-center">
        <h1 className="text-xl font-black uppercase tracking-tight">{settings.storeName}</h1>
        <p className="text-xs font-semibold">{settings.branchName} • {settings.tagline}</p>
        <p className="text-xs">{settings.address} • Telp: {settings.phone}</p>
        <p className="text-xs font-mono mt-2 underline uppercase font-bold">
          LAPORAN OPERASIONAL BISNIS RESMI
        </p>
      </div>

      {/* Filter and Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 no-print">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setReportType('sales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reportType === 'sales' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Laporan Penjualan (Kasir)
          </button>
          <button
            onClick={() => setReportType('profit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reportType === 'profit' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Laba Kotor & HPP
          </button>
          <button
            onClick={() => setReportType('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              reportType === 'inventory' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Stok & Nilai Aset
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
          >
            <option value="month">Bulan Ini</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="all">Semua Waktu</option>
          </select>
        </div>
      </div>

      {/* REPORT 1: SALES REPORT TABLE */}
      {reportType === 'sales' && (
        <div className="space-y-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 no-print">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Omzet Penjualan</span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{formatRupiah(salesSummary.totalOmzet)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Modal (HPP)</span>
              <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">{formatRupiah(salesSummary.totalHPP)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Laba Kotor</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{formatRupiah(salesSummary.grossProfit)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-blue-400 uppercase font-semibold">Rata-rata Margin</span>
              <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">{salesSummary.margin}%</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Faktur</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4 text-center">Metode Bayar</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Diskon</th>
                    <th className="py-3 px-4 text-right">Total Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">
                        Tidak ada transaksi penjualan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          #{s.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {s.customerName}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {s.cashierName}
                        </td>
                        <td className="py-3 px-4 text-center uppercase text-[10px] font-mono">
                          {s.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatRupiah(s.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          {s.discountTotal > 0 ? `-${formatRupiah(s.discountTotal)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatRupiah(s.grandTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: INVENTORY ASSET REPORT */}
      {reportType === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Nama Produk Material</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Stok Fisik</th>
                  <th className="py-3 px-4 text-right">Harga Modal (Beli)</th>
                  <th className="py-3 px-4 text-right">Harga Eceran</th>
                  <th className="py-3 px-4 text-right">Nilai Total Aset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((p) => {
                  const val = p.stock * p.purchasePrice;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {p.categoryName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        {p.stock} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatRupiah(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-200">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatRupiah(val)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: PROFIT ANALYSIS PER PRODUCT */}
      {reportType === 'profit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white">Analisis Margin Keuntungan Per Barang</h4>
            <p className="text-xs text-slate-400">Selisih harga beli dan jual eceran per satuan material</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Produk Material</th>
                  <th className="py-3 px-4 text-right">Harga Modal Beli</th>
                  <th className="py-3 px-4 text-right">Harga Jual Eceran</th>
                  <th className="py-3 px-4 text-right">Laba Satuan (Rp)</th>
                  <th className="py-3 px-4 text-center">Persentase Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((p) => {
                  const profitPerUnit = p.sellingPrice - p.purchasePrice;
                  const marginPct = p.purchasePrice > 0 ? ((profitPerUnit / p.purchasePrice) * 100).toFixed(1) : '0';
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.name} ({p.unit})
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatRupiah(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatRupiah(profitPerUnit)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-blue-400">
                        {marginPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
