import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosView } from './components/pos/PosView';
import { ProductView } from './components/products/ProductView';
import { PurchaseView } from './components/purchases/PurchaseView';
import { InventoryView } from './components/inventory/InventoryView';
import { CustomerView } from './components/customers/CustomerView';
import { FinanceView } from './components/finance/FinanceView';
import { ReportView } from './components/reports/ReportView';
import { SettingsView } from './components/settings/SettingsView';
import { OpenShiftModal, CloseShiftModal } from './components/modals/ShiftModals';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isOpenShiftOpen, setIsOpenShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);

  const { isLoading } = useStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenShiftModal={() => setIsOpenShiftOpen(true)}
        onOpenCloseShiftModal={() => setIsCloseShiftOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950/60">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-medium">Menghubungkan ke Cloud Firestore...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
              {currentTab === 'pos' && <PosView onOpenShiftModal={() => setIsOpenShiftOpen(true)} />}
              {currentTab === 'products' && <ProductView />}
              {currentTab === 'purchases' && <PurchaseView />}
              {currentTab === 'inventory' && <InventoryView />}
              {currentTab === 'customers' && <CustomerView />}
              {currentTab === 'finance' && (
                <FinanceView
                  onOpenShiftModal={() => setIsOpenShiftOpen(true)}
                  onOpenCloseShiftModal={() => setIsCloseShiftOpen(true)}
                />
              )}
              {currentTab === 'reports' && <ReportView />}
              {currentTab === 'settings' && <SettingsView />}
            </>
          )}
        </main>
      </div>

      {/* Cashier Shift Modals */}
      <OpenShiftModal
        isOpen={isOpenShiftOpen}
        onClose={() => setIsOpenShiftOpen(false)}
      />
      <CloseShiftModal
        isOpen={isCloseShiftOpen}
        onClose={() => setIsCloseShiftOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
