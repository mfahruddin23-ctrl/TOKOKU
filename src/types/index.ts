export type UserRole = 'owner' | 'admin' | 'manager' | 'cashier' | 'warehouse' | 'finance';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number; // e.g. 1 Sak = 50 Kg, 1 Dus = 12 Pcs
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  unit: string; // Sak, Batang, Meter, Lembar, Dus, Unit, Pcs, Truk, Roll, etc.
  unitConversions?: UnitConversion[];
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  minWholesaleQty?: number;
  stock: number;
  minStock: number;
  warehouseId?: string;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  createdAt?: string;
}

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  isPrimary?: boolean;
  createdAt?: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'debit' | 'credit_tempo' | 'mixed';
export type PaymentStatus = 'paid' | 'credit' | 'partial';

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  unitPrice: number;
  isWholesale?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  changeAmount: number;
  dueDate?: string; // If tempo/credit
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierInvoiceNumber?: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'ordered' | 'received' | 'cancelled';
  paymentStatus: PaymentStatus;
  dueDate?: string;
  notes?: string;
  receivedAt?: string;
  receivedBy?: string;
  createdAt: string;
}

export type StockMovementType = 'in' | 'out' | 'adjustment' | 'transfer' | 'opname' | 'damage' | 'sale_return';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  type: StockMovementType;
  quantity: number; // positive or negative
  unit: string;
  previousStock: number;
  currentStock: number;
  referenceId?: string; // invoiceNumber or orderId
  referenceType?: 'sale' | 'purchase' | 'opname' | 'adjustment' | 'transfer' | 'return';
  reason?: string;
  userId: string;
  userName: string;
  warehouseId?: string;
  createdAt: string;
}

export interface StockOpnameItem {
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  unit: string;
  unitCost: number;
  notes?: string;
}

export interface StockOpname {
  id: string;
  opnameNumber: string;
  date: string;
  warehouseId: string;
  warehouseName: string;
  status: 'draft' | 'completed';
  items: StockOpnameItem[];
  totalDiscrepancyQty: number;
  totalDiscrepancyValue: number;
  notes?: string;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentDebt: number;
  notes?: string;
  createdAt: string;
}

export interface Receivable {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid';
  createdAt: string;
}

export interface ReceivablePayment {
  id: string;
  receivableId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  bankAccountId?: string;
  notes?: string;
  receivedBy: string;
  date: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  currentDebt: number;
  createdAt: string;
}

export interface Payable {
  id: string;
  purchaseId: string;
  purchaseInvoice: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid';
  createdAt: string;
}

export interface PayablePayment {
  id: string;
  payableId: string;
  purchaseInvoice: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: string;
  bankAccountId?: string;
  notes?: string;
  paidBy: string;
  date: string;
  createdAt: string;
}

export interface CashSession {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  totalCashSales?: number;
  totalExpenses?: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
}

export interface CashMovement {
  id: string;
  sessionId?: string;
  type: 'in' | 'out';
  category: string; // e.g. "Penjualan Tunai", "Beban Operasional", "Setor Bank", "Modal Awal"
  amount: number;
  description: string;
  source?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  category: string; // "Gaji Karyawan", "BBM & Transportasi", "Listrik & Air", "Pemeliharaan Gedung", "Konsumsi & Lainnya"
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer';
  bankAccountId?: string;
  description: string;
  date: string;
  approvedBy?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  isDefault?: boolean;
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number; // default 0 or 11
  enableTax: boolean;
  receiptHeader: string;
  receiptFooter: string;
  lowStockThreshold: number;
  currencySymbol: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}
