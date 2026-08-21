import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Wallet,
  BarChart3, Users, Settings, LogOut, Search, Bell,
  Plus, Edit3, Trash2, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, PackageX, Eye, X, Upload, Minus, Check, Filter,
  Calendar, CreditCard, Banknote, Smartphone, Printer,
  FileDown, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  Boxes, ChefHat, CupSoda, UtensilsCrossed, Sparkles, ShieldCheck, Database
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Constants ---
const CATEGORIES = ['Plates', 'Cups & Mugs', 'Bowls', 'Glasses', 'Tea Sets', 'Dinner Sets', 'Serving Dishes', 'Kitchen Items', 'Other'];
const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'bank', label: 'Bank Transfer', icon: CreditCard },
  { id: 'jazzcash', label: 'JazzCash', icon: Smartphone },
  { id: 'easypaisa', label: 'Easypaisa', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
];
const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Salaries', 'Transportation', 'Packaging', 'Repairs', 'Other'];
const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

// --- API Helper with JWT ---
// For deployment: set VITE_API_URL to your backend URL (e.g. https://api.yourshop.com/api)
// For single-server deployment, keep /api (backend serves frontend static)
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const getToken = () => localStorage.getItem('crockery_token');
const setTokenStorage = (t) => { if (t) localStorage.setItem('crockery_token', t); else localStorage.removeItem('crockery_token'); };

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setTokenStorage(null);
    throw new Error('Unauthorized - please login again');
  }
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `API Error ${res.status}`);
  return data;
}

// --- Main App ---
export default function App() {
  const [auth, setAuth] = useState(null);
  const [token, setToken] = useState(getToken());
  const [authLoading, setAuthLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stockAdjustments, setStockAdjustments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setAuthLoading(false); return; }
    apiFetch('/auth/me').then(user => {
      setAuth(user);
      setAuthLoading(false);
    }).catch(() => {
      setToken(null);
      setTokenStorage(null);
      setAuthLoading(false);
    });
  }, [token]);

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const [prods, sups, custs, sal, pur, exp, adj] = await Promise.all([
        apiFetch('/products'),
        apiFetch('/suppliers'),
        apiFetch('/customers'),
        apiFetch('/sales'),
        apiFetch('/purchases'),
        apiFetch('/expenses'),
        apiFetch('/adjustments').catch(()=>[])
      ]);
      // Normalize backend snake_case to frontend camelCase
      const normProducts = prods.map(p => ({
        id: p.id, name: p.name, sku: p.sku, category: p.category, brand: p.brand,
        purchasePrice: p.purchase_price ?? p.purchasePrice,
        sellingPrice: p.selling_price ?? p.sellingPrice,
        quantity: p.quantity, minStock: p.min_stock ?? p.minStock,
        supplierId: p.supplier_id ?? p.supplierId,
        image: p.image, damaged: p.damaged || 0, supplierName: p.supplier_name
      }));
      const normCustomers = custs.map(c => ({
        id: c.id, name: c.name, phone: c.phone, address: c.address,
        totalSpent: c.total_spent ?? c.totalSpent ?? 0,
        outstanding: c.outstanding ?? 0
      }));
      const normSales = sal.map(s => ({
        id: s.id, date: s.date,
        customerId: s.customerId ?? s.customer_id,
        customerName: s.customerName ?? s.customer_name ?? 'Walk-in Customer',
        customerPhone: s.customerPhone,
        subtotal: s.subtotal, discount: s.discount, tax: s.tax,
        finalAmount: s.finalAmount ?? s.final_amount,
        paymentMethod: s.paymentMethod ?? s.payment_method,
        profit: s.profit,
        items: s.items || []
      }));
      const normPurchases = pur.map(p => ({
        id: p.id, date: p.date, supplierId: p.supplierId ?? p.supplier_id,
        total: p.total, items: p.items || []
      }));
      setProducts(normProducts);
      setSuppliers(sups);
      setCustomers(normCustomers);
      setSales(normSales);
      setPurchases(normPurchases);
      setExpenses(exp);
      setStockAdjustments(adj);
    } catch (e) {
      console.error('Fetch error', e);
      alert('Failed to load data: ' + e.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (auth) fetchAll();
  }, [auth]);

  // Auth actions
  const handleLogin = async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setTokenStorage(data.token);
    setToken(data.token);
    setAuth(data.user);
  };
  const handleLogout = () => {
    setTokenStorage(null);
    setToken(null);
    setAuth(null);
  };

  // Product actions
  const createProduct = async (product) => {
    const created = await apiFetch('/products', { method: 'POST', body: JSON.stringify(product) });
    await fetchAll();
    return created;
  };
  const updateProduct = async (id, product) => {
    await apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) });
    await fetchAll();
  };
  const deleteProduct = async (id) => {
    await apiFetch(`/products/${id}`, { method: 'DELETE' });
    await fetchAll();
  };
  const adjustStock = async (id, type, qty, reason) => {
    await apiFetch(`/products/${id}/adjust`, { method: 'POST', body: JSON.stringify({ type, qty, reason }) });
    await fetchAll();
  };

  // Sales
  const createSale = async (saleData) => {
    const sale = await apiFetch('/sales', { method: 'POST', body: JSON.stringify(saleData) });
    await fetchAll();
    return sale;
  };

  // Purchases
  const createPurchase = async (data) => {
    const res = await apiFetch('/purchases', { method: 'POST', body: JSON.stringify(data) });
    await fetchAll();
    return res;
  };
  const createSupplier = async (data) => {
    const res = await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(data) });
    await fetchAll();
    return res;
  };
  const createCustomer = async (data) => {
    const res = await apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) });
    await fetchAll();
    return res;
  };
  const createExpense = async (data) => {
    const res = await apiFetch('/expenses', { method: 'POST', body: JSON.stringify(data) });
    await fetchAll();
    return res;
  };
  const deleteExpense = async (id) => {
    await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fcfaf7]"><div className="flex flex-col items-center gap-3"><div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" /><div className="text-sm text-slate-500">Verifying secure session...</div></div></div>;
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-slate-800">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} user={auth} />
        <div className="flex-1 min-h-screen lg:ml-[280px]">
          <Header activeTab={activeTab} setSidebarOpen={setSidebarOpen} products={products} sales={sales} dataLoading={dataLoading} onRefresh={fetchAll} />
          <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {activeTab === 'dashboard' && <Dashboard products={products} sales={sales} expenses={expenses} customers={customers} />}
            {activeTab === 'products' && <ProductsPage products={products} suppliers={suppliers} stockAdjustments={stockAdjustments} onCreate={createProduct} onUpdate={updateProduct} onDelete={deleteProduct} onAdjust={adjustStock} />}
            {activeTab === 'sales' && <SalesPage products={products} sales={sales} customers={customers} onCreateSale={createSale} onRefresh={fetchAll} />}
            {activeTab === 'purchases' && <PurchasesPage products={products} purchases={purchases} suppliers={suppliers} onCreatePurchase={createPurchase} onCreateSupplier={createSupplier} />}
            {activeTab === 'expenses' && <ExpensesPage expenses={expenses} onCreate={createExpense} onDelete={deleteExpense} />}
            {activeTab === 'reports' && <ReportsPage products={products} sales={sales} expenses={expenses} purchases={purchases} />}
            {activeTab === 'customers' && <CustomersPage customers={customers} sales={sales} onCreate={createCustomer} />}
            {activeTab === 'suppliers' && <SuppliersPage suppliers={suppliers} purchases={purchases} onCreate={createSupplier} />}
            {activeTab === 'settings' && <SettingsTab user={auth} />}
          </main>
        </div>
      </div>
    </div>
  );
}

// --- Login ---
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@crockery.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
      
      {/* 3D Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[50%] bg-gradient-to-br from-violet-300 to-indigo-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] bg-gradient-to-br from-fuchsia-300 to-purple-400 rounded-full blur-3xl opacity-30 animate-pulse delay-700"></div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 relative perspective-1000">
        
        <div className="flex items-center gap-3 mb-8 transform hover:scale-105 transition-transform duration-500">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <ChefHat className="text-white w-7 h-7 relative z-10 drop-shadow-md" />
          </div>
          <span className="font-display font-bold text-3xl tracking-tight text-slate-800 drop-shadow-sm">Crockery House</span>
        </div>

        <div className="w-full max-w-md relative group">
          {/* 3D shadow layers behind card */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 translate-y-4 translate-x-4"></div>
          <div className="absolute inset-0 bg-white/50 rounded-[2rem] -rotate-3 border border-white/40 shadow-inner"></div>
          
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] p-10 relative z-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 transform transition-all duration-500 hover:translate-y-[-4px]">
            <div className="mb-10 text-center">
              <h2 className="font-display text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 mt-2 text-sm">Sign in to manage your inventory</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Email Address</label>
                <div className="relative group/input">
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 bg-white/50 backdrop-blur-sm transition-all text-slate-800 shadow-inner" placeholder="********" />
                  <Users className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within/input:text-violet-500 transition-colors" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Password</label>
                <div className="relative group/input">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 bg-white/50 backdrop-blur-sm transition-all text-slate-800 shadow-inner" placeholder="********" />
                  <Settings className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within/input:text-violet-500 transition-colors" />
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50/80 backdrop-blur border border-red-100 rounded-xl p-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
              
              <button type="submit" disabled={loading} className="w-full h-14 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-[0_10px_40px_-10px_rgba(99,102,241,0.8)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]">
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sidebar ---
function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, onLogout, user }) {
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'sales', label: 'Sales / POS', icon: ShoppingCart },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Boxes },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-screen w-[280px] bg-white border-r border-slate-100 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/20"><ChefHat className="text-white w-5 h-5" /></div>
            <div>
              <div className="font-display font-bold text-[15px] leading-none">Crockery House</div>
              <div className="text-[11px] text-slate-500 font-medium tracking-widest uppercase mt-1 flex items-center gap-1">Inventory System</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menu.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium transition ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="mt-2 flex items-center gap-3 p-2">
            <img src="https://i.pravatar.cc/100?img=33" className="w-8 h-8 rounded-full" />
            <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{user?.name || 'Shop Owner'}</div><div className="text-[11px] text-slate-500">{user?.role} • {user?.email}</div></div>
            <button onClick={onLogout} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ activeTab, setSidebarOpen, products, sales, dataLoading, onRefresh }) {
  const lowStock = products.filter(p => p.quantity <= p.minStock).length;
  const todaySales = sales.filter(s => { try { return format(new Date(s.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'); } catch { return false; } }).length;
  return (
    <header className="sticky top-0 z-30 bg-[#fcfaf7]/80 backdrop-blur-xl border-b border-slate-100">
      <div className="flex items-center gap-3 h-[72px] px-4 md:px-8">
        <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 bg-white border rounded-xl flex items-center justify-center"><LayoutDashboard className="w-4 h-4" /></button>
        <div className="flex-1 flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm"><span className="text-slate-400">Shop</span><span className="text-slate-300">/</span><span className="font-semibold capitalize">{activeTab}</span></div>
          <div className="hidden md:flex items-center gap-2 ml-6">
            <div className="flex items-center gap-2 bg-white border rounded-full px-3 h-9 text-xs font-semibold">
              <div className={`w-2 h-2 rounded-full ${dataLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} /> {dataLoading ? 'Syncing...' : 'Live'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 h-8 flex items-center gap-2 text-xs font-semibold"><AlertTriangle className="w-3.5 h-3.5" />{lowStock} low stock</div>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full px-3 h-8 flex items-center gap-2 text-xs font-semibold"><TrendingUp className="w-3.5 h-3.5" />{todaySales} sales today</div>
          </div>
          <button onClick={onRefresh} className="w-9 h-9 bg-white border rounded-full flex items-center justify-center hover:bg-slate-50"><TrendingUp className="w-4 h-4" /></button>
          <button className="w-9 h-9 bg-white border rounded-full flex items-center justify-center relative"><Bell className="w-4 h-4" /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /></button>
        </div>
      </div>
    </header>
  );
}

// --- Dashboard (same UI but backend data) ---
function Dashboard({ products, sales, expenses, customers }) {
  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalQty = products.reduce((s, p) => s + (p.quantity || 0), 0);
    const lowStock = products.filter(p => p.quantity <= p.minStock);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todaySales = sales.filter(s => { try { return format(new Date(s.date), 'yyyy-MM-dd') === todayStr; } catch { return false; } });
    const monthSales = sales.filter(s => { try { return format(new Date(s.date), 'yyyy-MM') === format(new Date(), 'yyyy-MM'); } catch { return false; } });
    const totalRevenue = sales.reduce((s, x) => s + (x.finalAmount || 0), 0);
    const totalExpenses = expenses.reduce((s, x) => s + (x.amount || 0), 0);
    const totalCOGS = sales.reduce((s, sale) => s + (sale.items || []).reduce((a, it) => a + (it.cost || 0) * it.qty, 0), 0);
    const netProfit = totalRevenue - totalCOGS - totalExpenses;
    return { totalProducts, totalQty, lowStock, todaySales, monthSales, totalRevenue, totalExpenses, totalCOGS, netProfit };
  }, [products, sales, expenses]);

  const revenueChart = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = subDays(new Date(), 13 - i);
      const key = format(d, 'yyyy-MM-dd');
      const daySales = sales.filter(s => { try { return format(new Date(s.date), 'yyyy-MM-dd') === key; } catch { return false; } });
      return { date: format(d, 'MMM dd'), revenue: daySales.reduce((s, x) => s + (x.finalAmount || 0), 0), profit: daySales.reduce((s, x) => s + (x.profit || 0), 0) };
    });
    return days;
  }, [sales]);

  const categoryChart = useMemo(() => {
    const map = {};
    sales.forEach(s => (s.items || []).forEach(it => {
      const prod = products.find(p => p.id === it.productId || it.product_id);
      const cat = prod?.category || 'Other';
      map[cat] = (map[cat] || 0) + it.qty * it.price;
    }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  const bestSelling = useMemo(() => {
    const map = {};
    sales.forEach(s => (s.items || []).forEach(it => {
      const id = it.productId || it.product_id;
      map[id] = (map[id] || 0) + it.qty;
    }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, qty]) => {
      const p = products.find(x => x.id === id);
      return { name: p?.name || id, qty, revenue: qty * (p?.sellingPrice || 0) };
    });
  }, [sales, products]);

  const profitExpenseChart = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    return months.map((m, i) => {
      const monthSales = sales.filter(s => { try { return new Date(s.date).getMonth() === i; } catch { return false; } });
      const monthExp = expenses.filter(e => { try { return new Date(e.date).getMonth() === i; } catch { return false; } });
      return { month: m, profit: monthSales.reduce((s, x) => s + (x.profit || 0), 0), expenses: monthExp.reduce((s, x) => s + x.amount, 0) };
    });
  }, [sales, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          
        </div>
        <div className="flex gap-2">
          <div className="bg-white border rounded-xl px-4 h-10 flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-slate-400" />{format(new Date(), 'EEEE, MMM d, yyyy')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Products" value={metrics.totalProducts} sub={`${metrics.totalQty} units in stock`} icon={Package} color="violet" trend="Live" />
        <StatCard title="Today Sales" value={`Rs ${metrics.todaySales.reduce((s, x) => s + (x.finalAmount || 0), 0).toLocaleString()}`} sub={`${metrics.todaySales.length} orders today`} icon={DollarSign} color="emerald" trend="+12% vs yesterday" />
        <StatCard title="Monthly Revenue" value={`Rs ${metrics.monthSales.reduce((s, x) => s + (x.finalAmount || 0), 0).toLocaleString()}`} sub={`${metrics.monthSales.length} transactions`} icon={TrendingUp} color="blue" trend="+8.2%" />
        <StatCard title="Net Profit" value={`Rs ${metrics.netProfit.toLocaleString()}`} sub={`COGS Rs ${metrics.totalCOGS.toLocaleString()}`} icon={Wallet} color="amber" trend={metrics.netProfit > 0 ? 'Profitable' : 'Loss'} negative={metrics.netProfit < 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Low-stock Alerts</h3><span className="bg-red-50 text-red-700 border border-red-100 text-xs font-bold px-2.5 py-1 rounded-full">{metrics.lowStock.length} items</span></div>
          <div className="space-y-3 max-h-[320px] overflow-auto">
            {metrics.lowStock.length === 0 ? <div className="text-sm text-slate-500 py-8 text-center">All stocked! 🎉</div> : metrics.lowStock.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-100 bg-amber-50/60">
                <img src={p.image} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{p.name}</div><div className="text-xs text-slate-500">{p.quantity} left • Min {p.minStock}</div></div>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">Revenue - Last 14 Days</h3><div className="flex items-center gap-3 text-xs"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-600" />Revenue</span><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Profit</span></div></div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Sales by Category</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryChart} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {categoryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-[20px] border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Profit vs Expenses</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitExpenseChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="profit" fill="#7c3aed" radius={[8,8,0,0]} />
                <Bar dataKey="expenses" fill="#f59e0b" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-[20px] border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Best Selling</h3>
          <div className="space-y-3">
            {bestSelling.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{i+1}</div>
                <div className="flex-1"><div className="text-sm font-medium truncate">{item.name}</div><div className="text-xs text-slate-500">{item.qty} sold • Rs {item.revenue.toLocaleString()}</div></div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between"><h3 className="font-semibold">Recent Transactions</h3></div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold"><tr><th className="text-left p-3">Invoice</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Items</th><th className="text-left p-3">Method</th><th className="text-right p-3">Amount</th><th className="text-right p-3">Profit</th></tr></thead>
            <tbody>
              {sales.slice(0,6).map(s => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="p-3 font-medium font-mono">{s.id}</td>
                  <td className="p-3">{s.customerName}</td>
                  <td className="p-3">{s.items.length} item • {s.items.reduce((a,b)=>a+b.qty,0)} qty</td>
                  <td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs capitalize">{s.paymentMethod}</span></td>
                  <td className="p-3 text-right font-semibold">Rs {(s.finalAmount || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-600">+Rs {(s.profit || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, trend, negative }) {
  const colorMap = {
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className="bg-white rounded-[20px] border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}><Icon className="w-5 h-5" /></div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${negative ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>{trend}</span>
      </div>
      <div className="mt-4"><div className="text-[13px] text-slate-500 font-medium">{title}</div><div className="font-display font-bold text-2xl mt-1 tracking-tight">{value}</div><div className="text-xs text-slate-400 mt-1">{sub}</div></div>
    </div>
  );
}

// --- Products Page with Backend ---
function ProductsPage({ products, suppliers, stockAdjustments, onCreate, onUpdate, onDelete, onAdjust }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesStock = stockFilter === 'All' || (stockFilter === 'Low' && p.quantity <= p.minStock) || (stockFilter === 'InStock' && p.quantity > p.minStock) || (stockFilter === 'Out' && p.quantity === 0);
    return matchesSearch && matchesCat && matchesStock;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this product? Blocked if sales history exists (DB integrity).')) return;
    try { await onDelete(id); } catch (e) { alert(e.message); }
  };

  const handleSaveProduct = async (product) => {
    try {
      if (editing) await onUpdate(editing.id, product);
      else await onCreate(product);
      setShowAdd(false); setEditing(null);
    } catch (e) { alert(e.message); }
  };

  const handleStockAdjust = async (type, qty, reason) => {
    if (!adjusting) return;
    try { await onAdjust(adjusting.id, type, qty, reason); setAdjusting(null); } catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-bold">Products & Stock</h1></div>
        <button onClick={() => setShowAdd(true)} className="h-10 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Add Product</button>
      </div>
      <div className="bg-white rounded-[16px] border p-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-10 flex-1 min-w-[200px]"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="********" /></div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm"><option>All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="h-10 rounded-xl border bg-white px-3 text-sm"><option value="All">All Stock</option><option value="Low">Low Stock</option><option value="InStock">In Stock</option><option value="Out">Out of Stock</option></select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(product => {
          const low = product.quantity <= product.minStock;
          const margin = product.purchasePrice ? ((product.sellingPrice - product.purchasePrice) / product.purchasePrice * 100).toFixed(0) : 0;
          return (
            <div key={product.id} className={`bg-white rounded-[20px] border shadow-sm overflow-hidden hover:shadow-md transition ${low ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'}`}>
              <div className="relative h-[160px] bg-slate-50">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-white/90 backdrop-blur border shadow-sm">{product.category}</span>
                  {low && <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-red-600 text-white">Low Stock</span>}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => setAdjusting(product)} className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center"><Boxes className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setEditing(product); setShowAdd(true); }} className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center"><Edit3 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="absolute bottom-2 right-2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-full">{product.quantity} pcs</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-[14px] leading-tight line-clamp-2 flex-1">{product.name}</h3><span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono">{product.sku}</span></div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><span className="bg-slate-50 border px-2 py-0.5 rounded-full">{product.brand}</span><span>{product.supplierName || 'Direct'}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-2 border"><div className="text-[10px] text-slate-500 uppercase font-bold">Purchase</div><div className="font-semibold text-sm">Rs {product.purchasePrice?.toLocaleString()}</div></div>
                  <div className="bg-violet-50 rounded-xl p-2 border border-violet-100"><div className="text-[10px] text-violet-600 uppercase font-bold">Selling +{margin}%</div><div className="font-semibold text-sm text-violet-900">Rs {product.sellingPrice?.toLocaleString()}</div></div>
                </div>
                {product.damaged > 0 && <div className="mt-2 text-xs bg-red-50 border border-red-100 text-red-700 rounded-xl p-2 flex items-center gap-1.5"><PackageX className="w-3.5 h-3.5" />{product.damaged} damaged</div>}
                <div className="mt-3 flex gap-1.5">
                  <button onClick={() => setAdjusting(product)} className="flex-1 h-8 bg-white border rounded-xl text-xs font-semibold flex items-center justify-center gap-1"><Plus className="w-3 h-3" />Stock</button>
                  <button onClick={() => handleDelete(product.id)} className="w-8 h-8 bg-white border rounded-xl flex items-center justify-center hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showAdd && <ProductModal initial={editing} onClose={() => { setShowAdd(false); setEditing(null); }} onSave={handleSaveProduct} suppliers={suppliers} />}
      {adjusting && <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onAdjust={handleStockAdjust} />}
      <div className="bg-white rounded-[16px] border p-5">
        <h3 className="font-semibold text-sm mb-3">Recent Stock Adjustments</h3>
        <div className="space-y-2 max-h-[200px] overflow-auto">
          {stockAdjustments.slice(0,10).map(a => (
            <div key={a.id} className="text-xs flex justify-between border-b py-1.5"><span>{a.productName} • {a.type} {a.qty} • {a.prevQty}→{a.newQty}</span><span className="text-slate-500">{a.reason}</span></div>
          ))}
          {stockAdjustments.length===0 && <div className="text-xs text-slate-400">No adjustments yet - use stock button</div>}
        </div>
      </div>
    </div>
  );
}

function ProductModal({ initial, onClose, onSave, suppliers }) {
  const [form, setForm] = useState(initial || { name: '', sku: '', category: CATEGORIES[0], brand: '', purchasePrice: '', sellingPrice: '', quantity: '', minStock: 5, supplierId: suppliers[0]?.id || '', image: '' });
  const [imagePreview, setImagePreview] = useState(initial?.image || '');
  const handleImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { setImagePreview(reader.result); setForm(f => ({ ...f, image: reader.result })); }; reader.readAsDataURL(file);
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between"><h3 className="font-display font-bold text-lg">{initial ? 'Edit Product' : 'Add Product'}</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase">Product Image</label>
              <div className="mt-2 border-2 border-dashed rounded-2xl h-[160px] flex items-center justify-center bg-slate-50 overflow-hidden relative">
                {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <div className="text-center p-4"><Upload className="mx-auto w-6 h-6 text-slate-400" /><div className="text-xs text-slate-500 mt-1">Upload</div></div>}
                <input type="file" accept="image/*" onChange={handleImage} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold">Product Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
              <div><label className="text-xs font-semibold">SKU *</label><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50 font-mono text-sm" /></div>
              <div><label className="text-xs font-semibold">Brand</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
              <div><label className="text-xs font-semibold">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-semibold">Supplier</label><select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50">{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="text-xs font-semibold">Purchase Price *</label><input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
              <div><label className="text-xs font-semibold">Selling Price *</label><input type="number" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
              <div><label className="text-xs font-semibold">Quantity *</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
              <div><label className="text-xs font-semibold">Min Stock</label><input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2"><button onClick={onClose} className="h-11 px-5 rounded-xl border">Cancel</button><button onClick={() => {
          if (!form.name || !form.sku || !form.purchasePrice || !form.sellingPrice) return alert('Required fields missing');
          onSave({ ...form, purchasePrice: Number(form.purchasePrice), sellingPrice: Number(form.sellingPrice), quantity: Number(form.quantity), minStock: Number(form.minStock) });
        }} className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center gap-2"><Check className="w-4 h-4" />{initial ? 'Update in DB' : 'Create in DB'}</button></div>
      </div>
    </div>
  );
}

function StockAdjustModal({ product, onClose, onAdjust }) {
  const [type, setType] = useState('add');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] w-full max-w-md shadow-2xl">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Adjust Stock - POST /api/products/{product.id}/adjust</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {[{ id: 'add', label: 'Add Stock', icon: Plus }, { id: 'remove', label: 'Remove', icon: Minus }, { id: 'damage', label: 'Damaged', icon: PackageX }].map(t => (
              <button key={t.id} onClick={() => setType(t.id)} className={`flex-1 h-11 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 ${type === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}><t.icon className="w-3.5 h-3.5" />{t.label}</button>
            ))}
          </div>
          <div><label className="text-xs font-semibold">Quantity</label><input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50" /></div>
          <div><label className="text-xs font-semibold">Reason</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="********" /></div>
          <div className="bg-slate-50 border rounded-xl p-3 text-sm"><div className="text-xs text-slate-500">Current: {product.quantity} • After: {type === 'add' ? product.quantity + qty : product.quantity - qty}</div></div>
        </div>
        <div className="p-4 flex justify-end gap-2 border-t"><button onClick={onClose} className="h-10 px-4 rounded-xl border">Cancel</button><button onClick={() => onAdjust(type, qty, reason)} className="h-10 px-6 rounded-xl bg-slate-900 text-white font-semibold">Confirm Transaction</button></div>
      </div>
    </div>
  );
}

// --- Sales Page Backend ---
function SalesPage({ products, sales, customers, onCreateSale, onRefresh }) {
  const [showNewSale, setShowNewSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [search, setSearch] = useState('');
  const filteredSales = sales.filter(s => s.id.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-bold">Sales / POS • Transactional</h1><p className="text-sm text-slate-500">POST /api/sales → checks stock → decrements in transaction → updates customer</p></div>
        <button onClick={() => setShowNewSale(true)} className="h-11 px-5 bg-violet-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/20"><Plus className="w-4 h-4" />New Sale (F2)</button>
      </div>
      <div className="bg-white rounded-[16px] border p-3 flex gap-2">
        <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-10 flex-1"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="********" /></div>
        
      </div>
      <div className="bg-white rounded-[20px] border shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Invoice</th><th className="text-left p-3">Customer</th><th className="text-left p-3">Items</th><th className="text-left p-3">Payment</th><th className="text-right p-3">Total</th><th className="text-right p-3">Profit</th><th className="text-right p-3">Actions</th></tr></thead>
            <tbody>
              {filteredSales.map(sale => (
                <tr key={sale.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 text-xs">{(() => { try { return format(new Date(sale.date), 'MMM dd, hh:mm a'); } catch { return sale.date; } })()}</td>
                  <td className="p-3 font-mono font-semibold">{sale.id}</td>
                  <td className="p-3">{sale.customerName}</td>
                  <td className="p-3">{sale.items.length} • Qty {sale.items.reduce((a, b) => a + b.qty, 0)}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-slate-100 rounded-full text-xs capitalize">{sale.paymentMethod}</span></td>
                  <td className="p-3 text-right font-bold">Rs {(sale.finalAmount || 0).toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-600 font-medium">Rs {(sale.profit || 0).toLocaleString()}</td>
                  <td className="p-3 text-right"><button onClick={() => setSelectedSale(sale)} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-slate-900 hover:text-white"><Eye className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showNewSale && <NewSaleModalBackend products={products} customers={customers} onCreateSale={onCreateSale} onClose={() => setShowNewSale(false)} />}
      {selectedSale && <InvoiceModal sale={selectedSale} onClose={() => setSelectedSale(null)} />}
    </div>
  );
}

function NewSaleModalBackend({ products, customers, onCreateSale, onClose }) {
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [search, setSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    const handler = (e) => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  const addToCart = (product) => {
    if (product.quantity <= 0) return alert('Out of stock');
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      if (existing.qty + 1 > product.quantity) return alert(`Only ${product.quantity} available`);
      setCart(cart.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, qty: 1, price: product.sellingPrice, cost: product.purchasePrice, max: product.quantity }]);
    }
  };

  const updateQty = (id, qty) => {
    if (qty < 1) setCart(cart.filter(c => c.productId !== id));
    else {
      const prod = products.find(p => p.id === id);
      if (qty > prod.quantity) return alert(`Only ${prod.quantity} available`);
      setCart(cart.map(c => c.productId === id ? { ...c, qty } : c));
    }
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmount = subtotal * (discount / 100);
  const finalAmount = subtotal - discountAmount;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return alert('Add products');
    setSubmitting(true);
    try {
      await onCreateSale({
        customerName, customerPhone,
        customerId: customers.find(c => c.name === customerName)?.id || null,
        items: cart.map(c => ({ productId: c.productId, qty: c.qty })),
        discount, tax: 0, paymentMethod
      });
      onClose();
      alert('Sale completed! Stock updated.');
    } catch (e) {
      alert('Sale failed: ' + e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-[#fcfaf7] rounded-[24px] w-full max-w-[1200px] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col lg:flex-row">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b bg-white flex items-center justify-between"><h3 className="font-display font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-violet-600" />POS • POST /api/sales transactional</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
          <div className="p-4 bg-white border-b">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="flex items-center gap-2 bg-slate-50 border-2 border-violet-200 rounded-xl px-3 h-12 focus-within:border-violet-500"><Search className="w-5 h-5 text-slate-400" /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="********" /></div>
                {search && (
                  <div className="absolute top-[52px] left-0 right-0 bg-white border rounded-xl shadow-xl z-10 max-h-[300px] overflow-auto">
                    {filteredProducts.length === 0 ? <div className="p-3 text-sm text-slate-500">No products found</div> : filteredProducts.map(p => (
                      <button key={p.id} onClick={() => { addToCart(p); setSearch(''); }} className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-3 border-b last:border-0">
                        <img src={p.image} className="w-10 h-10 rounded-lg object-cover" /><div className="flex-1"><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-slate-500">{p.sku} • {p.quantity} left • Rs {p.sellingPrice}</div></div><div className={`text-xs px-2 py-1 rounded-full font-bold ${p.quantity <= p.minStock ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{p.quantity} pcs</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2 bg-[#fcfaf7]">
            {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-center p-8"><div className="w-20 h-20 bg-white border rounded-full flex items-center justify-center mb-4"><CupSoda className="w-8 h-8 text-slate-300" /></div><div className="font-semibold">Cart is empty</div><div className="text-sm text-slate-500">Search and add crockery items</div></div> :
              cart.map(item => (
                <div key={item.productId} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                  <div className="flex-1"><div className="text-sm font-medium">{item.name}</div><div className="text-xs text-slate-500">Rs {item.price.toLocaleString()} × {item.qty} = Rs {(item.price * item.qty).toLocaleString()}</div></div>
                  <div className="flex items-center gap-2 bg-slate-50 border rounded-full p-1"><button onClick={() => updateQty(item.productId, item.qty - 1)} className="w-7 h-7 bg-white rounded-full border flex items-center justify-center"><Minus className="w-3 h-3" /></button><span className="w-8 text-center text-sm font-bold">{item.qty}</span><button onClick={() => updateQty(item.productId, item.qty + 1)} className="w-7 h-7 bg-white rounded-full border flex items-center justify-center"><Plus className="w-3 h-3" /></button></div>
                  <div className="text-sm font-bold">Rs {(item.price * item.qty).toLocaleString()}</div>
                </div>
              ))}
          </div>
        </div>
        <div className="w-full lg:w-[380px] bg-white border-l flex flex-col">
          <div className="p-5 space-y-4 flex-1 overflow-auto">
            <div>
              <label className="text-xs font-bold uppercase">Customer</label>
              <div className="mt-1 relative">
                <input value={customerName} onChange={e => { setCustomerName(e.target.value); setShowCustomerList(true); }} onFocus={() => setShowCustomerList(true)} className="w-full h-11 px-3 rounded-xl border bg-slate-50 text-sm font-medium" />
                {showCustomerList && customerName.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 bg-white border rounded-xl shadow-lg z-20 max-h-[150px] overflow-auto">
                    {customers.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).slice(0,5).map(c => (
                      <button key={c.id} onClick={() => { setCustomerName(c.name); setCustomerPhone(c.phone); setShowCustomerList(false); }} className="w-full text-left p-2.5 hover:bg-slate-50 text-sm border-b"><div className="font-medium">{c.name}</div><div className="text-xs text-slate-500">{c.phone}</div></button>
                    ))}
                    <button onClick={() => setShowCustomerList(false)} className="w-full p-2 text-xs text-slate-400">Close</button>
                  </div>
                )}
              </div>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="********" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`h-[64px] rounded-xl border flex flex-col items-center justify-center gap-1 ${paymentMethod === m.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50'}`}><m.icon className="w-5 h-5" /><span className="text-[11px] font-semibold">{m.label}</span></button>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold uppercase">Discount %</label>
              <div className="mt-1 flex gap-2"><input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="flex-1 h-11 px-3 rounded-xl border bg-slate-50" />{[0,5,10].map(v => <button key={v} onClick={() => setDiscount(v)} className={`px-3 rounded-xl border text-sm font-bold ${discount===v?'bg-violet-600 text-white border-violet-600':'bg-white'}`}>{v}%</button>)}</div>
            </div>
            <div className="bg-slate-900 text-white rounded-[16px] p-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-300"><span>Subtotal ({cart.reduce((a,b)=>a+b.qty,0)} items)</span><span>Rs {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-slate-300"><span>Discount {discount}%</span><span>- Rs {discountAmount.toLocaleString()}</span></div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between font-bold text-lg"><span>Total Payable</span><span>Rs {finalAmount.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="p-4 border-t bg-slate-50">
            <button onClick={handleCompleteSale} disabled={cart.length===0 || submitting} className="w-full h-12 bg-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 shadow-lg shadow-violet-600/20">{submitting ? 'Processing Transaction...' : <><DollarSign className="w-5 h-5" />Complete Sale • Rs {finalAmount.toLocaleString()}</>}</button>
            <div className="mt-2 text-[11px] text-center text-slate-500">Backend validates stock in transaction - strong consistency</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ sale, onClose }) {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Crockery House - Invoice', 14, 20);
    doc.setFontSize(10); doc.text(`Invoice: ${sale.id} | Date: ${sale.date} | Customer: ${sale.customerName}`, 14, 27);
    autoTable(doc, { startY: 32, head: [['Item', 'Qty', 'Price', 'Total']], body: sale.items.map(i => [i.name, i.qty, `Rs ${i.price}`, `Rs ${i.price * i.qty}`]), foot: [['', '', 'Subtotal', `Rs ${sale.subtotal}`], ['', '', `Discount ${sale.discount}%`, `-Rs ${(sale.subtotal * sale.discount /100).toFixed(0)}`], ['', '', 'Total', `Rs ${sale.finalAmount}`]] });
    doc.save(`Invoice-${sale.id}.pdf`);
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] w-full max-w-xl shadow-2xl max-h-[90vh] overflow-auto">
        <div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Invoice {sale.id} • DB Record</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between"><div><div className="font-display font-bold text-lg">Crockery House</div><div className="text-xs text-slate-500">Receipt</div></div><div className="text-right text-xs"><div className="font-bold">{sale.id}</div><div>{sale.date}</div><div className="mt-1 px-2 py-1 bg-slate-100 rounded-full inline-block">{sale.paymentMethod}</div></div></div>
          <table className="w-full text-sm"><thead className="text-xs text-slate-500 uppercase border-b"><tr><th className="text-left py-2">Item</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead><tbody>{sale.items.map((it, idx) => <tr key={idx} className="border-b last:border-0"><td className="py-2">{it.name}</td><td className="text-center">{it.qty}</td><td className="text-right">Rs {it.price?.toLocaleString()}</td><td className="text-right">Rs {(it.price*it.qty).toLocaleString()}</td></tr>)}</tbody></table>
          <div className="space-y-1 text-sm text-right"><div>Subtotal: Rs {sale.subtotal?.toLocaleString()}</div><div>Discount ({sale.discount}%): -Rs {(sale.subtotal * sale.discount /100).toLocaleString()}</div><div className="font-bold text-base border-t pt-2">Total: Rs {sale.finalAmount?.toLocaleString()}</div></div>
        </div>
        <div className="p-4 border-t flex gap-2 justify-end bg-slate-50"><button onClick={handleDownloadPDF} className="h-10 px-4 rounded-xl bg-slate-900 text-white flex items-center gap-2 text-sm font-semibold"><FileDown className="w-4 h-4" />Download PDF</button></div>
      </div>
    </div>
  );
}

// --- Remaining Pages (Purchases, Expenses, Reports, Customers, Suppliers) - simplified with backend calls ---

function PurchasesPage({ products, purchases, suppliers, onCreatePurchase, onCreateSupplier }) {
  const [showNew, setShowNew] = useState(false);
  const [showSupplier, setShowSupplier] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl font-bold">Purchases • DB Transactions</h1><p className="text-sm text-slate-500">POST /api/purchases → auto-increase stock in transaction</p></div>
        <div className="flex gap-2"><button onClick={() => setShowSupplier(true)} className="h-10 px-4 bg-white border rounded-xl text-sm font-semibold">+ Supplier</button><button onClick={() => setShowNew(true)} className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Add Purchase</button></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-[20px] border shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between"><h3 className="font-semibold">Recent Purchases from DB</h3><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{purchases.length} records</span></div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Supplier</th><th className="text-left p-3">Items</th><th className="text-right p-3">Total Cost</th></tr></thead><tbody>{purchases.map(p => <tr key={p.id} className="border-t hover:bg-slate-50"><td className="p-3 text-xs">{(() => { try { return format(new Date(p.date), 'MMM dd'); } catch { return p.date; } })()}</td><td className="p-3 font-medium">{suppliers.find(s => s.id === p.supplierId)?.name || p.supplierId}</td><td className="p-3">{p.items.length} types • {p.items.reduce((a,b)=>a+b.qty,0)} pcs</td><td className="p-3 text-right font-bold">Rs {p.total?.toLocaleString()}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="bg-white rounded-[20px] border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Top Suppliers • DB Aggregated</h3>
          <div className="space-y-3">
            {suppliers.map(s => {
              const total = purchases.filter(p => p.supplierId === s.id).reduce((sum, p) => sum + (p.total || 0), 0);
              return <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50"><div className="w-9 h-9 rounded-full bg-white border flex items-center justify-center font-bold text-xs">{s.name[0]}</div><div className="flex-1"><div className="text-sm font-medium">{s.name}</div><div className="text-xs text-slate-500">Rs {total.toLocaleString()} purchased</div></div></div>;
            })}
          </div>
        </div>
      </div>
      {showNew && <PurchaseModalBackend products={products} suppliers={suppliers} onCreate={onCreatePurchase} onClose={() => setShowNew(false)} />}
      {showSupplier && <SupplierModalBackend onClose={() => setShowSupplier(false)} onCreate={onCreateSupplier} />}
    </div>
  );
}

function PurchaseModalBackend({ products, suppliers, onCreate, onClose }) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0,6);
  const addItem = (prod) => { if (items.find(i => i.productId === prod.id)) return; setItems([...items, { productId: prod.id, name: prod.name, qty: 1, cost: prod.purchasePrice }]); };
  const total = items.reduce((s,i)=>s+i.qty*i.cost,0);
  const handleSave = async () => {
    if (!supplierId || items.length===0) return alert('Select supplier and items');
    setSubmitting(true);
    try { await onCreate({ supplierId, items }); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
      <div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">New Purchase • POST /api/purchases</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <div className="p-5 space-y-4">
        <div><label className="text-xs font-semibold">Supplier FK</label><select value={supplierId} onChange={e=>setSupplierId(e.target.value)} className="mt-1 w-full h-11 px-3 rounded-xl border bg-slate-50">{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="text-xs font-semibold">Search Product</label><div className="mt-1 flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-11"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e=>setSearch(e.target.value)} className="bg-transparent outline-none flex-1 text-sm" placeholder="********" /></div>
          {search && <div className="mt-2 border rounded-xl overflow-hidden">{filtered.map(p=><button key={p.id} onClick={()=>{addItem(p); setSearch('');}} className="w-full text-left p-2.5 hover:bg-slate-50 text-sm flex justify-between"><span>{p.name}</span><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{p.quantity} in stock</span></button>)}</div>}
        </div>
        <div className="space-y-2">{items.map(it=><div key={it.productId} className="flex items-center gap-2 bg-slate-50 border rounded-xl p-2"><div className="flex-1 text-sm font-medium">{it.name}</div><input type="number" value={it.qty} onChange={e=>setItems(items.map(x=>x.productId===it.productId?{...x,qty:Number(e.target.value)}:x))} className="w-16 h-8 rounded-lg border px-2 text-sm" /><input type="number" value={it.cost} onChange={e=>setItems(items.map(x=>x.productId===it.productId?{...x,cost:Number(e.target.value)}:x))} className="w-24 h-8 rounded-lg border px-2 text-sm" /><button onClick={()=>setItems(items.filter(x=>x.productId!==it.productId))} className="w-8 h-8 bg-white border rounded-full flex items-center justify-center"><X className="w-3 h-3" /></button></div>)}</div>
        <div className="bg-slate-900 text-white rounded-xl p-4 flex justify-between font-bold"><span>Total Cost</span><span>Rs {total.toLocaleString()}</span></div>
      </div>
      <div className="p-4 border-t flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-xl border">Cancel</button><button disabled={submitting} onClick={handleSave} className="h-10 px-6 rounded-xl bg-slate-900 text-white font-semibold">{submitting ? 'Saving Transaction...' : 'Save Purchase & Add Stock'}</button></div>
    </div></div>
  );
}

function SupplierModalBackend({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleAdd = async () => {
    if (!form.name) return alert('Name required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-[20px] w-full max-w-md shadow-2xl">
      <div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Add Supplier • POST /api/suppliers</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <div className="p-5 space-y-3">
        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="********" />
        <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="********" />
        <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="********" />
        <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="********" />
      </div>
      <div className="p-4 border-t flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-xl border">Cancel</button><button disabled={submitting} onClick={handleAdd} className="h-10 px-6 rounded-xl bg-slate-900 text-white">{submitting ? '...' : 'Add to DB'}</button></div>
    </div></div>
  );
}

// --- Expenses, Reports, Customers, Suppliers (backend versions) ---
function ExpensesPage({ expenses, onCreate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('All');
  const filtered = expenses.filter(e => filter==='All' || e.category===filter).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const total = filtered.reduce((s,e)=>s+e.amount,0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Expenses • DB</h1><p className="text-sm text-slate-500">POST /api/expenses • Relational • Net profit derived</p></div><button onClick={()=>setShowAdd(true)} className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Add Expense</button></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{k:'All',v:expenses.reduce((s,e)=>s+e.amount,0)},{k:'Rent',v:expenses.filter(e=>e.category==='Rent').reduce((s,e)=>s+e.amount,0)},{k:'Salaries',v:expenses.filter(e=>e.category==='Salaries').reduce((s,e)=>s+e.amount,0)},{k:'Today',v:expenses.filter(e=>{try{return format(new Date(e.date),'yyyy-MM-dd')===format(new Date(),'yyyy-MM-dd');}catch{return false;}}).reduce((s,e)=>s+e.amount,0)}].map(b=><div key={b.k} className="bg-white border rounded-[16px] p-4"><div className="text-xs text-slate-500 uppercase font-bold">{b.k}</div><div className="font-bold text-lg mt-1">Rs {b.v.toLocaleString()}</div></div>)}
      </div>
      <div className="bg-white rounded-[16px] border p-3 flex gap-2 flex-wrap"><select value={filter} onChange={e=>setFilter(e.target.value)} className="h-10 px-3 rounded-xl border bg-white text-sm"><option>All</option>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select><div className="ml-auto text-sm bg-slate-50 border px-3 h-10 flex items-center rounded-xl font-semibold">Filtered Total: Rs {total.toLocaleString()}</div></div>
      <div className="bg-white rounded-[20px] border shadow-sm overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left p-3">Date</th><th className="text-left p-3">Category</th><th className="text-left p-3">Description</th><th className="text-right p-3">Amount</th><th className="text-right p-3"></th></tr></thead><tbody>{filtered.map(e=><tr key={e.id} className="border-t hover:bg-slate-50"><td className="p-3 text-xs">{(() => { try { return format(new Date(e.date),'MMM dd, yyyy'); } catch { return e.date; } })()}</td><td className="p-3"><span className="px-2 py-1 bg-slate-100 rounded-full text-xs">{e.category}</span></td><td className="p-3">{e.description}</td><td className="p-3 text-right font-bold">Rs {e.amount.toLocaleString()}</td><td className="p-3 text-right"><button onClick={async()=>{if(confirm('Delete expense?')) { try{await onDelete(e.id);}catch(err){alert(err.message);} }}} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>)}</tbody></table></div>
      {showAdd && <ExpenseModalBackend onClose={()=>setShowAdd(false)} onCreate={onCreate} />}
    </div>
  );
}
function ExpenseModalBackend({ onClose, onCreate }) {
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], description: '', amount: '', date: new Date().toISOString().slice(0,10) });
  const [submitting, setSubmitting] = useState(false);
  const handleSave = async () => {
    if (!form.amount) return alert('Amount required');
    setSubmitting(true);
    try { await onCreate({ ...form, amount: Number(form.amount), date: new Date(form.date).toISOString() }); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-[20px] w-full max-w-md shadow-2xl">
      <div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Add Expense • POST /api/expenses</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <div className="p-5 space-y-3">
        <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full h-11 px-3 rounded-xl border bg-slate-50">{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full h-11 px-3 rounded-xl border bg-slate-50" />
        <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="********" />
        <input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="********" />
      </div>
      <div className="p-4 border-t flex justify-end gap-2"><button onClick={onClose} className="h-10 px-4 rounded-xl border">Cancel</button><button disabled={submitting} onClick={handleSave} className="h-10 px-6 rounded-xl bg-slate-900 text-white">{submitting ? 'Saving...' : 'Save to DB'}</button></div>
    </div></div>
  );
}

function ReportsPage({ products, sales, expenses, purchases }) {
  const [range, setRange] = useState('month');
  const [custom, setCustom] = useState({ from: format(subDays(new Date(), 30),'yyyy-MM-dd'), to: format(new Date(),'yyyy-MM-dd') });

  const filtered = useMemo(() => {
    const now = new Date();
    let start, end;
    if (range==='today'){ start = new Date(now.setHours(0,0,0,0)); end = new Date(); }
    else if (range==='week'){ start = startOfWeek(new Date()); end = endOfWeek(new Date()); }
    else if (range==='month'){ start = startOfMonth(new Date()); end = endOfMonth(new Date()); }
    else if (range==='year'){ start = new Date(new Date().getFullYear(),0,1); end = new Date(); }
    else { start = new Date(custom.from); end = new Date(custom.to); }
    const inRange = (d) => { try{ return isWithinInterval(new Date(d), { start, end }); } catch { return true; } };
    const fSales = sales.filter(s=>inRange(s.date));
    const fExp = expenses.filter(e=>inRange(e.date));
    const fPurch = purchases.filter(p=>inRange(p.date));
    return { fSales, fExp, fPurch, start, end };
  }, [range, custom, sales, expenses, purchases]);

  const totals = useMemo(() => {
    const revenue = filtered.fSales.reduce((s,x)=>s+(x.finalAmount||0),0);
    const cogs = filtered.fSales.reduce((s,sale)=>s+(sale.items||[]).reduce((a,it)=>a+(it.cost||0)*it.qty,0),0);
    const gross = revenue - cogs;
    const exp = filtered.fExp.reduce((s,e)=>s+e.amount,0);
    const net = gross - exp;
    return { revenue, cogs, gross, exp, net, count: filtered.fSales.length };
  }, [filtered]);

  const best = useMemo(() => {
    const map = {};
    filtered.fSales.forEach(s=>(s.items||[]).forEach(it=>{ const id = it.productId || it.product_id; map[id] = map[id] || { qty:0,revenue:0,name:it.name,cost:it.cost,price:it.price }; map[id].qty+=it.qty; map[id].revenue+=it.qty*it.price; }));
    const arr = Object.values(map).sort((a,b)=>b.qty-a.qty);
    return arr.slice(0,5);
  }, [filtered]);

  const exportCSV = () => {
    const rows = [['Date','Invoice','Customer','Amount','Profit'] , ...filtered.fSales.map(s=>[format(new Date(s.date),'yyyy-MM-dd'), s.id, s.customerName, s.finalAmount, s.profit])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`sales-${range}.csv`; a.click();
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Crockery House Report - ${range} • Backend DB`,14,15);
    doc.text(`Revenue: Rs ${totals.revenue} | COGS: Rs ${totals.cogs} | Gross: Rs ${totals.gross} | Expenses: Rs ${totals.exp} | Net: Rs ${totals.net}`,14,22);
    autoTable(doc,{ startY:30, head:[['Date','Invoice','Customer','Amount','Profit']], body: filtered.fSales.map(s=>[format(new Date(s.date),'yyyy-MM-dd'), s.id, s.customerName, s.finalAmount, s.profit]) });
    doc.save(`report-${range}.pdf`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Revenue & Profit Reports • DB Queries</h1><p className="text-sm text-slate-500">Real DB aggregation • GET /api/reports/summary</p></div><div className="flex gap-2"><button onClick={exportCSV} className="h-10 px-4 bg-white border rounded-xl text-sm font-semibold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" />Excel CSV</button><button onClick={exportPDF} className="h-10 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><FileDown className="w-4 h-4" />Export PDF</button></div></div>

      <div className="bg-white rounded-[16px] border p-3 flex flex-wrap gap-2 items-center">
        {[{id:'today',label:'Today'},{id:'week',label:'This Week'},{id:'month',label:'This Month'},{id:'year',label:'This Year'},{id:'custom',label:'Custom'}].map(r=><button key={r.id} onClick={()=>setRange(r.id)} className={`h-9 px-4 rounded-full text-sm font-semibold border ${range===r.id?'bg-slate-900 text-white border-slate-900':'bg-slate-50 hover:bg-white'}`}>{r.label}</button>)}
        {range==='custom' && <div className="flex gap-2 items-center ml-2"><input type="date" value={custom.from} onChange={e=>setCustom({...custom,from:e.target.value})} className="h-9 px-2 rounded-xl border text-sm" /><span className="text-sm">to</span><input type="date" value={custom.to} onChange={e=>setCustom({...custom,to:e.target.value})} className="h-9 px-2 rounded-xl border text-sm" /></div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border rounded-[16px] p-4"><div className="text-xs uppercase font-bold text-slate-500">Total Sales</div><div className="font-bold text-xl mt-1">Rs {totals.revenue.toLocaleString()}</div><div className="text-xs text-slate-500 mt-1">{totals.count} transactions</div></div>
        <div className="bg-white border rounded-[16px] p-4"><div className="text-xs uppercase font-bold text-slate-500">COGS</div><div className="font-bold text-xl mt-1">Rs {totals.cogs.toLocaleString()}</div><div className="text-xs text-slate-500">Product costs</div></div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-4"><div className="text-xs uppercase font-bold text-emerald-700">Gross Profit</div><div className="font-bold text-xl mt-1 text-emerald-800">Rs {totals.gross.toLocaleString()}</div><div className="text-xs text-emerald-600">{totals.cogs>0?(totals.gross/totals.revenue*100).toFixed(1):0}% margin</div></div>
        <div className="bg-amber-50 border border-amber-100 rounded-[16px] p-4"><div className="text-xs uppercase font-bold text-amber-700">Total Expenses</div><div className="font-bold text-xl mt-1 text-amber-800">Rs {totals.exp.toLocaleString()}</div><div className="text-xs text-amber-600">{filtered.fExp.length} records</div></div>
        <div className={`border rounded-[16px] p-4 ${totals.net>=0?'bg-violet-600 text-white border-violet-600':'bg-red-600 text-white border-red-600'}`}><div className="text-xs uppercase font-bold opacity-80">Net Profit</div><div className="font-bold text-xl mt-1">Rs {totals.net.toLocaleString()}</div><div className="text-xs opacity-80">{totals.net>=0?'Profitable':'Loss'} period</div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[20px] border p-5"><h3 className="font-semibold mb-4">Best-selling Products • DB Aggregation</h3><div className="space-y-3">{best.map((b,i)=><div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border bg-slate-50"><div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">{i+1}</div><div className="flex-1"><div className="text-sm font-medium truncate">{b.name}</div><div className="text-xs text-slate-500">{b.qty} sold • Rs {b.revenue.toLocaleString()} revenue</div></div></div>)}</div></div>
        <div className="bg-white rounded-[20px] border p-5"><h3 className="font-semibold mb-4">Sales Summary • GET /api/reports/summary</h3><div className="text-sm space-y-2"><div className="flex justify-between border-b py-2"><span>Total Revenue</span><span className="font-bold">Rs {totals.revenue.toLocaleString()}</span></div><div className="flex justify-between border-b py-2"><span>COGS</span><span className="font-bold">Rs {totals.cogs.toLocaleString()}</span></div><div className="flex justify-between border-b py-2"><span>Gross Profit</span><span className="font-bold text-emerald-600">Rs {totals.gross.toLocaleString()}</span></div><div className="flex justify-between border-b py-2"><span>Total Expenses</span><span className="font-bold text-amber-600">Rs {totals.exp.toLocaleString()}</span></div><div className="flex justify-between py-2 text-base"><span>Net Profit</span><span className="font-bold">Rs {totals.net.toLocaleString()}</span></div></div></div>
      </div>
    </div>
  );
}

function CustomersPage({ customers, sales, onCreate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold">Customers • DB</h1><p className="text-sm text-slate-500">GET /api/customers • total_spent aggregated</p></div><button onClick={()=>setShowAdd(true)} className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Add Customer</button></div>
      <div className="bg-white rounded-[16px] border p-3 flex gap-2"><div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-10 flex-1"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="********" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c=>{
          const cSales = sales.filter(s=>s.customerName===c.name || s.customerId===c.id);
          return <div key={c.id} className="bg-white rounded-[20px] border p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex gap-3"><img src={`https://i.pravatar.cc/100?u=${c.id}`} className="w-10 h-10 rounded-full" /><div><div className="font-semibold text-sm">{c.name}</div><div className="text-xs text-slate-500">{c.phone}</div></div></div>{c.outstanding>0 && <span className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full font-bold">Rs {c.outstanding} due</span>}</div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="bg-slate-50 border rounded-xl p-2.5"><div className="text-slate-500 uppercase font-bold text-[10px]">Total Spent</div><div className="font-bold text-sm">Rs {c.totalSpent.toLocaleString()}</div></div><div className="bg-slate-50 border rounded-xl p-2.5"><div className="text-slate-500 uppercase font-bold text-[10px]">Orders</div><div className="font-bold text-sm">{cSales.length}</div></div></div><div className="mt-3 text-xs text-slate-500">{c.address}</div></div>;
        })}
      </div>
      {showAdd && <CustomerModalBackend onClose={()=>setShowAdd(false)} onCreate={onCreate} />}
    </div>
  );
}
function CustomerModalBackend({ onClose, onCreate }) {
  const [form,setForm]=useState({name:'',phone:'',address:''});
  const [submitting,setSubmitting]=useState(false);
  const handleAdd = async () => {
    if(!form.name) return alert('Name required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-white rounded-[20px] w-full max-w-md shadow-2xl"><div className="p-5 border-b flex items-center justify-between"><h3 className="font-semibold">Add Customer • POST /api/customers</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div><div className="p-5 space-y-3"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full h-10 px-3 border rounded-xl" placeholder="Name" /><button type="submit" className="w-full h-10 bg-slate-900 text-white rounded-xl">{submitting ? '...' : 'Add to DB'}</button></div></div></div>;
}

function SuppliersPage({ suppliers, purchases, onCreate }) {
  const [search,setSearch]=useState('');
  const [showAdd,setShowAdd]=useState(false);
  const filtered = suppliers.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="font-display text-2xl font-bold">Suppliers • DB</h1><p className="text-sm text-slate-500">FK protected • purchases join</p></div><button onClick={()=>setShowAdd(true)} className="h-10 px-5 bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Add Supplier</button></div>
      <div className="bg-white rounded-[16px] border p-3 flex gap-2"><div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-10 flex-1"><Search className="w-4 h-4 text-slate-400" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="********" /></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s=>{ const tot = purchases.filter(p=>p.supplierId===s.id).reduce((sum,p)=>sum+(p.total||0),0); const count = purchases.filter(p=>p.supplierId===s.id).length; return <div key={s.id} className="bg-white rounded-[20px] border p-5 shadow-sm"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold">{s.name[0]}</div><div><div className="font-semibold text-sm">{s.name}</div><div className="text-xs text-slate-500">{s.phone}</div></div></div><div className="mt-4 text-xs text-slate-500">{s.address}</div><div className="mt-4 grid grid-cols-2 gap-2"><div className="bg-slate-50 border rounded-xl p-2.5"><div className="text-[10px] uppercase font-bold text-slate-500">Total Purchases</div><div className="font-bold">Rs {tot.toLocaleString()}</div></div><div className="bg-slate-50 border rounded-xl p-2.5"><div className="text-[10px] uppercase font-bold text-slate-500">Orders</div><div className="font-bold">{count}</div></div></div></div>; })}
      </div>
      {showAdd && <SupplierModalBackend onClose={()=>setShowAdd(false)} onCreate={onCreate} />}
    </div>
  );
}

// --- Settings Tab ---
function SettingsTab({ user }) {
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!password) return alert('Enter a new password');
    setLoading(true);
    setMsg('');
    try {
      await apiFetch('/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify({ email, newPassword: password })
      });
      setMsg('Login info updated successfully!');
      setPassword('');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      
      <div className="bg-white rounded-[20px] border shadow-sm p-6">
        <h2 className="font-semibold text-lg mb-4">Change Login Info</h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Email Address</label>
            <input 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="mt-2 w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50" 
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">New Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="mt-2 w-full h-11 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50" 
              placeholder="********" 
            />
          </div>
          {msg && <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{msg}</div>}
          <button type="submit" disabled={loading} className="h-11 px-6 bg-slate-900 text-white rounded-xl font-semibold hover:bg-black transition flex items-center justify-center gap-2">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

