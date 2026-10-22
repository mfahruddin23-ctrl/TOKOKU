import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageSearch,
  Truck,
  Warehouse,
  Users,
  Wallet,
  BarChart3,
  Settings,
  AlertTriangle,
  BadgeAlert
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'purchases'
  | 'inventory'
  | 'customers'
  | 'finance'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { products, payables, receivables } = useStore();
  const { hasPermission } = useAuth();

  // Count items with stock <= minStock
  const lowStockCount = products.filter((p) => p.isActive && p.stock <= p.minStock).length;
  // Count due / unpaid payables
  const unpaidPayableCount = payables.filter((p) => p.status !== 'paid').length;
  // Count active receivables
  const activeReceivableCount = receivables.filter((r) => r.status !== 'paid').length;

  const navItems: {
    id: NavTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
    permission?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard ERP',
      sublabel: 'Ringkasan & Metrik',
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: 'Kasir POS',
      sublabel: 'Penjualan & Struk',
      icon: ShoppingCart,
      permission: 'pos_access',
    },
    {
      id: 'products',
      label: 'Master Barang',
      sublabel: 'Katalog & Harga',
      icon: PackageSearch,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      permission: 'products_edit',
    },
    {
      id: 'purchases',
      label: 'Pembelian & Supplier',
      sublabel: 'Faktur & Hutang',
      icon: Truck,
      badge: unpaidPayableCount > 0 ? unpaidPayableCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      permission: 'purchases_create',
    },
    {
      id: 'inventory',
      label: 'Inventaris & Gudang',
      sublabel: 'Mutasi & Opname',
      icon: Warehouse,
      permission: 'inventory_adjust',
    },
    {
      id: 'customers',
      label: 'Pelanggan & Piutang',
      sublabel: 'Kredit & Pelunasan',
      icon: Users,
      badge: activeReceivableCount > 0 ? activeReceivableCount : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'finance',
      label: 'Keuangan & Kas',
      sublabel: 'Shift, Biaya, Rekening',
      icon: Wallet,
      permission: 'finance_access',
    },
    {
      id: 'reports',
      label: 'Laporan Lengkap',
      sublabel: 'HPP, Laba, Ekspor',
      icon: BarChart3,
      permission: 'reports_view',
    },
    {
      id: 'settings',
      label: 'Pengaturan Toko',
      sublabel: 'Sistem & Konfigurasi',
      icon: Settings,
      permission: 'settings_edit',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 select-none shrink-0 no-print">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Modul Bisnis
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const allowed = !item.permission || hasPermission(item.permission);

          if (!allowed) return null;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-sm font-medium leading-snug truncate">{item.label}</div>
                  <div
                    className={`text-[11px] truncate ${
                      isActive ? 'text-blue-100 font-normal' : 'text-slate-400 font-normal'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isActive ? 'bg-white text-blue-700 border-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Low Stock Warning Alert if any */}
      {lowStockCount > 0 && (
        <div className="mx-3 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
          <div className="flex items-center gap-2 font-semibold text-xs mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Peringatan Stok Rendah</span>
          </div>
          <p className="text-[11px] text-rose-200/80 leading-relaxed">
            Terdapat <span className="font-bold underline">{lowStockCount} produk</span> mendekati atau habis di bawah batas minimum.
          </p>
          <button
            onClick={() => onSelectTab('products')}
            className="mt-2 w-full py-1 text-center text-xs font-semibold rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
          >
            Lihat Stok Kritis
          </button>
        </div>
      )}
    </aside>
  );
};
