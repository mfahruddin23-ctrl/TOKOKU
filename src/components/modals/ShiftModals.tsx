import React, { useState } from 'react';
import { Clock, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatRupiah } from '../../utils/formatters';

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({ isOpen, onClose }) => {
  const { openCashSession } = useStore();
  const [startingCash, setStartingCash] = useState<number>(500000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await openCashSession(startingCash);
      onClose();
    } catch (err) {
      alert('Gagal membuka shift kasir');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2 text-white">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold">Buka Shift Kasir Baru</h3>
        </div>

        <p className="text-xs text-slate-400">
          Masukkan modal kas awal (uang kembalian) yang berada di dalam laci kasir saat ini.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Modal Awal Kasir (Rp) *
            </label>
            <input
              type="number"
              required
              min={0}
              value={startingCash || ''}
              onChange={(e) => setStartingCash(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-emerald-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[200000, 500000, 1000000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setStartingCash(val)}
                className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono text-slate-200"
              >
                {formatRupiah(val)}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
            >
              {isSubmitting ? 'Membuka...' : 'Buka Shift Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({ isOpen, onClose }) => {
  const { activeCashSession, closeCashSession } = useStore();
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Tutup shift kasir selesai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !activeCashSession) return null;

  const expectedCash =
    (activeCashSession.startingCash || 0) +
    (activeCashSession.totalCashSales || 0) -
    (activeCashSession.totalExpenses || 0);

  const diff = actualCash - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await closeCashSession(actualCash, notes);
      onClose();
    } catch (err) {
      alert('Gagal menutup shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2 text-white">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold">Rekapitulasi Tutup Shift Kasir</h3>
        </div>

        {/* Expected calculation breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Modal Awal Kas:</span>
            <span className="font-mono text-white">{formatRupiah(activeCashSession.startingCash)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Penjualan Tunai:</span>
            <span className="font-mono text-emerald-400">+{formatRupiah(activeCashSession.totalCashSales || 0)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Pengeluaran Kas:</span>
            <span className="font-mono text-rose-400">-{formatRupiah(activeCashSession.totalExpenses || 0)}</span>
          </div>
          <div className="flex justify-between font-bold text-white pt-2 border-t border-slate-800">
            <span>Kas Seharusnya di Laci:</span>
            <span className="font-mono text-sm text-emerald-300">{formatRupiah(expectedCash)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Hasil Hitung Fisik Uang di Laci (Rp) *
            </label>
            <input
              type="number"
              required
              min={0}
              placeholder="0"
              value={actualCash || ''}
              onChange={(e) => setActualCash(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-base font-bold text-white font-mono"
            />
          </div>

          {/* Variance Display */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Selisih Kas:</span>
            <span
              className={`font-mono font-bold text-sm ${
                diff === 0
                  ? 'text-emerald-400'
                  : diff > 0
                  ? 'text-blue-400'
                  : 'text-rose-400'
              }`}
            >
              {diff === 0 ? 'Sesuai / Pas (Rp 0)' : diff > 0 ? `Lebih +${formatRupiah(diff)}` : `Kurang ${formatRupiah(diff)}`}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Penutupan Shift
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
            >
              {isSubmitting ? 'Menutup...' : 'Tutup Shift & Rekonsiliasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
