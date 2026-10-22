import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Layers,
  Building2,
  DollarSign,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, CashSession, BankAccount } from '../../types';
import { formatRupiah, formatNumber, formatDate, formatDateTime } from '../../utils/formatters';

interface FinanceViewProps {
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ onOpenShiftModal, onOpenCloseShiftModal }) => {
  const {
    sales,
    expenses,
    cashSessions,
    activeCashSession,
    bankAccounts,
    addExpense
  } = useStore();
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'expenses' | 'shifts' | 'accounts' | 'profit_loss'>('expenses');

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('BBM & Armada Pengiriman');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseMethod, setExpenseMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [expenseDesc, setExpenseDesc] = useState('');

  const expenseCategories = [
    'BBM & Armada Pengiriman',
    'Gaji & Upah Tenaga Angkut',
    'Listrik, Air & Internet Toko',
    'Konsumsi & Jamuan Tukang/Sopir',
    'Pemeliharaan Truk & Bangunan',
    'Perlengkapan Toko & ATK',
    'Beban Pajak & Retribusi',
    'Lain-lain',
  ];

  // Profit and Loss calculations
  const pnl = useMemo(() => {
    const totalOmzet = sales.reduce((acc, s) => acc + s.grandTotal, 0);

    let totalHPP = 0;
    sales.forEach((s) => {
      s.items.forEach((item) => {
        totalHPP += (item.purchasePrice || 0) * item.quantity;
      });
    });

    const grossProfit = totalOmzet - totalHPP;
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const marginPercent = totalOmzet > 0 ? ((netProfit / totalOmzet) * 100).toFixed(1) : '0';

    return {
      totalOmzet,
      totalHPP,
      grossProfit,
      totalExpenses,
      netProfit,
      marginPercent,
    };
  }, [sales, expenses]);

  // Handle Submit Expense
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || !expenseDesc.trim()) {
      alert('Nominal dan deskripsi biaya wajib diisi!');
      return;
    }

    await addExpense({
      category: expenseCategory,
      amount: expenseAmount,
      paymentMethod: expenseMethod,
      description: expenseDesc,
      date: new Date().toISOString(),
      approvedBy: userProfile.displayName,
    });

    setIsExpenseModalOpen(false);
    setExpenseAmount(0);
    setExpenseDesc('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Keuangan, Kasir & Laba Rugi
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arus kas kasir shift, pengeluaran biaya operasional toko, dan estimasi laba bersih.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeCashSession ? (
            <button
              onClick={onOpenCloseShiftModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Tutup Shift Kasir</span>
            </button>
          ) : (
            <button
              onClick={onOpenShiftModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Buka Shift Baru</span>
            </button>
          )}

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran (Biaya)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Beban Pengeluaran ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'shifts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Rekap Shift Kasir ({cashSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('profit_loss')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'profit_loss'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Laporan Laba Rugi Sederhana
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Rekening Bank & Kas ({bankAccounts.length})
        </button>
      </div>

      {/* TAB 1: EXPENSES LIST */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Bukti / Tanggal</th>
                  <th className="py-3 px-4">Kategori Biaya</th>
                  <th className="py-3 px-4">Keterangan Pengeluaran</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                  <th className="py-3 px-4">Disetujui Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      Belum ada pencatatan biaya operasional.
                    </td>
                  </tr>
                ) : (
                  expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-white text-xs">#{e.expenseNumber}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatDate(e.date)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold">
                          {e.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-200">
                        {e.description}
                      </td>

                      <td className="py-3 px-4 uppercase text-[11px] font-mono text-slate-400">
                        {e.paymentMethod === 'cash' ? 'Kas Tunai' : 'Transfer Bank'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                        -{formatRupiah(e.amount)}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {e.approvedBy || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CASH SESSIONS (SHIFTS) */}
      {activeTab === 'shifts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Shift / Kasir</th>
                  <th className="py-3 px-4">Waktu Buka / Tutup</th>
                  <th className="py-3 px-4 text-right">Modal Awal</th>
                  <th className="py-3 px-4 text-right">Penjualan Tunai</th>
                  <th className="py-3 px-4 text-right">Pengeluaran Kas</th>
                  <th className="py-3 px-4 text-right">Fisik Kasir</th>
                  <th className="py-3 px-4 text-center">Selisih</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {cashSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      Belum ada sesi shift kasir tercatat.
                    </td>
                  </tr>
                ) : (
                  cashSessions.map((s) => {
                    const diff = s.difference || 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white text-xs">{s.shiftNumber}</div>
                          <div className="text-[11px] text-blue-400 font-semibold">{s.cashierName}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          <div>Mulai: {formatDateTime(s.startTime)}</div>
                          <div>Selesai: {s.endTime ? formatDateTime(s.endTime) : '-'}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          {formatRupiah(s.startingCash)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{formatRupiah(s.totalCashSales || 0)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-rose-400">
                          -{formatRupiah(s.totalExpenses || 0)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {s.actualCash !== undefined ? formatRupiah(s.actualCash) : '-'}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {s.status === 'closed' ? (
                            <span
                              className={
                                diff === 0
                                  ? 'text-emerald-400'
                                  : diff > 0
                                  ? 'text-blue-400'
                                  : 'text-rose-400'
                              }
                            >
                              {diff === 0 ? 'Pas (Rp 0)' : diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.status === 'open'
                                ? 'bg-emerald-500/20 text-emerald-300 animate-pulse'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {s.status === 'open' ? 'Aktif' : 'Ditutup'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROFIT & LOSS STATEMENT */}
      {activeTab === 'profit_loss' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-3xl mx-auto shadow-2xl space-y-6">
          <div className="text-center border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Laporan Estimasi Laba Rugi Toko
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Perhitungan komparasi omzet penjualan terhadap modal pokok (HPP) dan operasional.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            {/* Revenue */}
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="font-bold text-white font-sans text-sm">A. TOTAL PENDAPATAN (OMZET PENJUALAN)</span>
              <span className="text-base font-bold text-white">{formatRupiah(pnl.totalOmzet)}</span>
            </div>

            {/* COGS / HPP */}
            <div className="flex justify-between items-center py-2 text-rose-300">
              <span className="font-sans">B. Harga Pokok Penjualan (HPP Material)</span>
              <span>-{formatRupiah(pnl.totalHPP)}</span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-2.5 bg-slate-950 px-3 rounded-lg border border-slate-800">
              <span className="font-bold text-emerald-400 font-sans text-xs">LABA KOTOR (GROSS PROFIT = A - B)</span>
              <span className="text-emerald-400 font-bold text-sm">{formatRupiah(pnl.grossProfit)}</span>
            </div>

            {/* Operational Expenses */}
            <div className="flex justify-between items-center py-2 text-rose-300">
              <span className="font-sans">C. Total Beban Biaya Operasional Toko</span>
              <span>-{formatRupiah(pnl.totalExpenses)}</span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center py-3 bg-blue-950/40 border border-blue-500/40 px-4 rounded-xl">
              <div>
                <span className="font-bold text-white font-sans text-sm">ESTIMASI LABA BERSIH (NET PROFIT)</span>
                <p className="text-[10px] text-blue-300 font-sans">Margin Keuntungan Bersih: {pnl.marginPercent}%</p>
              </div>
              <span className="text-xl font-black text-emerald-400">{formatRupiah(pnl.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BANK ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{b.bankName}</span>
                  {b.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Kas Utama
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-2">
                  <p>No Rek: {b.accountNumber}</p>
                  <p className="text-[11px] text-slate-500">A/N: {b.accountHolder}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Saldo Aktif:</span>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {formatRupiah(b.balance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Catat Pengeluaran Operasional</h3>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori Pengeluaran
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-rose-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keterangan Pengeluaran *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Bensin Solar Truk Dump pengiriman Pasir ke Proyek Citra"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sumber Dana Pembayaran
                </label>
                <select
                  value={expenseMethod}
                  onChange={(e) => setExpenseMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="cash">Kas Tunai Toko (Potong Shift Aktif)</option>
                  <option value="bank_transfer">Transfer Rekening Bank</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
