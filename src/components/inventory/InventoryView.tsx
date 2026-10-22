import React, { useState, useMemo } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  ArrowUpDown,
  History,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  Building,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { StockMovement, StockOpname, Product } from '../../types';
import { formatRupiah, formatNumber, formatDate, formatDateTime } from '../../utils/formatters';

export const InventoryView: React.FC = () => {
  const { products, warehouses, stockMovements, adjustStock } = useStore();
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'movements' | 'opname' | 'warehouses'>('movements');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stock Opname interactive form
  const [opnameItems, setOpnameItems] = useState<{ [productId: string]: number }>({});
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);
  const [opnameNotes, setOpnameNotes] = useState('Stock Opname Rutin Bulanan');

  // Filtered Stock Movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const matchesType = filterType === 'all' || m.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        (m.sku && m.sku.toLowerCase().includes(q)) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [stockMovements, filterType, searchQuery]);

  // Total Warehouse Inventory Value
  const totalValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.isActive ? p.stock * p.purchasePrice : 0), 0);
  }, [products]);

  // Submit Stock Opname batch adjustment
  const handleApplyStockOpname = async () => {
    const keys = Object.keys(opnameItems);
    if (keys.length === 0) {
      alert('Masukkan minimal 1 perhitungan fisik stok untuk opname!');
      return;
    }

    if (!confirm(`Konfirmasi penyesuaian selisih stok untuk ${keys.length} produk material terpilih?`)) {
      return;
    }

    setIsSubmittingOpname(true);
    try {
      for (const pid of keys) {
        const physical = opnameItems[pid];
        const prod = products.find((p) => p.id === pid);
        if (prod && !isNaN(physical)) {
          const diff = physical - prod.stock;
          if (diff !== 0) {
            await adjustStock(pid, diff, `Opname: Fisik ${physical} vs Sistem ${prod.stock} (${opnameNotes})`, 'opname');
          }
        }
      }
      alert('Stock Opname berhasil disimpan dan stok gudang telah diperbarui.');
      setOpnameItems({});
    } catch (err) {
      console.error('Error applying stock opname:', err);
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Inventaris Gudang & Mutasi Stok
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Riwayat lengkap mutasi keluar masuk material, stock opname fisik, dan audit pergudangan.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Nilai Persediaan</span>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {formatRupiah(totalValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'movements'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Riwayat Mutasi Stok (Audit Trail)
        </button>
        <button
          onClick={() => setActiveTab('opname')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'opname'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Modul Stock Opname
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'warehouses'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Lokasi Gudang & Depo ({warehouses.length})
        </button>
      </div>

      {/* TAB 1: STOCK MOVEMENTS (MUTASI) */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama material, SKU, atau nomor faktur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white"
              />
            </div>

            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300"
              >
                <option value="all">Semua Tipe Mutasi</option>
                <option value="in">Barang Masuk (In)</option>
                <option value="out">Barang Keluar (Out)</option>
                <option value="adjustment">Penyesuaian (Adjustment)</option>
                <option value="opname">Stock Opname</option>
                <option value="damage">Barang Rusak / Hilang</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Nama Produk Material</th>
                    <th className="py-3 px-4 text-center">Tipe</th>
                    <th className="py-3 px-4 text-center">Stok Awal</th>
                    <th className="py-3 px-4 text-center">Perubahan</th>
                    <th className="py-3 px-4 text-center">Stok Akhir</th>
                    <th className="py-3 px-4">Alasan / Referensi</th>
                    <th className="py-3 px-4">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500">
                        Tidak ada catatan mutasi stok yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isPositive = m.type === 'in' || m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                            {formatDateTime(m.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {m.productName}
                            {m.sku && <span className="text-[10px] text-slate-400 font-mono ml-2">({m.sku})</span>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                m.type === 'in'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : m.type === 'out'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : m.type === 'opname'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-400">
                            {m.previousStock} {m.unit}
                          </td>
                          <td
                            className={`py-3 px-4 text-center font-mono font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : `-${Math.abs(m.quantity)}`} {m.unit}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-white">
                            {m.currentStock} {m.unit}
                          </td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                            {m.reason || m.referenceId || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {m.userName || 'Petugas'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK OPNAME */}
      {activeTab === 'opname' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <span>Lembar Kerja Stock Opname Fisik</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cocokkan jumlah barang fisik di rak/gudang dengan saldo sistem.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Catatan Opname..."
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={handleApplyStockOpname}
                disabled={isSubmittingOpname || Object.keys(opnameItems).length === 0}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan Penyesuaian Opname</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Barang Material</th>
                  <th className="py-3 px-4 text-center">Stok Sistem</th>
                  <th className="py-3 px-4 text-center">Hasil Hitung Fisik</th>
                  <th className="py-3 px-4 text-center">Selisih Fisik</th>
                  <th className="py-3 px-4 text-right">Nilai Selisih (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((p) => {
                  const physicalVal = opnameItems[p.id];
                  const hasInput = physicalVal !== undefined && !isNaN(physicalVal);
                  const diff = hasInput ? physicalVal - p.stock : 0;
                  const diffValue = diff * p.purchasePrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SKU: {p.sku} • Satuan: {p.unit}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-300 font-bold">
                        {p.stock} {p.unit}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          placeholder={`${p.stock}`}
                          value={opnameItems[p.id] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : Number(e.target.value);
                            if (val === undefined) {
                              const copy = { ...opnameItems };
                              delete copy[p.id];
                              setOpnameItems(copy);
                            } else {
                              setOpnameItems({ ...opnameItems, [p.id]: val });
                            }
                          }}
                          className="w-24 text-center bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {hasInput ? (
                          <span
                            className={
                              diff > 0
                                ? 'text-emerald-400'
                                : diff < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            {diff > 0 ? `+${diff}` : diff} {p.unit}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {hasInput && diff !== 0 ? (
                          <span className={diff > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {formatRupiah(diffValue)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WAREHOUSES */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((w) => {
            const warehouseProducts = products.filter((p) => p.warehouseId === w.id);
            const whStockTotal = warehouseProducts.reduce((acc, p) => acc + p.stock, 0);
            const whValTotal = warehouseProducts.reduce((acc, p) => acc + p.stock * p.purchasePrice, 0);

            return (
              <div
                key={w.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-400 font-bold">{w.code}</span>
                    {w.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Gudang Utama
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-base text-white mt-1">{w.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{w.address || 'Area Toko'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Jumlah Item:</span>
                    <span className="font-bold text-white">{warehouseProducts.length} Produk</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimasi Nilai Barang:</span>
                    <span className="font-bold text-emerald-400 font-mono">{formatRupiah(whValTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
