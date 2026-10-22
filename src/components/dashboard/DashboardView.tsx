import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  Package,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useStore } from '../../context/StoreContext';
import { formatRupiah, formatNumber, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: any) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    products,
    sales,
    purchases,
    expenses,
    receivables,
    payables,
    bankAccounts,
    categories,
    seedStoreData
  } = useStore();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('30days');

  // Today dates
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // 1. Calculations
  const metrics = useMemo(() => {
    // Sales Today
    const todaySales = sales.filter((s) => s.createdAt.startsWith(todayStr));
    const todayOmzet = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

    // Sales Month
    const monthSales = sales.filter((s) => s.createdAt.startsWith(currentMonthStr));
    const monthOmzet = monthSales.reduce((acc, s) => acc + s.grandTotal, 0);

    // Estimated Gross Profit (Total Sales GrandTotal - Total Sales HPP)
    let totalHPP = 0;
    sales.forEach((s) => {
      s.items.forEach((item) => {
        totalHPP += (item.purchasePrice || 0) * item.quantity;
      });
    });
    const totalSalesRevenue = sales.reduce((acc, s) => acc + s.grandTotal, 0);
    const estimatedGrossProfit = Math.max(0, totalSalesRevenue - totalHPP);

    // Total Expenses
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // Cash and Bank Balance
    const totalCashBank = bankAccounts.reduce((acc, b) => acc + (b.balance || 0), 0);

    // Total Receivables (Piutang)
    const totalReceivables = receivables
      .filter((r) => r.status !== 'paid')
      .reduce((acc, r) => acc + (r.remainingAmount || 0), 0);

    // Total Payables (Utang)
    const totalPayables = payables
      .filter((p) => p.status !== 'paid')
      .reduce((acc, p) => acc + (p.remainingAmount || 0), 0);

    // Total Inventory Value (Stok * Harga Beli)
    const totalInventoryValue = products.reduce(
      (acc, p) => acc + (p.isActive ? p.stock * p.purchasePrice : 0),
      0
    );

    // Low stock products
    const lowStockProducts = products.filter((p) => p.isActive && p.stock <= p.minStock);

    return {
      todayOmzet,
      todaySalesCount: todaySales.length,
      monthOmzet,
      totalSalesRevenue,
      estimatedGrossProfit,
      totalTransactions: sales.length,
      totalExpenses,
      totalCashBank,
      totalReceivables,
      totalPayables,
      totalInventoryValue,
      lowStockProducts,
    };
  }, [sales, expenses, bankAccounts, receivables, payables, products, todayStr, currentMonthStr]);

  // 2. Chart Data: Sales Trend (last 7 or 14 days)
  const salesTrendData = useMemo(() => {
    const map = new Map<string, { date: string; omzet: number; transaksi: number }>();
    
    // Default last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      map.set(key, { date: key, omzet: 0, transaksi: 0 });
    }

    sales.forEach((s) => {
      const key = s.createdAt.slice(5, 10);
      if (map.has(key)) {
        const entry = map.get(key)!;
        entry.omzet += s.grandTotal;
        entry.transaksi += 1;
      }
    });

    return Array.from(map.values());
  }, [sales]);

  // 3. Category Breakdown Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    sales.forEach((s) => {
      s.items.forEach((item) => {
        // find product to get category
        const prod = products.find((p) => p.id === item.productId);
        const catName = prod?.categoryName || 'Material Lainnya';
        catMap[catName] = (catMap[catName] || 0) + item.subtotal;
      });
    });

    const result = Object.entries(catMap).map(([name, value]) => ({
      name,
      value,
    }));

    // If no sales yet, show inventory by category
    if (result.length === 0) {
      const invCatMap: Record<string, number> = {};
      products.forEach((p) => {
        invCatMap[p.categoryName] = (invCatMap[p.categoryName] || 0) + p.stock * p.purchasePrice;
      });
      return Object.entries(invCatMap).map(([name, value]) => ({
        name,
        value,
      }));
    }

    return result.slice(0, 5);
  }, [sales, products]);

  // 4. Due Receivables & Payables
  const dueItems = useMemo(() => {
    const list: { type: 'piutang' | 'utang'; name: string; amount: number; dueDate: string }[] = [];
    receivables
      .filter((r) => r.status !== 'paid')
      .slice(0, 4)
      .forEach((r) => {
        list.push({
          type: 'piutang',
          name: `${r.customerName} (#${r.invoiceNumber})`,
          amount: r.remainingAmount,
          dueDate: r.dueDate,
        });
      });

    payables
      .filter((p) => p.status !== 'paid')
      .slice(0, 4)
      .forEach((p) => {
        list.push({
          type: 'utang',
          name: `${p.supplierName} (#${p.purchaseInvoice})`,
          amount: p.remainingAmount,
          dueDate: p.dueDate,
        });
      });

    return list;
  }, [receivables, payables]);

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner / Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Dashboard Operasional
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Sistem Aktif
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Ringkasan data transaksi kasir, inventaris gudang material, dan keuangan toko real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button
              onClick={seedStoreData}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Inisialisasi Data Demo
            </button>
          )}

          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === 'today' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateFilter('30days')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                dateFilter === '30days' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (9 Metrik Utama) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* 1. Omzet Hari Ini */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Omzet Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatRupiah(metrics.todayOmzet)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{metrics.todaySalesCount} transaksi</span>
            <span>berhasil selesai hari ini</span>
          </div>
        </div>

        {/* 2. Omzet Bulan Ini */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Omzet Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatRupiah(metrics.monthOmzet)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-slate-300">Total kumulatif bulan berjalan</span>
          </div>
        </div>

        {/* 3. Estimasi Laba Kotor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimasi Laba Kotor</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatRupiah(metrics.estimatedGrossProfit)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>Omzet dikurangi HPP (Modal)</span>
          </div>
        </div>

        {/* 4. Nilai Persediaan Stok (Aset) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Nilai Aset Persediaan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 tracking-tight">
            {formatRupiah(metrics.totalInventoryValue)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{products.length} SKU Barang Aktif</span>
            <button
              onClick={() => onNavigate('products')}
              className="text-amber-400 hover:underline text-[11px] font-medium"
            >
              Lihat Stok &rarr;
            </button>
          </div>
        </div>

        {/* 5. Saldo Kas & Bank */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo Kas & Bank</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-300 tracking-tight">
            {formatRupiah(metrics.totalCashBank)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>{bankAccounts.length} Rekening / Kas Tunai</span>
          </div>
        </div>

        {/* 6. Total Piutang Pelanggan */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Piutang Pelanggan</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatRupiah(metrics.totalReceivables)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Kredit Penjualan Tempo</span>
            <button
              onClick={() => onNavigate('customers')}
              className="text-blue-400 hover:underline text-[11px] font-medium"
            >
              Rincian &rarr;
            </button>
          </div>
        </div>

        {/* 7. Total Utang Supplier */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Hutang ke Supplier</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-300 tracking-tight">
            {formatRupiah(metrics.totalPayables)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Faktur Pembelian Tempo</span>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-rose-400 hover:underline text-[11px] font-medium"
            >
              Bayar Hutang &rarr;
            </button>
          </div>
        </div>

        {/* 8. Total Biaya Operasional */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Beban Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-200 tracking-tight">
            {formatRupiah(metrics.totalExpenses)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span>BBM Armada, Listrik, Gaji dll.</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7 Days Sales Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Tren Omzet Penjualan (7 Hari Terakhir)</h3>
              <p className="text-xs text-slate-400">Statistik performa penjualan harian kasir</p>
            </div>
            <button
              onClick={() => onNavigate('pos')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Buka Kasir POS
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrendData}>
                <defs>
                  <linearGradient id="omzetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: any) => [formatRupiah(Number(val)), 'Omzet']}
                  labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="omzet"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#omzetGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Distribusi Nilai Kategori</h3>
            <p className="text-xs text-slate-400 mb-4">Komposisi penjualan & stok material</p>
            
            <div className="h-52 w-full flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), 'Nilai']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500">Belum ada data kategori</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {categoryData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-300 truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-200">{formatRupiah(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Alert & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Low Stock Products Warning */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Peringatan Stok Minimum</h3>
                <p className="text-xs text-slate-400">Barang yang hampir habis dan perlu segera di-restock</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-semibold text-blue-400 hover:underline"
            >
              Order Pembelian &rarr;
            </button>
          </div>

          {metrics.lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800/80">
              Semua stok produk saat ini aman di atas batas minimum.
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.lowStockProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{prod.name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      SKU: {prod.sku} • Supplier: {prod.supplierName || 'Distributor'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Sisa: {prod.stock} {prod.unit}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Min: {prod.minStock} {prod.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Recent POS Sales Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Transaksi Kasir Terbaru</h3>
                <p className="text-xs text-slate-400">Riwayat penjualan langsung di meja kasir</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-400 hover:underline"
            >
              Semua Laporan &rarr;
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-slate-800/80">
              Belum ada transaksi penjualan kasir.
            </div>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        #{sale.invoiceNumber}
                      </span>
                      <span className="text-xs text-slate-300 font-medium truncate">
                        {sale.customerName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{formatDate(sale.createdAt)}</span>
                      <span>•</span>
                      <span>Kasir: {sale.cashierName}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold text-white">
                      {formatRupiah(sale.grandTotal)}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase mt-0.5 ${
                        sale.paymentMethod === 'cash'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : sale.paymentMethod === 'credit_tempo'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {sale.paymentMethod === 'credit_tempo' ? 'Tempo (Kredit)' : sale.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
