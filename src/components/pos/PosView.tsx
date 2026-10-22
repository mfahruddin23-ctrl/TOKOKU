import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
  User,
  Printer,
  RotateCcw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { Product, SaleItem, Customer, PaymentMethod, Sale } from '../../types';
import { formatRupiah, formatNumber, formatDate, formatDateTime, generateInvoiceNumber } from '../../utils/formatters';

interface PosViewProps {
  onOpenShiftModal: () => void;
}

interface CartItem extends SaleItem {
  maxStock: number;
}

interface HeldCart {
  id: string;
  customerName: string;
  items: CartItem[];
  heldAt: string;
}

export const PosView: React.FC<PosViewProps> = ({ onOpenShiftModal }) => {
  const { products, customers, completeSale, activeCashSession, settings } = useStore();
  const { userProfile } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_umum');
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0);
  const [enablePPN, setEnablePPN] = useState<boolean>(false);
  const [cartNotes, setCartNotes] = useState<string>('');

  // Held transactions state
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [tempoDueDate, setTempoDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptPaperSize, setReceiptPaperSize] = useState<'58mm' | '80mm'>('80mm');

  // USB Barcode listener input ref
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected customer object
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryName));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCategory = selectedCategory === 'all' || p.categoryName === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Barcode Scanner Listener: when input receives Enter
  const handleBarcodeOrSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Search exact barcode match first
    const exactMatch = products.find(
      (p) => p.isActive && (p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.trim().toLowerCase())
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery('');
    } else if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchQuery('');
    }
  };

  // Add product to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`Stok ${product.name} kosong!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Maksimal stok tersedia adalah ${product.stock} ${product.unit}`);
          return prev;
        }
        const newQty = existing.quantity + 1;
        // Check wholesale pricing
        const isWholesale = product.wholesalePrice > 0 && newQty >= (product.minWholesaleQty || 10);
        const unitPrice = isWholesale ? product.wholesalePrice : product.sellingPrice;
        const discountAmt = ((unitPrice * (existing.discountPercent || 0)) / 100);
        const subtotal = (unitPrice - discountAmt) * newQty;

        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQty,
                unitPrice,
                isWholesale,
                subtotal,
              }
            : item
        );
      } else {
        const isWholesale = false;
        const unitPrice = product.sellingPrice;
        const subtotal = unitPrice;

        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.unit,
            quantity: 1,
            purchasePrice: product.purchasePrice,
            unitPrice,
            isWholesale,
            discountPercent: 0,
            discountAmount: 0,
            subtotal,
            maxStock: product.stock,
          },
        ];
      }
    });
  };

  // Update item quantity
  const updateQuantity = (productId: string, newQty: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            if (newQty <= 0) return null;
            const validQty = Math.min(newQty, item.maxStock);
            const prod = products.find((p) => p.id === productId);
            const isWholesale = prod && prod.wholesalePrice > 0 && validQty >= (prod.minWholesaleQty || 10);
            const unitPrice = isWholesale && prod ? prod.wholesalePrice : prod ? prod.sellingPrice : item.unitPrice;
            const discountAmt = ((unitPrice * (item.discountPercent || 0)) / 100);
            const subtotal = (unitPrice - discountAmt) * validQty;

            return {
              ...item,
              quantity: validQty,
              unitPrice,
              isWholesale: !!isWholesale,
              subtotal,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Update item discount percent
  const updateItemDiscount = (productId: string, discountPercent: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.productId === productId) {
          const validPercent = Math.min(100, Math.max(0, discountPercent));
          const discountAmt = (item.unitPrice * validPercent) / 100;
          const subtotal = (item.unitPrice - discountAmt) * item.quantity;
          return {
            ...item,
            discountPercent: validPercent,
            discountAmount: discountAmt,
            subtotal,
          };
        }
        return item;
      });
    });
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    if (cart.length > 0 && confirm('Kosongkan keranjang belanja kasir?')) {
      setCart([]);
      setTransactionDiscount(0);
      setCartNotes('');
    }
  };

  // Hold Transaction
  const holdCurrentCart = () => {
    if (cart.length === 0) return;
    const newHold: HeldCart = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      customerName: currentCustomer?.name || 'Pelanggan Umum',
      items: [...cart],
      heldAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldCarts([...heldCarts, newHold]);
    setCart([]);
    setTransactionDiscount(0);
  };

  // Resume Held Transaction
  const resumeHeldCart = (heldId: string) => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;
    setCart(target.items);
    setHeldCarts(heldCarts.filter((h) => h.id !== heldId));
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const taxAmount = useMemo(() => {
    if (!enablePPN) return 0;
    const taxableAmount = Math.max(0, cartSubtotal - transactionDiscount);
    return Math.round((taxableAmount * (settings.taxRate || 11)) / 100);
  }, [cartSubtotal, transactionDiscount, enablePPN, settings.taxRate]);

  const grandTotal = useMemo(() => {
    const afterDiscount = Math.max(0, cartSubtotal - transactionDiscount);
    return afterDiscount + taxAmount;
  }, [cartSubtotal, transactionDiscount, taxAmount]);

  // Open Checkout
  const handleOpenCheckout = () => {
    if (!activeCashSession) {
      alert('Shift kasir belum dibuka! Silakan buka shift kasir terlebih dahulu.');
      onOpenShiftModal();
      return;
    }
    if (cart.length === 0) {
      alert('Keranjang belanja masih kosong.');
      return;
    }

    // Default cash tendered to grandTotal
    setCashTendered(grandTotal);
    setPaymentMethod('cash');
    setIsCheckoutOpen(true);
  };

  // Quick preset bill buttons
  const applyQuickBill = (amount: number) => {
    setCashTendered(amount);
  };

  // Process checkout
  const handleProcessSale = async () => {
    if (paymentMethod === 'cash' && cashTendered < grandTotal) {
      alert(`Uang tunai yang dibayarkan kurang! Total: ${formatRupiah(grandTotal)}, Dibayar: ${formatRupiah(cashTendered)}`);
      return;
    }

    // Tempo check
    if (paymentMethod === 'credit_tempo') {
      if (!currentCustomer || currentCustomer.id === 'cust_umum') {
        alert('Penjualan Tempo (Kredit) hanya berlaku untuk pelanggan terdaftar! Silakan pilih pelanggan.');
        return;
      }
      if (currentCustomer.creditLimit > 0) {
        const potentialDebt = currentCustomer.currentDebt + grandTotal;
        if (potentialDebt > currentCustomer.creditLimit) {
          const proceed = confirm(
            `PERINGATAN: Piutang pelanggan ini (${formatRupiah(potentialDebt)}) akan melebihi plafon kredit (${formatRupiah(currentCustomer.creditLimit)}). Lanjutkan transaksi tempo?`
          );
          if (!proceed) return;
        }
      }
    }

    setIsProcessing(true);
    try {
      const invoiceNumber = generateInvoiceNumber('INV');
      const paidAmount = paymentMethod === 'credit_tempo' ? 0 : paymentMethod === 'cash' ? cashTendered : grandTotal;
      const changeAmount = paymentMethod === 'cash' ? Math.max(0, cashTendered - grandTotal) : 0;
      const paymentStatus = paymentMethod === 'credit_tempo' ? 'credit' : 'paid';

      const saleRecord: Omit<Sale, 'id' | 'createdAt'> = {
        invoiceNumber,
        date: new Date().toISOString(),
        cashierId: userProfile.id,
        cashierName: userProfile.displayName,
        customerId: selectedCustomerId,
        customerName: currentCustomer?.name || 'Pelanggan Umum',
        items: cart,
        subtotal: cartSubtotal,
        discountTotal: transactionDiscount,
        taxPercent: enablePPN ? settings.taxRate || 11 : 0,
        taxAmount,
        grandTotal,
        paymentMethod,
        paymentStatus,
        paidAmount,
        changeAmount,
        dueDate: paymentMethod === 'credit_tempo' ? tempoDueDate : undefined,
        notes: cartNotes,
      };

      const result = await completeSale(saleRecord);

      // Confetti celebration
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });

      // Show receipt modal
      setCompletedSale(result);
      setIsCheckoutOpen(false);
      // Reset cart
      setCart([]);
      setTransactionDiscount(0);
      setCartNotes('');
    } catch (err) {
      console.error('Error completing sale:', err);
      alert('Gagal menyelesaikan transaksi: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* LEFT COLUMN: Product Catalog & Search */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800">
        {/* Top search & category bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
          <form onSubmit={handleBarcodeOrSearchSubmit} className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Scan Barcode USB atau cari Nama Produk / SKU (Tekan Enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-24 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
              <Barcode className="w-3.5 h-3.5 text-blue-400" />
              <span>SCANNER</span>
            </div>
          </form>

          {/* Category Chips Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
              <Barcode className="w-12 h-12 text-slate-600 mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-400">Tidak ada produk yang cocok</p>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan scanner barcode atau ketik kata kunci pencarian lainnya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const inCart = cart.find((c) => c.productId === prod.id);
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock <= prod.minStock && prod.stock > 0;

                return (
                  <button
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    disabled={isOutOfStock}
                    className={`text-left p-3 rounded-xl border flex flex-col justify-between transition-all relative group ${
                      isOutOfStock
                        ? 'bg-slate-900/40 border-slate-800/50 opacity-50 cursor-not-allowed'
                        : inCart
                        ? 'bg-blue-950/30 border-blue-500/50 hover:border-blue-400 ring-1 ring-blue-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 shadow-sm'
                    }`}
                  >
                    {/* Badge in cart */}
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="truncate max-w-[80px]">{prod.sku}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-sans font-semibold ${
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Stok: {prod.stock} {prod.unit}
                        </span>
                      </div>

                      <h4 className="font-semibold text-xs text-white line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">
                          {formatRupiah(prod.sellingPrice)}
                        </div>
                        {prod.wholesalePrice > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            Grosir: {formatRupiah(prod.wholesalePrice)} (&ge;{prod.minWholesaleQty || 10})
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        /{prod.unit}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Checkout */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-slate-900 flex flex-col justify-between shrink-0 shadow-2xl">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Keranjang Penjualan</h3>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold font-mono">
                {cart.length} item
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {heldCarts.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Hold ({heldCarts.length})</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-xl hidden group-hover:block z-30 space-y-1">
                    {heldCarts.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => resumeHeldCart(h.id)}
                        className="w-full text-left p-1.5 rounded hover:bg-slate-700 text-xs text-slate-200 flex justify-between"
                      >
                        <span className="truncate">{h.customerName}</span>
                        <span className="text-amber-400 text-[10px]">{h.items.length} item</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {cart.length > 0 && (
                <button
                  onClick={holdCurrentCart}
                  title="Simpan sementara antrean"
                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <PauseCircle className="w-4 h-4" />
                </button>
              )}

              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  title="Kosongkan keranjang"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.currentDebt > 0 ? `(Hutang: ${formatRupiah(c.currentDebt)})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
              <ShoppingCart className="w-10 h-10 text-slate-700 mb-2 stroke-1" />
              <p className="text-xs text-slate-400 font-medium">Keranjang masih kosong</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih atau scan barcode barang di sebelah kiri.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-2 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white leading-tight truncate">
                      {item.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{formatRupiah(item.unitPrice)}/{item.unit}</span>
                      {item.isWholesale && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                          Harga Grosir
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Quantity Counter */}
                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                      className="w-12 text-center bg-transparent text-xs font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-3">
          {/* Discount & Tax Options */}
          <div className="space-y-1.5 text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center justify-between">
              <span>Subtotal Barang:</span>
              <span className="font-semibold text-slate-200">{formatRupiah(cartSubtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>Diskon Transaksi:</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Rp</span>
                <input
                  type="number"
                  placeholder="0"
                  value={transactionDiscount || ''}
                  onChange={(e) => setTransactionDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-right text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePPN}
                  onChange={(e) => setEnablePPN(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                />
                <span>PPN ({settings.taxRate || 11}%):</span>
              </label>
              <span className="font-semibold text-slate-200">{formatRupiah(taxAmount)}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Pembayaran:
            </span>
            <span className="text-2xl font-black text-white tracking-tight">
              {formatRupiah(grandTotal)}
            </span>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              cart.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Bayar Sekarang (F8)</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT & PAYMENT */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Penyelesaian Transaksi Kasir</h3>
                <p className="text-xs text-slate-400">Pilih metode pembayaran dan masukkan nominal</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Grand Total Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Yang Harus Dibayar
                </p>
                <p className="text-3xl font-black text-emerald-400 mt-1">
                  {formatRupiah(grandTotal)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pelanggan: <span className="font-semibold text-white">{currentCustomer?.name}</span>
                </p>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span className="text-xs">Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-md shadow-blue-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs">Transfer Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_tempo')}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'credit_tempo'
                        ? 'bg-amber-600 text-white border-amber-500 font-bold shadow-md shadow-amber-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Tempo (Kredit)</span>
                  </button>
                </div>
              </div>

              {/* Payment Details Based on Method */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Quick Preset Cash Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => applyQuickBill(grandTotal)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickBill(50000)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
                    >
                      50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickBill(100000)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
                    >
                      100.000
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickBill(200000)}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
                    >
                      200.000
                    </button>
                  </div>

                  {/* Kembalian Calculation */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">Kembalian:</span>
                    <span
                      className={`text-lg font-bold ${
                        cashTendered >= grandTotal ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {cashTendered >= grandTotal
                        ? formatRupiah(cashTendered - grandTotal)
                        : `Kurang ${formatRupiah(grandTotal - cashTendered)}`}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit_tempo' && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Penjualan Tempo (Piutang Pelanggan)</span>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Tanggal Jatuh Tempo</label>
                    <input
                      type="date"
                      value={tempoDueDate}
                      onChange={(e) => setTempoDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sisa tagihan akan otomatis dicatat dalam modul Piutang Pelanggan dan menambah saldo hutang pelanggan.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing || (paymentMethod === 'cash' && cashTendered < grandTotal)}
                onClick={handleProcessSale}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? 'Memproses...' : 'Konfirmasi & Cetak Struk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THERMAL RECEIPT PREVIEW (58mm / 80mm) */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Struk Penjualan Berhasil</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setReceiptPaperSize('58mm')}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                    receiptPaperSize === '58mm'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  58mm
                </button>
                <button
                  onClick={() => setReceiptPaperSize('80mm')}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                    receiptPaperSize === '80mm'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            {/* Thermal Receipt Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 flex justify-center">
              <div
                className={`bg-white text-black p-4 font-mono text-xs shadow-lg leading-tight receipt-container ${
                  receiptPaperSize === '58mm' ? 'w-[58mm] text-[10px]' : 'w-[80mm]'
                }`}
              >
                {/* Store Header */}
                <div className="text-center pb-2 border-b border-dashed border-gray-400">
                  <h4 className="font-bold text-sm">{settings.storeName}</h4>
                  <p className="text-[11px]">{settings.tagline}</p>
                  <p className="text-[10px] mt-0.5">{settings.address}</p>
                  <p className="text-[10px]">Telp: {settings.phone}</p>
                </div>

                {/* Invoice Meta */}
                <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>No. Faktur:</span>
                    <span className="font-bold">{completedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>{formatDateTime(completedSale.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{completedSale.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span>{completedSale.customerName}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-2 border-b border-dashed border-gray-400 space-y-1.5">
                  {completedSale.items.map((it, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold truncate">{it.productName}</div>
                      <div className="flex justify-between text-gray-700">
                        <span>
                          {it.quantity} {it.unit} x {formatNumber(it.unitPrice)}
                        </span>
                        <span className="font-semibold">{formatNumber(it.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation Totals */}
                <div className="py-2 border-b border-dashed border-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(completedSale.subtotal)}</span>
                  </div>
                  {completedSale.discountTotal > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Diskon:</span>
                      <span>-{formatRupiah(completedSale.discountTotal)}</span>
                    </div>
                  )}
                  {completedSale.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>PPN ({completedSale.taxPercent}%):</span>
                      <span>{formatRupiah(completedSale.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(completedSale.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1">
                    <span>Bayar ({completedSale.paymentMethod.toUpperCase()}):</span>
                    <span>{formatRupiah(completedSale.paidAmount)}</span>
                  </div>
                  {completedSale.changeAmount > 0 && (
                    <div className="flex justify-between text-[11px]">
                      <span>Kembalian:</span>
                      <span className="font-bold">{formatRupiah(completedSale.changeAmount)}</span>
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="text-center pt-3 text-[10px] space-y-1 text-gray-600">
                  <p>{settings.receiptFooter}</p>
                  <p className="font-bold">*** SIMPAN STRUK INI ***</p>
                </div>
              </div>
            </div>

            {/* Print & Close Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center gap-3 no-print">
              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Tutup & Transaksi Baru
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Thermal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
