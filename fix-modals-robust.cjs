const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const customerStart = code.indexOf('function CustomerModalBackend');
const customerEnd = code.indexOf('}', code.indexOf('</button></div></div></div>;', customerStart)) + 1;

const supplierStart = code.indexOf('function SupplierModalBackend');
const supplierEnd = code.indexOf('}', code.indexOf('</button></div></div></div>;', supplierStart)) + 1;

const expenseStart = code.indexOf('function ExpenseModalBackend');
const expenseEnd = code.indexOf('}', code.indexOf('</button></div></div></div>;', expenseStart)) + 1;

const customerModal = `function CustomerModalBackend({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name is required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Customer</h3><button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Customer Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="E.g., John Doe" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Phone Number</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="0300-1234567" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Email Address</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="john@example.com" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="123 Main St" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Customer'}</button>
      </form>
    </div>
  </div>;
}`;

const supplierModal = `function SupplierModalBackend({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name is required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Supplier</h3><button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Supplier / Brand Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="E.g., Royal Doulton Dist." /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Phone Number</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="Contact number" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Email Address</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="supplier@example.com" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="Warehouse address" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Supplier'}</button>
      </form>
    </div>
  </div>;
}`;

const expenseModal = `function ExpenseModalBackend({ onClose, onCreate }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: EXPENSE_CATEGORIES[0], description: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return alert('Amount and Description required');
    setSubmitting(true);
    try { await onCreate({ ...form, amount: Number(form.amount) }); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Expense</h3><button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white">{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Description *</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white" placeholder="E.g., Monthly electricity bill" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">Amount (Rs) *</label><input type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white font-mono" placeholder="10000" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Expense'}</button>
      </form>
    </div>
  </div>;
}`;

// Do the replacements backwards so indices don't shift
code = code.substring(0, customerStart) + customerModal + code.substring(customerEnd);

const supplierStart2 = code.indexOf('function SupplierModalBackend');
const supplierEnd2 = code.indexOf('}', code.indexOf('</button></div></div></div>;', supplierStart2)) + 1;
code = code.substring(0, supplierStart2) + supplierModal + code.substring(supplierEnd2);

const expenseStart2 = code.indexOf('function ExpenseModalBackend');
const expenseEnd2 = code.indexOf('}', code.indexOf('</button></div></div></div>;', expenseStart2)) + 1;
code = code.substring(0, expenseStart2) + expenseModal + code.substring(expenseEnd2);

// Fix random "Search..." placeholders across the app that were created by the fix script
code = code.replaceAll('placeholder="Search..."', 'placeholder="Type to search..."');

fs.writeFileSync('src/App.jsx', code, 'utf8');
