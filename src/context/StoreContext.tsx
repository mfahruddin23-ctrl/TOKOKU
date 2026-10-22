import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  Product,
  Category,
  Warehouse,
  Customer,
  Supplier,
  Sale,
  Purchase,
  StockMovement,
  Receivable,
  ReceivablePayment,
  Payable,
  PayablePayment,
  CashSession,
  CashMovement,
  Expense,
  BankAccount,
  StoreSettings,
  AuditLog,
} from '../types';
import { useAuth } from './AuthContext';
import { generateInvoiceNumber } from '../utils/formatters';

interface StoreContextType {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  receivables: Receivable[];
  payables: Payable[];
  cashSessions: CashSession[];
  activeCashSession: CashSession | null;
  expenses: Expense[];
  bankAccounts: BankAccount[];
  settings: StoreSettings;
  auditLogs: AuditLog[];
  isLoading: boolean;
  
  // Actions
  seedStoreData: () => Promise<void>;
  saveProduct: (product: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  completeSale: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Promise<Sale>;
  createPurchase: (purchaseData: Omit<Purchase, 'id' | 'createdAt'>) => Promise<Purchase>;
  receivePurchase: (purchaseId: string) => Promise<void>;
  adjustStock: (productId: string, quantityChange: number, reason: string, type?: StockMovement['type']) => Promise<void>;
  openCashSession: (startingCash: number) => Promise<CashSession>;
  closeCashSession: (actualCash: number, notes?: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>) => Promise<void>;
  payReceivable: (receivableId: string, amount: number, paymentMethod: string, notes?: string) => Promise<void>;
  payPayable: (payableId: string, amount: number, paymentMethod: string, notes?: string) => Promise<void>;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<void>;
  saveCustomer: (customer: Partial<Customer>) => Promise<void>;
  saveSupplier: (supplier: Partial<Supplier>) => Promise<void>;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'RAZKA JAYA STORE',
  branchName: 'Pusat Bahan Bangunan & Toko Umum',
  tagline: 'Lengkap, Berkualitas, Harga Grosir & Eceran Terpercaya',
  address: 'Jl. Raya Industri Barat No. 88, Pergudangan Sentra Niaga',
  phone: '(021) 8877-6655 / 0812-9988-7766',
  email: 'info@razkajaya.com',
  taxRate: 11,
  enableTax: false,
  receiptHeader: 'RAZKA JAYA MATERIAL STORE\nJl. Raya Industri Barat No. 88\nTelp: 0812-9988-7766',
  receiptFooter: 'Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian.',
  lowStockThreshold: 10,
  currencySymbol: 'Rp',
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active cashier session
  const activeCashSession = cashSessions.find((s) => s.status === 'open') || null;

  // Real-time Firestore Listeners
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    try {
      // 1. Products
      unsubs.push(
        onSnapshot(
          collection(db, 'products'),
          (snapshot) => {
            const list: Product[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Product));
            setProducts(list.sort((a, b) => a.name.localeCompare(b.name)));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'products')
        )
      );

      // 2. Categories
      unsubs.push(
        onSnapshot(
          collection(db, 'categories'),
          (snapshot) => {
            const list: Category[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
            setCategories(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'categories')
        )
      );

      // 3. Customers
      unsubs.push(
        onSnapshot(
          collection(db, 'customers'),
          (snapshot) => {
            const list: Customer[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Customer));
            setCustomers(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'customers')
        )
      );

      // 4. Suppliers
      unsubs.push(
        onSnapshot(
          collection(db, 'suppliers'),
          (snapshot) => {
            const list: Supplier[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Supplier));
            setSuppliers(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'suppliers')
        )
      );

      // 5. Sales
      unsubs.push(
        onSnapshot(
          collection(db, 'sales'),
          (snapshot) => {
            const list: Sale[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Sale));
            setSales(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'sales')
        )
      );

      // 6. Purchases
      unsubs.push(
        onSnapshot(
          collection(db, 'purchases'),
          (snapshot) => {
            const list: Purchase[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Purchase));
            setPurchases(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'purchases')
        )
      );

      // 7. Stock Movements
      unsubs.push(
        onSnapshot(
          collection(db, 'stockMovements'),
          (snapshot) => {
            const list: StockMovement[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as StockMovement));
            setStockMovements(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'stockMovements')
        )
      );

      // 8. Receivables (Piutang)
      unsubs.push(
        onSnapshot(
          collection(db, 'receivables'),
          (snapshot) => {
            const list: Receivable[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Receivable));
            setReceivables(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'receivables')
        )
      );

      // 9. Payables (Hutang Supplier)
      unsubs.push(
        onSnapshot(
          collection(db, 'payables'),
          (snapshot) => {
            const list: Payable[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Payable));
            setPayables(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'payables')
        )
      );

      // 10. Cash Sessions
      unsubs.push(
        onSnapshot(
          collection(db, 'cashSessions'),
          (snapshot) => {
            const list: CashSession[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as CashSession));
            setCashSessions(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'cashSessions')
        )
      );

      // 11. Expenses
      unsubs.push(
        onSnapshot(
          collection(db, 'expenses'),
          (snapshot) => {
            const list: Expense[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Expense));
            setExpenses(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'expenses')
        )
      );

      // 12. Warehouses
      unsubs.push(
        onSnapshot(
          collection(db, 'warehouses'),
          (snapshot) => {
            const list: Warehouse[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Warehouse));
            setWarehouses(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'warehouses')
        )
      );

      // 13. Bank Accounts
      unsubs.push(
        onSnapshot(
          collection(db, 'bankAccounts'),
          (snapshot) => {
            const list: BankAccount[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as BankAccount));
            setBankAccounts(list);
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'bankAccounts')
        )
      );

      // 14. Settings
      unsubs.push(
        onSnapshot(
          doc(db, 'settings', 'general'),
          (snapshot) => {
            if (snapshot.exists()) {
              setSettings({ ...DEFAULT_SETTINGS, ...snapshot.data() } as StoreSettings);
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, 'settings/general')
        )
      );

      setIsLoading(false);
    } catch (e) {
      console.error('Error establishing Firestore listeners:', e);
      setIsLoading(false);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // 1. Seed Realistic Indonesian Building Materials Data
  const seedStoreData = useCallback(async () => {
    setIsLoading(true);
    try {
      const batch = writeBatch(db);

      // Categories
      const sampleCategories: Category[] = [
        { id: 'cat_semen', name: 'Semen & Mortar', description: 'Semen Portland, Mortar Instan, Perekat Bata' },
        { id: 'cat_besi', name: 'Besi & Baja', description: 'Besi Beton, Ulir, Hollow, Pipa Besi, Wiremesh' },
        { id: 'cat_pasir', name: 'Pasir & Material Alam', description: 'Pasir Cor, Pasir Pasang, Batu Split, Bata Hebel' },
        { id: 'cat_cat', name: 'Cat & Kimia Bangunan', description: 'Cat Tembok, Cat Kayu/Besi, Waterproofing, Thinner' },
        { id: 'cat_kayu', name: 'Kayu & Triplek', description: 'Triplek Meranti, Kalsiboard, GRC Board, Kayu Balok' },
        { id: 'cat_pipa', name: 'Pipa & Sanitasi', description: 'Pipa PVC, Sambungan Fitting, Kran Air, Toren' },
        { id: 'cat_keramik', name: 'Keramik & Granit', description: 'Keramik Lantai 40x40, Dinding, Granit Tile 60x60' },
        { id: 'cat_atap', name: 'Atap & Plafon', description: 'Seng Gelombang, Asbes, Spandek, Baja Ringan' },
        { id: 'cat_perkakas', name: 'Alat & Perkakas', description: 'Paku, Baut, Gergaji, Cetok, Cangkul, Meteran' },
      ];

      sampleCategories.forEach((c) => {
        batch.set(doc(db, 'categories', c.id), c);
      });

      // Warehouses
      const sampleWarehouses: Warehouse[] = [
        { id: 'wh_main', name: 'Gudang Utama & Material Berat', code: 'GD-01', isPrimary: true, address: 'Area Belakang Toko' },
        { id: 'wh_display', name: 'Toko Display & Retail Depan', code: 'TK-01', isPrimary: false, address: 'Area Depan / Kasir' },
        { id: 'wh_pasir', name: 'Depo Semen & Curah Pasir', code: 'DP-01', isPrimary: false, address: 'Dermaga Barat' },
      ];
      sampleWarehouses.forEach((w) => {
        batch.set(doc(db, 'warehouses', w.id), w);
      });

      // Suppliers
      const sampleSuppliers: Supplier[] = [
        { id: 'sup_indocement', name: 'PT. Indocement Tunggal Prakarsa (Tiga Roda)', phone: '021-8752812', currentDebt: 0, address: 'Citeureup, Bogor', contactPerson: 'Herman Susanto', createdAt: new Date().toISOString() },
        { id: 'sup_krakatau', name: 'PT. Krakatau Steel Distributor', phone: '021-5221255', currentDebt: 15000000, address: 'Cilegon, Banten', contactPerson: 'Bambang Irawan', createdAt: new Date().toISOString() },
        { id: 'sup_avian', name: 'PT. Avia Avian Tbk', phone: '031-8988888', currentDebt: 0, address: 'Sidoarjo, Jawa Timur', contactPerson: 'Christian Hartono', createdAt: new Date().toISOString() },
        { id: 'sup_merapi', name: 'CV. Sumber Pasir & Tambang Merapi', phone: '0813-8888-9999', currentDebt: 5000000, address: 'Magelang, Jawa Tengah', contactPerson: 'Pak Slamet', createdAt: new Date().toISOString() },
        { id: 'sup_rucika', name: 'PT. Wahana Duta Persada (Rucika)', phone: '021-8901234', currentDebt: 0, address: 'Cikarang, Bekasi', contactPerson: 'Yuliana', createdAt: new Date().toISOString() },
      ];
      sampleSuppliers.forEach((s) => {
        batch.set(doc(db, 'suppliers', s.id), s);
      });

      // Customers
      const sampleCustomers: Customer[] = [
        { id: 'cust_umum', name: 'Pelanggan Umum (Cash)', phone: '-', creditLimit: 0, currentDebt: 0, createdAt: new Date().toISOString() },
        { id: 'cust_berkah', name: 'Toko Berkah Mandiri (Kontraktor)', phone: '0812-3456-7890', creditLimit: 50000000, currentDebt: 18500000, address: 'Jl. Pemuda No. 12', createdAt: new Date().toISOString() },
        { id: 'cust_hendra', name: 'Pak Hendra (Mandor Proyek Sukses)', phone: '0818-7654-3210', creditLimit: 25000000, currentDebt: 7200000, address: 'Perumahan Griya Indah Blok C', createdAt: new Date().toISOString() },
        { id: 'cust_karya', name: 'CV. Karya Semesta Bangun', phone: '0811-9988-7711', creditLimit: 100000000, currentDebt: 32000000, address: 'Kawasan Bisnis Boulevard', createdAt: new Date().toISOString() },
      ];
      sampleCustomers.forEach((c) => {
        batch.set(doc(db, 'customers', c.id), c);
      });

      // Bank Accounts
      const sampleBankAccounts: BankAccount[] = [
        { id: 'bank_cash', bankName: 'Kas Tunai Toko', accountNumber: 'CASH-01', accountHolder: 'Razka Jaya Store', balance: 12500000, isDefault: true },
        { id: 'bank_bca', bankName: 'BCA Bisnis', accountNumber: '8830-192-888', accountHolder: 'Razka Pratama', balance: 84600000 },
        { id: 'bank_mandiri', bankName: 'Mandiri Giro Niaga', accountNumber: '129-00-9988-123', accountHolder: 'PT Razka Jaya Material', balance: 45200000 },
      ];
      sampleBankAccounts.forEach((b) => {
        batch.set(doc(db, 'bankAccounts', b.id), b);
      });

      // Products (Real Indonesian Material Store Products)
      const sampleProducts: Product[] = [
        {
          id: 'prod_semen_tr',
          sku: 'SM-TR-40',
          barcode: '899123400001',
          name: 'Semen Tiga Roda Portland Composite 40 Kg',
          description: 'Semen serbaguna untuk plesteran, acian, dan pasangan bata',
          categoryId: 'cat_semen',
          categoryName: 'Semen & Mortar',
          unit: 'Sak',
          purchasePrice: 58000,
          sellingPrice: 65000,
          wholesalePrice: 63000,
          minWholesaleQty: 50,
          stock: 450,
          minStock: 50,
          warehouseId: 'wh_main',
          supplierId: 'sup_indocement',
          supplierName: 'PT. Indocement Tunggal Prakarsa',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_semen_mu',
          sku: 'SM-MU-380',
          barcode: '899123400002',
          name: 'Semen Mortar MU-380 Perekat Bata Ringan 40 Kg',
          description: 'Thinbed mortar perekat bata ringan kualitas premium',
          categoryId: 'cat_semen',
          categoryName: 'Semen & Mortar',
          unit: 'Sak',
          purchasePrice: 85000,
          sellingPrice: 96000,
          wholesalePrice: 92000,
          minWholesaleQty: 20,
          stock: 120,
          minStock: 25,
          warehouseId: 'wh_main',
          supplierId: 'sup_indocement',
          supplierName: 'PT. Indocement Tunggal Prakarsa',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_besi_10',
          sku: 'BS-UL-10',
          barcode: '899123400003',
          name: 'Besi Beton Ulir 10 mm SNI Full (Panjang 12 Meter)',
          description: 'Besi tulangan konstruksi beton bertulang bersertifikat SNI',
          categoryId: 'cat_besi',
          categoryName: 'Besi & Baja',
          unit: 'Batang',
          purchasePrice: 78000,
          sellingPrice: 89000,
          wholesalePrice: 86000,
          minWholesaleQty: 50,
          stock: 280,
          minStock: 40,
          warehouseId: 'wh_main',
          supplierId: 'sup_krakatau',
          supplierName: 'PT. Krakatau Steel Distributor',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_besi_8',
          sku: 'BS-PL-08',
          barcode: '899123400004',
          name: 'Besi Beton Polos 8 mm SNI (Panjang 12 Meter)',
          description: 'Besi begel/ring beugel kolom dan balok praktis',
          categoryId: 'cat_besi',
          categoryName: 'Besi & Baja',
          unit: 'Batang',
          purchasePrice: 48000,
          sellingPrice: 56000,
          wholesalePrice: 54000,
          minWholesaleQty: 50,
          stock: 350,
          minStock: 50,
          warehouseId: 'wh_main',
          supplierId: 'sup_krakatau',
          supplierName: 'PT. Krakatau Steel Distributor',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_hollow_4x4',
          sku: 'BS-HL-44',
          barcode: '899123400005',
          name: 'Besi Hollow Galvanis 4x4 Tebal 1.2 mm (4 Meter)',
          description: 'Rangka partisi, pagar, dan kanopi anti karat',
          categoryId: 'cat_besi',
          categoryName: 'Besi & Baja',
          unit: 'Batang',
          purchasePrice: 62000,
          sellingPrice: 72000,
          wholesalePrice: 69000,
          minWholesaleQty: 20,
          stock: 85,
          minStock: 20,
          warehouseId: 'wh_main',
          supplierId: 'sup_krakatau',
          supplierName: 'PT. Krakatau Steel Distributor',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_pasir_merapi',
          sku: 'MT-PS-TRK',
          barcode: '899123400006',
          name: 'Pasir Cor Merapi Kualitas Super (1 Truk Dump / ~6 m3)',
          description: 'Pasir hitam bersih minim lumpur untuk cor struktur dan pasangan kuat',
          categoryId: 'cat_pasir',
          categoryName: 'Pasir & Material Alam',
          unit: 'Truk',
          purchasePrice: 1450000,
          sellingPrice: 1750000,
          wholesalePrice: 1700000,
          minWholesaleQty: 3,
          stock: 14,
          minStock: 3,
          warehouseId: 'wh_pasir',
          supplierId: 'sup_merapi',
          supplierName: 'CV. Sumber Pasir & Tambang Merapi',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_hebel_10',
          sku: 'MT-HB-10',
          barcode: '899123400007',
          name: 'Bata Ringan Hebel AAC 10x20x60 cm (1 Kubik / m3)',
          description: 'Bata ringan presisi kuat, 1 kubik isi 83 pcs',
          categoryId: 'cat_pasir',
          categoryName: 'Pasir & Material Alam',
          unit: 'M3',
          purchasePrice: 530000,
          sellingPrice: 610000,
          wholesalePrice: 590000,
          minWholesaleQty: 10,
          stock: 35,
          minStock: 5,
          warehouseId: 'wh_main',
          supplierId: 'sup_merapi',
          supplierName: 'CV. Sumber Pasir & Tambang Merapi',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_cat_dulux',
          sku: 'CT-DLX-25',
          barcode: '899123400008',
          name: 'Cat Tembok Dulux Catylac Interior 25 Kg (Putih)',
          description: 'Daya sebar luas, aroma segar, warna cerah tahan lama',
          categoryId: 'cat_cat',
          categoryName: 'Cat & Kimia Bangunan',
          unit: 'Pail',
          purchasePrice: 580000,
          sellingPrice: 675000,
          wholesalePrice: 650000,
          minWholesaleQty: 5,
          stock: 18,
          minStock: 4,
          warehouseId: 'wh_display',
          supplierId: 'sup_avian',
          supplierName: 'PT. Avia Avian Tbk',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_cat_avian',
          sku: 'CT-AVN-1K',
          barcode: '899123400009',
          name: 'Cat Kayu & Besi Avian Gloss 1 Kg (Hitam / Putih)',
          description: 'Cat sintetis bermutu tinggi mengkilap dan anti rayap',
          categoryId: 'cat_cat',
          categoryName: 'Cat & Kimia Bangunan',
          unit: 'Kaleng',
          purchasePrice: 56000,
          sellingPrice: 68000,
          wholesalePrice: 65000,
          minWholesaleQty: 12,
          stock: 42,
          minStock: 10,
          warehouseId: 'wh_display',
          supplierId: 'sup_avian',
          supplierName: 'PT. Avia Avian Tbk',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_triplek_9',
          sku: 'KY-TRP-09',
          barcode: '899123400010',
          name: 'Triplek Kayu Meranti 9 mm (Ukuran 122 x 244 cm)',
          description: 'Triplek padat permukaan halus untuk cor, mebel dan plafon',
          categoryId: 'cat_kayu',
          categoryName: 'Kayu & Triplek',
          unit: 'Lembar',
          purchasePrice: 94000,
          sellingPrice: 112000,
          wholesalePrice: 107000,
          minWholesaleQty: 15,
          stock: 75,
          minStock: 15,
          warehouseId: 'wh_main',
          supplierId: 'sup_merapi',
          supplierName: 'CV. Sumber Pasir & Tambang Merapi',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_pipa_rucika_3',
          sku: 'PP-RCK-3D',
          barcode: '899123400011',
          name: 'Pipa PVC Rucika Tipe D Ukuran 3 Inch (Panjang 4 Meter)',
          description: 'Pipa pembuangan air kotor dan talang atap tahan bentur',
          categoryId: 'cat_pipa',
          categoryName: 'Pipa & Sanitasi',
          unit: 'Batang',
          purchasePrice: 72000,
          sellingPrice: 85000,
          wholesalePrice: 82000,
          minWholesaleQty: 10,
          stock: 65,
          minStock: 12,
          warehouseId: 'wh_main',
          supplierId: 'sup_rucika',
          supplierName: 'PT. Wahana Duta Persada (Rucika)',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_keramik_mulia',
          sku: 'KR-MLA-40',
          barcode: '899123400012',
          name: 'Keramik Lantai Mulia Signature 40x40 Putih Polos (1 Dus)',
          description: 'Isi 6 keping = 0.96 m2 per dus, permukaan glossy bersih',
          categoryId: 'cat_keramik',
          categoryName: 'Keramik & Granit',
          unit: 'Dus',
          purchasePrice: 52000,
          sellingPrice: 63000,
          wholesalePrice: 60000,
          minWholesaleQty: 25,
          stock: 140,
          minStock: 20,
          warehouseId: 'wh_main',
          supplierId: 'sup_merapi',
          supplierName: 'CV. Sumber Pasir & Tambang Merapi',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_spandek_03',
          sku: 'AT-SPN-03',
          barcode: '899123400013',
          name: 'Atap Spandek Galvalum Zincalume 0.30 mm (Panjang 6 Meter)',
          description: 'Atap kanopi dan gudang anti karat, tahan cuaca panas hujan',
          categoryId: 'cat_atap',
          categoryName: 'Atap & Plafon',
          unit: 'Lembar',
          purchasePrice: 195000,
          sellingPrice: 228000,
          wholesalePrice: 220000,
          minWholesaleQty: 10,
          stock: 45,
          minStock: 8,
          warehouseId: 'wh_main',
          supplierId: 'sup_krakatau',
          supplierName: 'PT. Krakatau Steel Distributor',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_paku_kayu',
          sku: 'PK-KY-7CM',
          barcode: '899123400014',
          name: 'Paku Kayu Campur 7 cm / 3 Inch (Per Kotak Dus 10 Kg)',
          description: 'Paku baja keras tidak mudah bengkok untuk bekisting dan reng kayu',
          categoryId: 'cat_perkakas',
          categoryName: 'Alat & Perkakas',
          unit: 'Dus',
          purchasePrice: 140000,
          sellingPrice: 165000,
          wholesalePrice: 158000,
          minWholesaleQty: 5,
          stock: 6, // Low stock demo!
          minStock: 10,
          warehouseId: 'wh_display',
          supplierId: 'sup_krakatau',
          supplierName: 'PT. Krakatau Steel Distributor',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      sampleProducts.forEach((p) => {
        batch.set(doc(db, 'products', p.id), p);
      });

      // Settings
      batch.set(doc(db, 'settings', 'general'), DEFAULT_SETTINGS);

      // Initial Cash Session for instant POS usability
      const sessionRef = doc(db, 'cashSessions', 'ses_initial_01');
      const initialSession: CashSession = {
        id: 'ses_initial_01',
        shiftNumber: 'SHIFT-2026-001',
        cashierId: userProfile.id,
        cashierName: userProfile.displayName,
        startTime: new Date().toISOString(),
        startingCash: 500000,
        status: 'open',
        notes: 'Shift Pagi Reguler',
        createdAt: new Date().toISOString(),
      };
      batch.set(sessionRef, initialSession);

      // Sample Expenses
      const sampleExpenses: Expense[] = [
        {
          id: 'exp_01',
          expenseNumber: 'EXP-001',
          category: 'BBM & Armada Pengiriman',
          amount: 250000,
          paymentMethod: 'cash',
          description: 'Bensin Solar Truk Pengiriman Pasir Proyek Citra',
          date: new Date().toISOString(),
          approvedBy: 'H. Razka Pratama',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'exp_02',
          expenseNumber: 'EXP-002',
          category: 'Listrik & Utilitas Toko',
          amount: 850000,
          paymentMethod: 'bank_transfer',
          description: 'Pembayaran Token PLN Daya 5500VA Gudang Utama',
          date: new Date().toISOString(),
          approvedBy: 'H. Razka Pratama',
          createdAt: new Date().toISOString(),
        },
      ];
      sampleExpenses.forEach((exp) => {
        batch.set(doc(db, 'expenses', exp.id), exp);
      });

      // Commit Batch
      await batch.commit();

      // Log Stock Movements for initial stock
      for (const p of sampleProducts) {
        const movementRef = doc(collection(db, 'stockMovements'));
        const movement: StockMovement = {
          id: movementRef.id,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'in',
          quantity: p.stock,
          unit: p.unit,
          previousStock: 0,
          currentStock: p.stock,
          referenceId: 'INITIAL-STOCK',
          referenceType: 'adjustment',
          reason: 'Saldo Awal Sistem Razka Jaya ERP',
          userId: userProfile.id,
          userName: userProfile.displayName,
          warehouseId: p.warehouseId,
          createdAt: new Date().toISOString(),
        };
        await setDoc(movementRef, movement);
      }

      console.log('Sample database successfully seeded!');
    } catch (err) {
      console.error('Failed to seed store data:', err);
      handleFirestoreError(err, OperationType.WRITE, 'seed');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);

  // 2. Save / Update Product
  const saveProduct = async (productData: Partial<Product>) => {
    try {
      const id = productData.id || doc(collection(db, 'products')).id;
      const ref = doc(db, 'products', id);
      const isNew = !productData.id;

      const record: Product = {
        id,
        sku: productData.sku || `PRD-${Date.now().toString().slice(-6)}`,
        barcode: productData.barcode || `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        name: productData.name || 'Produk Baru',
        description: productData.description || '',
        categoryId: productData.categoryId || 'cat_semen',
        categoryName: productData.categoryName || 'Semen & Mortar',
        unit: productData.unit || 'Pcs',
        purchasePrice: Number(productData.purchasePrice) || 0,
        sellingPrice: Number(productData.sellingPrice) || 0,
        wholesalePrice: Number(productData.wholesalePrice) || Number(productData.sellingPrice) || 0,
        minWholesaleQty: Number(productData.minWholesaleQty) || 10,
        stock: Number(productData.stock) || 0,
        minStock: Number(productData.minStock) || 5,
        warehouseId: productData.warehouseId || 'wh_main',
        supplierId: productData.supplierId || '',
        supplierName: productData.supplierName || '',
        imageUrl: productData.imageUrl || '',
        isActive: productData.isActive !== false,
        createdAt: productData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(ref, record, { merge: true });

      // Audit Log stock entry if new product with initial stock
      if (isNew && record.stock > 0) {
        const movementRef = doc(collection(db, 'stockMovements'));
        await setDoc(movementRef, {
          id: movementRef.id,
          productId: id,
          productName: record.name,
          sku: record.sku,
          type: 'in',
          quantity: record.stock,
          unit: record.unit,
          previousStock: 0,
          currentStock: record.stock,
          referenceId: 'NEW-PRODUCT',
          referenceType: 'adjustment',
          reason: 'Input Barang Baru',
          userId: userProfile.id,
          userName: userProfile.displayName,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  // Delete Product
  const deleteProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        isActive: false,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${productId}`);
    }
  };

  // 3. Complete Sale (Transaction consistency with stock & cash ledger)
  const completeSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> => {
    const saleId = doc(collection(db, 'sales')).id;
    const now = new Date().toISOString();

    const sale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: now,
    };

    try {
      await runTransaction(db, async (transaction) => {
        // Read all product docs to ensure stock consistency
        const productSnapshots = await Promise.all(
          sale.items.map((item) => transaction.get(doc(db, 'products', item.productId)))
        );

        // Verify stock for each item
        productSnapshots.forEach((snap, idx) => {
          if (!snap.exists()) {
            throw new Error(`Produk dengan ID ${sale.items[idx].productId} tidak ditemukan.`);
          }
          const pData = snap.data() as Product;
          if (pData.stock < sale.items[idx].quantity) {
            console.warn(`Peringatan: Stok ${pData.name} kurang dari permintaan (${pData.stock} < ${sale.items[idx].quantity})`);
          }
        });

        // 1. Write Sale document
        transaction.set(doc(db, 'sales', saleId), sale);

        // 2. Decrement stock for each item and add stockMovement
        sale.items.forEach((item, idx) => {
          const currentProd = productSnapshots[idx].data() as Product;
          const newStock = Math.max(0, currentProd.stock - item.quantity);
          transaction.update(doc(db, 'products', item.productId), {
            stock: newStock,
            updatedAt: now,
          });

          // Stock movement log
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, {
            id: movementRef.id,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            type: 'out',
            quantity: item.quantity,
            unit: item.unit,
            previousStock: currentProd.stock,
            currentStock: newStock,
            referenceId: sale.invoiceNumber,
            referenceType: 'sale',
            reason: `Penjualan Kasir POS #${sale.invoiceNumber}`,
            userId: userProfile.id,
            userName: userProfile.displayName,
            createdAt: now,
          });
        });

        // 3. Handle Receivables if Tempo / Credit
        if (sale.paymentStatus === 'credit' || sale.paymentStatus === 'partial') {
          const remainingDebt = sale.grandTotal - (sale.paidAmount || 0);
          const receivableRef = doc(collection(db, 'receivables'));
          transaction.set(receivableRef, {
            id: receivableRef.id,
            saleId: saleId,
            invoiceNumber: sale.invoiceNumber,
            customerId: sale.customerId,
            customerName: sale.customerName,
            totalAmount: sale.grandTotal,
            paidAmount: sale.paidAmount || 0,
            remainingAmount: remainingDebt,
            dueDate: sale.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: sale.paidAmount > 0 ? 'partial' : 'unpaid',
            createdAt: now,
          });

          // Increment customer debt
          if (sale.customerId && sale.customerId !== 'cust_umum') {
            transaction.update(doc(db, 'customers', sale.customerId), {
              currentDebt: increment(remainingDebt),
            });
          }
        }

        // 4. Update Cash Movement & Session if Cash
        if (sale.paymentMethod === 'cash' && sale.paidAmount > 0) {
          const cashMovementRef = doc(collection(db, 'cashMovements'));
          transaction.set(cashMovementRef, {
            id: cashMovementRef.id,
            sessionId: activeCashSession?.id || '',
            type: 'in',
            category: 'Penjualan Tunai Kasir',
            amount: sale.grandTotal,
            description: `Penjualan #${sale.invoiceNumber} - ${sale.customerName}`,
            source: 'POS',
            userId: userProfile.id,
            userName: userProfile.displayName,
            createdAt: now,
          });

          if (activeCashSession) {
            transaction.update(doc(db, 'cashSessions', activeCashSession.id), {
              totalCashSales: increment(sale.grandTotal),
            });
          }
        }
      });

      return sale;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'sales');
      throw err;
    }
  };

  // 4. Create Purchase & Receive Purchase
  const createPurchase = async (purchaseData: Omit<Purchase, 'id' | 'createdAt'>): Promise<Purchase> => {
    const purchaseId = doc(collection(db, 'purchases')).id;
    const now = new Date().toISOString();

    const purchase: Purchase = {
      ...purchaseData,
      id: purchaseId,
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'purchases', purchaseId), purchase);

      // If created with status 'received', process receiving directly
      if (purchase.status === 'received') {
        await receivePurchase(purchaseId);
      }

      return purchase;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchases');
      throw err;
    }
  };

  const receivePurchase = async (purchaseId: string) => {
    const purchaseRef = doc(db, 'purchases', purchaseId);
    const now = new Date().toISOString();

    try {
      await runTransaction(db, async (transaction) => {
        const purchaseSnap = await transaction.get(purchaseRef);
        if (!purchaseSnap.exists()) throw new Error('Data pembelian tidak ditemukan.');
        const purchase = purchaseSnap.data() as Purchase;

        if (purchase.status === 'received' && purchase.receivedAt) {
          console.warn('Barang sudah pernah diterima sebelumnya.');
          return;
        }

        // 1. Update purchase status
        transaction.update(purchaseRef, {
          status: 'received',
          receivedAt: now,
          receivedBy: userProfile.displayName,
        });

        // 2. Increment stock and update purchase price for each item
        for (const item of purchase.items) {
          const prodRef = doc(db, 'products', item.productId);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            const prod = prodSnap.data() as Product;
            const newStock = prod.stock + item.quantity;
            transaction.update(prodRef, {
              stock: newStock,
              purchasePrice: item.purchasePrice, // update recent purchase price
              updatedAt: now,
            });

            // Stock movement audit
            const movementRef = doc(collection(db, 'stockMovements'));
            transaction.set(movementRef, {
              id: movementRef.id,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'in',
              quantity: item.quantity,
              unit: item.unit,
              previousStock: prod.stock,
              currentStock: newStock,
              referenceId: purchase.invoiceNumber,
              referenceType: 'purchase',
              reason: `Penerimaan Pembelian Supplier (${purchase.supplierName})`,
              userId: userProfile.id,
              userName: userProfile.displayName,
              createdAt: now,
            });
          }
        }

        // 3. Record Payable if unpaid
        if (purchase.paymentStatus === 'credit' || purchase.paymentStatus === 'partial') {
          const remainingDebt = purchase.totalAmount - (purchase.paidAmount || 0);
          const payableRef = doc(collection(db, 'payables'));
          transaction.set(payableRef, {
            id: payableRef.id,
            purchaseId: purchase.id,
            purchaseInvoice: purchase.invoiceNumber,
            supplierId: purchase.supplierId,
            supplierName: purchase.supplierName,
            totalAmount: purchase.totalAmount,
            paidAmount: purchase.paidAmount || 0,
            remainingAmount: remainingDebt,
            dueDate: purchase.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: purchase.paidAmount > 0 ? 'partial' : 'unpaid',
            createdAt: now,
          });

          // Update supplier debt
          if (purchase.supplierId) {
            transaction.update(doc(db, 'suppliers', purchase.supplierId), {
              currentDebt: increment(remainingDebt),
            });
          }
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `purchases/${purchaseId}`);
    }
  };

  // 5. Stock Adjustment
  const adjustStock = async (
    productId: string,
    quantityChange: number,
    reason: string,
    type: StockMovement['type'] = 'adjustment'
  ) => {
    const now = new Date().toISOString();
    try {
      await runTransaction(db, async (transaction) => {
        const prodRef = doc(db, 'products', productId);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) throw new Error('Produk tidak ditemukan');

        const prod = prodSnap.data() as Product;
        const newStock = Math.max(0, prod.stock + quantityChange);

        transaction.update(prodRef, {
          stock: newStock,
          updatedAt: now,
        });

        const movementRef = doc(collection(db, 'stockMovements'));
        transaction.set(movementRef, {
          id: movementRef.id,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type,
          quantity: quantityChange,
          unit: prod.unit,
          previousStock: prod.stock,
          currentStock: newStock,
          referenceId: 'STOCK-ADJUST',
          referenceType: 'adjustment',
          reason,
          userId: userProfile.id,
          userName: userProfile.displayName,
          createdAt: now,
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${productId}`);
    }
  };

  // 6. Cash Shift Sessions
  const openCashSession = async (startingCash: number): Promise<CashSession> => {
    const id = doc(collection(db, 'cashSessions')).id;
    const now = new Date().toISOString();
    const session: CashSession = {
      id,
      shiftNumber: `SHIFT-${now.slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      cashierId: userProfile.id,
      cashierName: userProfile.displayName,
      startTime: now,
      startingCash: Number(startingCash) || 0,
      totalCashSales: 0,
      totalExpenses: 0,
      status: 'open',
      createdAt: now,
    };

    try {
      await setDoc(doc(db, 'cashSessions', id), session);
      return session;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'cashSessions');
      throw err;
    }
  };

  const closeCashSession = async (actualCash: number, notes?: string) => {
    if (!activeCashSession) return;
    const now = new Date().toISOString();
    const expected = (activeCashSession.startingCash || 0) + (activeCashSession.totalCashSales || 0) - (activeCashSession.totalExpenses || 0);
    const diff = actualCash - expected;

    try {
      await updateDoc(doc(db, 'cashSessions', activeCashSession.id), {
        endTime: now,
        actualCash,
        expectedCash: expected,
        difference: diff,
        status: 'closed',
        notes: notes || 'Tutup Shift Selesai',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cashSessions/${activeCashSession.id}`);
    }
  };

  // 7. Add Expense
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'expenseNumber'>) => {
    const id = doc(collection(db, 'expenses')).id;
    const now = new Date().toISOString();
    const expenseNumber = `EXP-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const expense: Expense = {
      ...expenseData,
      id,
      expenseNumber,
      createdAt: now,
    };

    try {
      await runTransaction(db, async (transaction) => {
        transaction.set(doc(db, 'expenses', id), expense);

        // Record cash movement if paid with cash
        if (expense.paymentMethod === 'cash') {
          const moveRef = doc(collection(db, 'cashMovements'));
          transaction.set(moveRef, {
            id: moveRef.id,
            sessionId: activeCashSession?.id || '',
            type: 'out',
            category: expense.category,
            amount: expense.amount,
            description: `${expense.expenseNumber} - ${expense.description}`,
            source: 'Expense',
            userId: userProfile.id,
            userName: userProfile.displayName,
            createdAt: now,
          });

          if (activeCashSession) {
            transaction.update(doc(db, 'cashSessions', activeCashSession.id), {
              totalExpenses: increment(expense.amount),
            });
          }
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'expenses');
    }
  };

  // 8. Pay Customer Receivable (Piutang)
  const payReceivable = async (receivableId: string, amount: number, paymentMethod: string, notes?: string) => {
    const now = new Date().toISOString();
    try {
      await runTransaction(db, async (transaction) => {
        const recRef = doc(db, 'receivables', receivableId);
        const recSnap = await transaction.get(recRef);
        if (!recSnap.exists()) throw new Error('Data piutang tidak ditemukan');

        const rec = recSnap.data() as Receivable;
        const newPaid = rec.paidAmount + amount;
        const newRemaining = Math.max(0, rec.totalAmount - newPaid);
        const newStatus = newRemaining === 0 ? 'paid' : 'partial';

        transaction.update(recRef, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
        });

        // Payment record
        const paymentRef = doc(collection(db, 'receivablePayments'));
        transaction.set(paymentRef, {
          id: paymentRef.id,
          receivableId: rec.id,
          invoiceNumber: rec.invoiceNumber,
          customerId: rec.customerId,
          customerName: rec.customerName,
          amount,
          paymentMethod,
          notes: notes || 'Pembayaran Piutang',
          receivedBy: userProfile.displayName,
          date: now,
          createdAt: now,
        });

        // Decrement customer debt
        if (rec.customerId && rec.customerId !== 'cust_umum') {
          transaction.update(doc(db, 'customers', rec.customerId), {
            currentDebt: increment(-amount),
          });
        }

        // Cash flow if cash
        if (paymentMethod === 'cash') {
          const moveRef = doc(collection(db, 'cashMovements'));
          transaction.set(moveRef, {
            id: moveRef.id,
            sessionId: activeCashSession?.id || '',
            type: 'in',
            category: 'Penerimaan Piutang Pelanggan',
            amount,
            description: `Pelunasan Piutang #${rec.invoiceNumber} (${rec.customerName})`,
            userId: userProfile.id,
            userName: userProfile.displayName,
            createdAt: now,
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'receivables');
    }
  };

  // 9. Pay Supplier Payable (Hutang Supplier)
  const payPayable = async (payableId: string, amount: number, paymentMethod: string, notes?: string) => {
    const now = new Date().toISOString();
    try {
      await runTransaction(db, async (transaction) => {
        const payRef = doc(db, 'payables', payableId);
        const paySnap = await transaction.get(payRef);
        if (!paySnap.exists()) throw new Error('Data hutang supplier tidak ditemukan');

        const pay = paySnap.data() as Payable;
        const newPaid = pay.paidAmount + amount;
        const newRemaining = Math.max(0, pay.totalAmount - newPaid);
        const newStatus = newRemaining === 0 ? 'paid' : 'partial';

        transaction.update(payRef, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
          status: newStatus,
        });

        // Payment record
        const paymentRef = doc(collection(db, 'payablePayments'));
        transaction.set(paymentRef, {
          id: paymentRef.id,
          payableId: pay.id,
          purchaseInvoice: pay.purchaseInvoice,
          supplierId: pay.supplierId,
          supplierName: pay.supplierName,
          amount,
          paymentMethod,
          notes: notes || 'Pembayaran Hutang Supplier',
          paidBy: userProfile.displayName,
          date: now,
          createdAt: now,
        });

        // Decrement supplier debt
        if (pay.supplierId) {
          transaction.update(doc(db, 'suppliers', pay.supplierId), {
            currentDebt: increment(-amount),
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payables');
    }
  };

  // 10. Update Settings
  const updateSettings = async (newSettings: Partial<StoreSettings>) => {
    try {
      const merged = { ...settings, ...newSettings };
      await setDoc(doc(db, 'settings', 'general'), merged, { merge: true });
      setSettings(merged);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/general');
    }
  };

  // Save Customer & Supplier
  const saveCustomer = async (cust: Partial<Customer>) => {
    try {
      const id = cust.id || doc(collection(db, 'customers')).id;
      const data: Customer = {
        id,
        name: cust.name || 'Pelanggan Baru',
        phone: cust.phone || '',
        email: cust.email || '',
        address: cust.address || '',
        creditLimit: Number(cust.creditLimit) || 0,
        currentDebt: Number(cust.currentDebt) || 0,
        notes: cust.notes || '',
        createdAt: cust.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'customers', id), data, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'customers');
    }
  };

  const saveSupplier = async (sup: Partial<Supplier>) => {
    try {
      const id = sup.id || doc(collection(db, 'suppliers')).id;
      const data: Supplier = {
        id,
        name: sup.name || 'Supplier Baru',
        phone: sup.phone || '',
        email: sup.email || '',
        address: sup.address || '',
        contactPerson: sup.contactPerson || '',
        currentDebt: Number(sup.currentDebt) || 0,
        createdAt: sup.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'suppliers', id), data, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'suppliers');
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        warehouses,
        customers,
        suppliers,
        sales,
        purchases,
        stockMovements,
        receivables,
        payables,
        cashSessions,
        activeCashSession,
        expenses,
        bankAccounts,
        settings,
        auditLogs,
        isLoading,
        seedStoreData,
        saveProduct,
        deleteProduct,
        completeSale,
        createPurchase,
        receivePurchase,
        adjustStock,
        openCashSession,
        closeCashSession,
        addExpense,
        payReceivable,
        payPayable,
        updateSettings,
        saveCustomer,
        saveSupplier,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
