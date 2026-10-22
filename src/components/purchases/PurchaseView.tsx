import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Building,
  CreditCard,
  ArrowRight,
  PackageCheck,
  Eye,
  Trash2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Purchase, PurchaseItem, Supplier, Payable } from '../../types';
import { formatRupiah, formatNumber, formatDate, generateInvoiceNumber } from '../../utils/formatters';

export const PurchaseView: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    payables,
    createPurchase,
    receivePurchase,
    payPayable,
    saveSupplier
  } = useStore();

  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers' | 'payables'>('purchases');
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Modal
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState<'paid' | 'credit'>('paid');
  const [purchaseDueDate, setPurchaseDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [purchaseInitialStatus, setPurchaseInitialStatus] = useState<'ordered' | 'received'>('received');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');

  // Selected Product to add to invoice
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);

  // New Supplier Modal
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({});

  // Pay Payable Modal
  const [activePayable, setActivePayable] = useState<Payable | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('transfer');
  const [payNotes, setPayNotes] = useState<string>('');

  // Detail Purchase Modal
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);

  // Total invoice sum
  const purchaseTotal = useMemo(() => {
    return purchaseItems.reduce((acc, item) => acc + item.subtotal, 0);
  }, [purchaseItems]);

  // Add Item to Purchase form
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existingIdx = purchaseItems.findIndex((it) => it.productId === selectedProductId);
    if (existingIdx >= 0) {
      const updated = [...purchaseItems];
      updated[existingIdx].quantity += itemQty;
      updated[existingIdx].purchasePrice = itemPrice;
      updated[existingIdx].subtotal = updated[existingIdx].quantity * itemPrice;
      setPurchaseItems(updated);
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          quantity: itemQty,
          purchasePrice: itemPrice,
          subtotal: itemQty * itemPrice,
        },
      ]);
    }

    setSelectedProductId('');
    setItemQty(1);
    setItemPrice(0);
  };

  // Remove Item
  const handleRemoveItem = (productId: string) => {
    setPurchaseItems(purchaseItems.filter((i) => i.productId !== productId));
  };

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Pilih supplier terlebih dahulu!');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Tambahkan minimal 1 barang material yang dibeli!');
      return;
    }

    const supObj = suppliers.find((s) => s.id === selectedSupplierId);

    const invoiceNumber = generateInvoiceNumber('PO');
    await createPurchase({
      invoiceNumber,
      supplierInvoiceNumber: supplierInvoiceNumber || undefined,
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      supplierName: supObj?.name || 'Distributor Material',
      items: purchaseItems,
      totalAmount: purchaseTotal,
      paidAmount: purchasePaymentStatus === 'paid' ? purchaseTotal : 0,
      remainingAmount: purchasePaymentStatus === 'credit' ? purchaseTotal : 0,
      status: purchaseInitialStatus,
      paymentStatus: purchasePaymentStatus,
      dueDate: purchasePaymentStatus === 'credit' ? purchaseDueDate : undefined,
      notes: purchaseNotes,
    });

    setIsNewPurchaseOpen(false);
    setPurchaseItems([]);
    setSelectedSupplierId('');
    setSupplierInvoiceNumber('');
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierFormData.name) return;
    await saveSupplier(supplierFormData);
    setIsNewSupplierOpen(false);
    setSupplierFormData({});
  };

  // Pay Payable
  const handleProcessPayable = async () => {
    if (!activePayable || payAmount <= 0) return;
    await payPayable(activePayable.id, payAmount, paymentMethod, payNotes);
    setActivePayable(null);
    setPayAmount(0);
    setPayNotes('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pembelian Material & Hutang Supplier
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Input faktur pengadaan, penerimaan stok gudang, dan manajemen pelunasan hutang distributor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSupplierFormData({});
              setIsNewSupplierOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>Tambah Supplier</span>
          </button>

          <button
            onClick={() => {
              setPurchaseItems([]);
              setSelectedSupplierId(suppliers[0]?.id || '');
              setIsNewPurchaseOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Input Faktur Pembelian (PO)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'purchases'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Riwayat Pembelian & Faktur ({purchases.length})
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'payables'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Hutang Supplier ({payables.filter((p) => p.status !== 'paid').length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Daftar Supplier ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PURCHASES TABLE */}
      {activeTab === 'purchases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. PO / Tanggal</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Total Item</th>
                  <th className="py-3 px-4 text-right">Nilai Pembelian</th>
                  <th className="py-3 px-4 text-center">Status Barang</th>
                  <th className="py-3 px-4 text-center">Pembayaran</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Belum ada data transaksi pembelian dari supplier.
                    </td>
                  </tr>
                ) : (
                  purchases.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">#{po.invoiceNumber}</div>
                        {po.supplierInvoiceNumber && (
                          <div className="text-[10px] text-slate-400">
                            Faktur Pabrik: {po.supplierInvoiceNumber}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(po.createdAt)}</div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {po.supplierName}
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-300 font-mono">
                          {po.items.length} macam barang
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        {formatRupiah(po.totalAmount)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {po.status === 'received' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Diterima di Gudang
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Dipesan (Ordered)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            po.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {po.paymentStatus === 'paid' ? 'Lunas' : 'Tempo (Hutang)'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {po.status !== 'received' && (
                            <button
                              onClick={() => {
                                if (confirm(`Konfirmasi penerimaan barang untuk PO #${po.invoiceNumber}? Stok gudang akan bertambah.`)) {
                                  receivePurchase(po.id);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow"
                            >
                              Terima Barang
                            </button>
                          )}

                          <button
                            onClick={() => setViewingPurchase(po)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Rincian Faktur"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYABLES (HUTANG SUPPLIER) */}
      {activeTab === 'payables' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">No. Faktur Pembelian</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                  <th className="py-3 px-4 text-right">Sisa Hutang</th>
                  <th className="py-3 px-4 text-center">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {payables.filter((p) => p.status !== 'paid').length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-emerald-400">
                      Semua hutang ke supplier lunas! Tidak ada tagihan tertunda.
                    </td>
                  </tr>
                ) : (
                  payables
                    .filter((p) => p.status !== 'paid')
                    .map((pay) => (
                      <tr key={pay.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">
                          {pay.supplierName}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          #{pay.purchaseInvoice}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatRupiah(pay.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          {formatRupiah(pay.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-300">
                          {formatRupiah(pay.remainingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {formatDate(pay.dueDate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setActivePayable(pay);
                              setPayAmount(pay.remainingAmount);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                          >
                            Bayar Hutang
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS LIST */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <h4 className="font-bold text-white text-sm">{sup.name}</h4>
                <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                  <p>Kontak: {sup.contactPerson || '-'}</p>
                  <p>Telepon: {sup.phone || '-'}</p>
                  <p className="truncate">Alamat: {sup.address || '-'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Total Hutang Berjalan:</span>
                  <div
                    className={`text-sm font-bold ${
                      sup.currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatRupiah(sup.currentDebt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: INPUT PURCHASE (FAKTUR PEMBELIAN BARU) */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Input Faktur Pembelian (PO Baru)</h3>
              <button
                onClick={() => setIsNewPurchaseOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Supplier & Ref Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Supplier / Distributor *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nomor Faktur Pabrik / Surat Jalan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-PBR-88992"
                    value={supplierInvoiceNumber}
                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Add Items Subform */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  Tambah Barang Ke Faktur:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedProductId(pid);
                        const prod = products.find((p) => p.id === pid);
                        if (prod) {
                          setItemPrice(prod.purchasePrice);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">Pilih Barang Material...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={itemQty || ''}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Harga Beli"
                      value={itemPrice || ''}
                      onChange={(e) => setItemPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1 mt-2">
                  {purchaseItems.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 text-xs"
                    >
                      <span className="font-semibold text-white">
                        {item.productName} ({item.quantity} {item.unit})
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-emerald-400">
                          {formatRupiah(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status and Terms */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status Barang
                  </label>
                  <select
                    value={purchaseInitialStatus}
                    onChange={(e) => setPurchaseInitialStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="received">Langsung Diterima (Stok Masuk)</option>
                    <option value="ordered">Dipesan (Stok Belum Masuk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    value={purchasePaymentStatus}
                    onChange={(e) => setPurchasePaymentStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="paid">Lunas Langsung</option>
                    <option value="credit">Tempo / Hutang Dagang</option>
                  </select>
                </div>

                {purchasePaymentStatus === 'credit' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jatuh Tempo Hutang
                    </label>
                    <input
                      type="date"
                      value={purchaseDueDate}
                      onChange={(e) => setPurchaseDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Total Faktur:</span>
                  <div className="text-xl font-bold text-white">{formatRupiah(purchaseTotal)}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewPurchaseOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Simpan Faktur Pembelian
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAYAR HUTANG SUPPLIER */}
      {activePayable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Pelunasan Hutang Supplier</h3>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-xs text-slate-400">Supplier: <span className="font-semibold text-white">{activePayable.supplierName}</span></p>
              <p className="text-xs text-slate-400">No Faktur: <span className="font-mono text-white">#{activePayable.purchaseInvoice}</span></p>
              <p className="text-xs text-slate-400">Sisa Hutang: <span className="font-bold text-rose-400 font-mono">{formatRupiah(activePayable.remainingAmount)}</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nominal Pembayaran (Rp)
              </label>
              <input
                type="number"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="transfer">Transfer Bank (BCA / Mandiri)</option>
                <option value="cash">Tunai (Kas Toko)</option>
                <option value="giro">Giro / Cek</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePayable(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessPayable}
                disabled={payAmount <= 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Konfirmasi Pelunasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL PO VIEW */}
      {viewingPurchase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Rincian Faktur PO #{viewingPurchase.invoiceNumber}</h3>
                <p className="text-xs text-slate-400">Supplier: {viewingPurchase.supplierName}</p>
              </div>
              <button onClick={() => setViewingPurchase(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {viewingPurchase.items.map((it, idx) => (
                <div key={idx} className="flex justify-between p-2 rounded bg-slate-950 text-xs">
                  <div>
                    <p className="font-semibold text-white">{it.productName}</p>
                    <p className="text-[10px] text-slate-400">{it.quantity} {it.unit} x {formatRupiah(it.purchasePrice)}</p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">{formatRupiah(it.subtotal)}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">TOTAL FAKTUR:</span>
              <span className="text-base font-black text-white">{formatRupiah(viewingPurchase.totalAmount)}</span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
