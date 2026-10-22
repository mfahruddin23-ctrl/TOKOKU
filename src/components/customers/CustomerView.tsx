import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Phone,
  Printer,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Receivable, ReceivablePayment } from '../../types';
import { formatRupiah, formatNumber, formatDate, calculateAgingCategory } from '../../utils/formatters';

export const CustomerView: React.FC = () => {
  const { customers, receivables, payReceivable, saveCustomer, settings } = useStore();

  const [activeTab, setActiveTab] = useState<'receivables' | 'customers'>('receivables');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Pay Receivable Modal
  const [activeReceivable, setActiveReceivable] = useState<Receivable | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payNotes, setPayNotes] = useState<string>('');

  // Payment Receipt Modal
  const [printedReceipt, setPrintedReceipt] = useState<{
    customerName: string;
    invoiceNumber: string;
    amount: number;
    date: string;
  } | null>(null);

  // Aging Summary
  const agingSummary = useMemo(() => {
    let current = 0;
    let b1_30 = 0;
    let b31_60 = 0;
    let b61_90 = 0;
    let bOver90 = 0;

    receivables
      .filter((r) => r.status !== 'paid')
      .forEach((r) => {
        const cat = calculateAgingCategory(r.dueDate);
        if (cat === 'current') current += r.remainingAmount;
        else if (cat === '1-30') b1_30 += r.remainingAmount;
        else if (cat === '31-60') b31_60 += r.remainingAmount;
        else if (cat === '61-90') b61_90 += r.remainingAmount;
        else bOver90 += r.remainingAmount;
      });

    return {
      current,
      b1_30,
      b31_60,
      b61_90,
      bOver90,
      total: current + b1_30 + b31_60 + b61_90 + bOver90,
    };
  }, [receivables]);

  // Handle Save Customer
  const handleSaveCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name) return;
    await saveCustomer(editingCustomer);
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  // Process Receivable Payment
  const handleProcessPayment = async () => {
    if (!activeReceivable || payAmount <= 0) return;
    await payReceivable(activeReceivable.id, payAmount, payMethod, payNotes);

    setPrintedReceipt({
      customerName: activeReceivable.customerName,
      invoiceNumber: activeReceivable.invoiceNumber,
      amount: payAmount,
      date: new Date().toISOString(),
    });

    setActiveReceivable(null);
    setPayAmount(0);
    setPayNotes('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Pelanggan & Piutang Usaha
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manajemen batas plafon kredit kontraktor, buku piutang tempo, dan kuitansi pelunasan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCustomer({
                name: '',
                phone: '',
                creditLimit: 25000000,
                currentDebt: 0,
              });
              setIsCustomerModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pelanggan Baru</span>
          </button>
        </div>
      </div>

      {/* Aging Analysis Cards (Umur Piutang 1-30, 31-60, 61-90, >90 hari) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Belum Jatuh Tempo</span>
          <div className="text-base font-bold text-white mt-0.5">{formatRupiah(agingSummary.current)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-amber-400 uppercase">Terlambat 1 - 30 Hari</span>
          <div className="text-base font-bold text-amber-300 mt-0.5">{formatRupiah(agingSummary.b1_30)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-orange-400 uppercase">Terlambat 31 - 60 Hari</span>
          <div className="text-base font-bold text-orange-300 mt-0.5">{formatRupiah(agingSummary.b31_60)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-rose-400 uppercase">Terlambat 61 - 90 Hari</span>
          <div className="text-base font-bold text-rose-300 mt-0.5">{formatRupiah(agingSummary.b61_90)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-semibold text-rose-500 uppercase">Kritis &gt; 90 Hari</span>
          <div className="text-base font-bold text-rose-400 mt-0.5">{formatRupiah(agingSummary.bOver90)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('receivables')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'receivables'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Daftar Piutang Tagihan ({receivables.filter((r) => r.status !== 'paid').length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'customers'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Data Master Pelanggan ({customers.length})
        </button>
      </div>

      {/* TAB 1: RECEIVABLES LIST */}
      {activeTab === 'receivables' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nama Pelanggan</th>
                  <th className="py-3 px-4">No. Faktur Penjualan</th>
                  <th className="py-3 px-4 text-right">Total Piutang</th>
                  <th className="py-3 px-4 text-right">Sudah Dibayar</th>
                  <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                  <th className="py-3 px-4 text-center">Jatuh Tempo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {receivables.filter((r) => r.status !== 'paid').length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-emerald-400">
                      Tidak ada piutang jatuh tempo atau tertunda. Semua pembayaran lunas!
                    </td>
                  </tr>
                ) : (
                  receivables
                    .filter((r) => r.status !== 'paid')
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">
                          {rec.customerName}
                        </td>
                        <td className="py-3 px-4 font-mono text-blue-400">
                          #{rec.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {formatRupiah(rec.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400">
                          {formatRupiah(rec.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatRupiah(rec.remainingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {formatDate(rec.dueDate)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.status === 'partial'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {rec.status === 'partial' ? 'Cicilan' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setActiveReceivable(rec);
                              setPayAmount(rec.remainingAmount);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25"
                          >
                            Terima Pelunasan
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

      {/* TAB 2: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{c.name}</h4>
                  {c.creditLimit > 0 && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                      Limit: {formatRupiah(c.creditLimit)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.phone || '-'}</span>
                  </p>
                  <p className="truncate text-slate-500">{c.address || 'Alamat belum diatur'}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Hutang Berjalan:</span>
                  <div
                    className={`text-sm font-bold ${
                      c.currentDebt > 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
                    {formatRupiah(c.currentDebt)}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCustomer(c);
                    setIsCustomerModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      {isCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingCustomer.id ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
            </h3>

            <form onSubmit={handleSaveCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Pelanggan / Toko / Kontraktor *
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alamat / Lokasi Proyek
                </label>
                <textarea
                  rows={2}
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plafon Kredit Maksimal (Rp)
                </label>
                <input
                  type="number"
                  value={editingCustomer.creditLimit || 0}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, creditLimit: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECEIVE PAYMENT */}
      {activeReceivable && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Penerimaan Pembayaran Piutang</h3>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-xs text-slate-400">Pelanggan: <span className="font-semibold text-white">{activeReceivable.customerName}</span></p>
              <p className="text-xs text-slate-400">Faktur Penjualan: <span className="font-mono text-white">#{activeReceivable.invoiceNumber}</span></p>
              <p className="text-xs text-slate-400">Sisa Tagihan: <span className="font-bold text-rose-400 font-mono">{formatRupiah(activeReceivable.remainingAmount)}</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nominal Yang Diterima (Rp)
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
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="cash">Tunai (Masuk Kas Kasir)</option>
                <option value="transfer">Transfer Bank (BCA / Mandiri)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveReceivable(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={payAmount <= 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KUITANSI TANDA TERIMA PEMBAYARAN */}
      {printedReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Kuitansi Tanda Terima Pembayaran</span>
            </h3>

            <div className="bg-white text-black p-4 rounded-xl border border-gray-300 font-mono text-xs space-y-2">
              <div className="text-center pb-2 border-b border-black">
                <h4 className="font-bold text-sm">{settings.storeName}</h4>
                <p className="text-[10px]">{settings.address}</p>
                <p className="font-bold text-xs mt-1">KUITANSI TANDA TERIMA PIUTANG</p>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Telah Terima Dari:</span>
                  <span className="font-bold">{printedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Untuk Pembayaran:</span>
                  <span>Faktur #{printedReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{formatDate(printedReceipt.date)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-dashed border-gray-400">
                  <span>Jumlah Uang:</span>
                  <span className="text-blue-800">{formatRupiah(printedReceipt.amount)}</span>
                </div>
              </div>

              <div className="text-right pt-6 pr-4">
                <p className="text-[10px]">Tanda Tangan Penerima,</p>
                <div className="h-8"></div>
                <p className="font-bold underline text-xs">Kasir Toko Razka Jaya</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPrintedReceipt(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Selesai
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kuitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
