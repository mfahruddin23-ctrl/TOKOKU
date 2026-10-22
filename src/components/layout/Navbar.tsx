import React, { useState } from 'react';
import {
  Store,
  Clock,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface NavbarProps {
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenShiftModal, onOpenCloseShiftModal }) => {
  const { userProfile, switchRole, currentUser, loginWithGoogle, logout } = useAuth();
  const { activeCashSession, seedStoreData, products, settings } = useStore();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const rolesList: { role: UserRole; label: string; desc: string }[] = [
    { role: 'owner', label: 'Owner (Pemilik Toko)', desc: 'Akses penuh seluruh fitur & laporan rahasia' },
    { role: 'admin', label: 'Admin Toko', desc: 'Kelola data master, stok, pembelian, dan sistem' },
    { role: 'manager', label: 'Manajer Operasional', desc: 'Supervisi operasional harian & persetujuan' },
    { role: 'cashier', label: 'Kasir POS', desc: 'Melayani penjualan, transaksi kasir, dan struk' },
    { role: 'warehouse', label: 'Kepala Gudang', desc: 'Mutasi stok, penerimaan barang, dan opname' },
    { role: 'finance', label: 'Staf Keuangan', desc: 'Buku kas, hutang piutang, dan pengeluaran' },
  ];

  const handleSeed = async () => {
    if (confirm('Inisialisasi data sampel material (Semen, Besi SNI, Cat, Pipa, Pasir, dll)? Data master akan diisi dengan data realistis.')) {
      setIsSeeding(true);
      try {
        await seedStoreData();
      } finally {
        setIsSeeding(false);
      }
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-slate-100 flex items-center justify-between px-4 sm:px-6 z-20 sticky top-0 no-print">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-xl tracking-wider">
          RJ
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              {settings.storeName}
            </h1>
            <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full uppercase tracking-wider">
              Firebase ERP
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
            {settings.branchName}
          </p>
        </div>
      </div>

      {/* Center / Right Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Seed Demo Button if empty or requested */}
        <button
          onClick={handleSeed}
          disabled={isSeeding}
          title="Isi data sampel toko material ke Firestore"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{isSeeding ? 'Memuat Data...' : products.length === 0 ? 'Inisialisasi Data Toko' : 'Muat Contoh Data'}</span>
        </button>

        {/* Shift Cashier Status */}
        {activeCashSession ? (
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 rounded-lg px-2.5 py-1 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="hidden sm:block">
              <span className="text-emerald-400 font-medium">Shift Aktif: </span>
              <span className="text-slate-300">{activeCashSession.cashierName}</span>
            </div>
            <button
              onClick={onOpenCloseShiftModal}
              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-medium text-[11px] transition-colors"
            >
              Tutup Shift
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Buka Shift Kasir</span>
          </button>
        )}

        {/* Role Switcher & Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold text-xs uppercase">
              {userProfile.role.slice(0, 2)}
            </div>
            <div className="text-left hidden md:block">
              <div className="font-semibold text-white leading-tight text-xs flex items-center gap-1">
                {userProfile.displayName}
                <ShieldCheck className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                Role: <span className="text-blue-300 font-bold">{userProfile.role}</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Role Dropdown Menu */}
          {roleMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              onClick={() => setRoleMenuOpen(false)}
            >
              <div className="px-3 py-2 border-b border-slate-800">
                <p className="text-xs text-slate-400">Pengguna Aktif</p>
                <p className="text-sm font-semibold text-white">{userProfile.displayName}</p>
                <p className="text-[11px] text-blue-400 font-mono mt-0.5">Role: {userProfile.role.toUpperCase()}</p>
              </div>

              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulasi / Ganti Role (Testing):
              </div>

              <div className="max-h-56 overflow-y-auto">
                {rolesList.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => switchRole(item.role)}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors ${
                      userProfile.role === item.role
                        ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500 font-medium'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-800 mt-1 px-2">
                {currentUser ? (
                  <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Keluar (Sign Out)
                  </button>
                ) : (
                  <button
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Login dengan Google
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
