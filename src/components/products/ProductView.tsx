import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  Barcode,
  History,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, StockMovement } from '../../types';
import { formatRupiah, formatNumber, formatDate, exportToExcel } from '../../utils/formatters';

export const ProductView: React.FC = () => {
  const { products, categories, suppliers, warehouses, stockMovements, saveProduct, deleteProduct, adjustStock } = useStore();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  // Product Form Modal (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Kartu Stok (Stock History Modal)
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  // Barcode Print Modal
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  // Quick Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Penyesuaian Fisik Toko');

  // Material Units Options
  const standardUnits = [
    'Sak',
    'Batang',
    'Meter',
    'Lembar',
    'Dus',
    'M3',
    'Truk',
    'Pail',
    'Kaleng',
    'Roll',
    'Kg',
    'Pcs',
    'Unit',
  ];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);

      let matchesStock = true;
      if (stockStatusFilter === 'low') matchesStock = p.stock <= p.minStock && p.stock > 0;
      if (stockStatusFilter === 'out') matchesStock = p.stock <= 0;

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [products, selectedCategory, searchQuery, stockStatusFilter]);

  // Product stock history for Kartu Stok modal
  const productMovements = useMemo(() => {
    if (!historyProduct) return [];
    return stockMovements.filter((m) => m.productId === historyProduct.id);
  }, [historyProduct, stockMovements]);

  // Handle Save
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.unit) {
      alert('Nama barang dan satuan wajib diisi!');
      return;
    }

    const catObj = categories.find((c) => c.id === editingProduct.categoryId);
    const supObj = suppliers.find((s) => s.id === editingProduct.supplierId);

    await saveProduct({
      ...editingProduct,
      categoryName: catObj?.name || 'Semen & Mortar',
      supplierName: supObj?.name || '',
    });

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredProducts.map((p, idx) => ({
      No: idx + 1,
      SKU: p.sku,
      Barcode: p.barcode,
      'Nama Barang': p.name,
      Kategori: p.categoryName,
      Satuan: p.unit,
      'Harga Beli': p.purchasePrice,
      'Harga Jual Eceran': p.sellingPrice,
      'Harga Grosir': p.wholesalePrice,
      'Min Qty Grosir': p.minWholesaleQty || 10,
      'Stok Sekarang': p.stock,
      'Min Stok': p.minStock,
      'Nilai Persediaan': p.stock * p.purchasePrice,
      Supplier: p.supplierName || '-',
    }));

    exportToExcel(exportData, `Katalog_Barang_Razka_Jaya_${new Date().toISOString().slice(0, 10)}`);
  };

  // Quick Stock Adjustment Submit
  const handleQuickAdjust = async () => {
    if (!adjustingProduct || adjustQty === 0) return;
    await adjustStock(adjustingProduct.id, adjustQty, adjustReason);
    setAdjustingProduct(null);
    setAdjustQty(0);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Master Katalog Barang Material
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
              {products.length} SKU
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Kelola data satuan material, harga beli modal, harga grosir, dan audit stok.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => {
              setEditingProduct({
                sku: `MAT-${Date.now().toString().slice(-5)}`,
                barcode: `${Math.floor(899000000000 + Math.random() * 1000000000)}`,
                unit: 'Sak',
                categoryId: categories[0]?.id || 'cat_semen',
                purchasePrice: 0,
                sellingPrice: 0,
                wholesalePrice: 0,
                minWholesaleQty: 10,
                stock: 0,
                minStock: 5,
                isActive: true,
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan Nama Barang, SKU, atau Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div>
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Semua Status Stok</option>
            <option value="low">Stok Minimum (Kritis)</option>
            <option value="out">Stok Habis (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Info Barang / SKU</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4 text-right">Harga Modal (Beli)</th>
                <th className="py-3.5 px-4 text-right">Harga Eceran</th>
                <th className="py-3.5 px-4 text-right">Harga Grosir</th>
                <th className="py-3.5 px-4 text-center">Stok</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Tidak ditemukan data barang yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStock && p.stock > 0;
                  const isOut = p.stock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name, SKU & Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>SKU: {p.sku}</span>
                          <span>•</span>
                          <span>Barcode: {p.barcode}</span>
                        </div>
                      </td>

                      {/* Category & Unit */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium">
                          {p.categoryName}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">Satuan: {p.unit}</div>
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {formatRupiah(p.purchasePrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {formatRupiah(p.sellingPrice)}
                      </td>

                      {/* Wholesale Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {p.wholesalePrice > 0 ? (
                          <>
                            <div>{formatRupiah(p.wholesalePrice)}</div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              &ge;{p.minWholesaleQty || 10} {p.unit}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Stock Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Min: {p.minStock}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Stock Card Button */}
                          <button
                            onClick={() => setHistoryProduct(p)}
                            title="Kartu Stok (Riwayat Mutasi)"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Adjust */}
                          <button
                            onClick={() => {
                              setAdjustingProduct(p);
                              setAdjustQty(0);
                            }}
                            title="Penyesuaian Stok Cepat"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Barcode Print */}
                          <button
                            onClick={() => setBarcodeProduct(p)}
                            title="Cetak Label Barcode"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsModalOpen(true);
                            }}
                            title="Edit Barang"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Nonaktifkan barang ${p.name}?`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            title="Nonaktifkan"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingProduct.id ? 'Edit Informasi Barang' : 'Tambah Barang Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Barang Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semen Tiga Roda 40 Kg"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU Kode</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Barcode (EAN/UPC)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Material Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Satuan Material *
                  </label>
                  <select
                    value={editingProduct.unit || 'Sak'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {standardUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Modal (Beli)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.purchasePrice || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Harga Jual Eceran
                  </label>
                  <input
                    type="number"
                    value={editingProduct.sellingPrice || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-blue-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Harga Grosir
                  </label>
                  <input
                    type="number"
                    value={editingProduct.wholesalePrice || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, wholesalePrice: Number(e.target.value) })
                    }
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-300"
                  />
                </div>
              </div>

              {/* Stock & Minimum Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Stok Awal
                  </label>
                  <input
                    type="number"
                    value={editingProduct.stock || 0}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batas Stok Minimum
                  </label>
                  <input
                    type="number"
                    value={editingProduct.minStock || 5}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Supplier & Warehouse */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
                  <select
                    value={editingProduct.supplierId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, supplierId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Pilih Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gudang Penyimpanan</label>
                  <select
                    value={editingProduct.warehouseId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, warehouseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                >
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KARTU STOK (Stock Mutation Audit History) */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Kartu Stok (Riwayat Mutasi): {historyProduct.name}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  SKU: {historyProduct.sku} • Stok Fisik Saat Ini: <span className="font-bold text-emerald-400">{historyProduct.stock} {historyProduct.unit}</span>
                </p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {productMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Belum ada catatan mutasi stok untuk produk ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Tipe Mutasi</th>
                      <th className="py-2.5 px-3 text-center">Sebelum</th>
                      <th className="py-2.5 px-3 text-center">Perubahan</th>
                      <th className="py-2.5 px-3 text-center">Saldo Akhir</th>
                      <th className="py-2.5 px-3">Keterangan / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {productMovements.map((m) => {
                      const isPositive = m.type === 'in' || m.quantity > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                            {formatDate(m.createdAt)}
                          </td>
                          <td className="py-2.5 px-3 uppercase font-semibold text-[11px]">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                m.type === 'in'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : m.type === 'out'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {m.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">{m.previousStock}</td>
                          <td
                            className={`py-2.5 px-3 text-center font-mono font-bold ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : `-${Math.abs(m.quantity)}`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                            {m.currentStock}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                            {m.reason || m.referenceId || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINT BARCODE LABEL */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 text-center space-y-4">
            <h3 className="text-sm font-bold text-white">Preview Label Barcode Rak Toko</h3>

            {/* Label Card */}
            <div className="bg-white text-black p-4 rounded-xl border-2 border-black flex flex-col items-center justify-center shadow-lg">
              <div className="font-black text-xs uppercase tracking-tight">RAZKA JAYA MATERIAL</div>
              <div className="font-bold text-xs mt-1 text-center line-clamp-2">
                {barcodeProduct.name}
              </div>
              <div className="my-2 flex flex-col items-center">
                {/* Simulated clean Code128 barcode bars */}
                <div className="flex items-center gap-[2px] h-10 px-2 bg-white">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-full bg-black"
                      style={{ width: `${(i % 3) + 1}px` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[10px] tracking-widest mt-1">
                  {barcodeProduct.barcode}
                </span>
              </div>
              <div className="text-base font-black text-blue-800">
                {formatRupiah(barcodeProduct.sellingPrice)}
              </div>
              <div className="text-[10px] text-gray-500 font-mono">SKU: {barcodeProduct.sku}</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBarcodeProduct(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: QUICK STOCK ADJUSTMENT */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-amber-400" />
              <span>Penyesuaian Stok Cepat</span>
            </h3>

            <div>
              <p className="text-xs text-slate-400 font-mono">Barang: {adjustingProduct.name}</p>
              <p className="text-xs text-slate-400">
                Stok Sistem Saat Ini: <span className="font-bold text-white">{adjustingProduct.stock} {adjustingProduct.unit}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kuantitas Perubahan (+ Masuk / - Keluar)
              </label>
              <input
                type="number"
                placeholder="Contoh: -2 atau +5"
                value={adjustQty || ''}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Stok setelah penyesuaian: <span className="font-bold text-emerald-400">{Math.max(0, adjustingProduct.stock + adjustQty)} {adjustingProduct.unit}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Alasan Penyesuaian</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustingProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleQuickAdjust}
                disabled={adjustQty === 0}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
