const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Replace CustomerModal
code = code.replace(/function CustomerModal\(\{ onClose, onCreate \}\) \{[\s\S]*?\}\n\n/g, `function CustomerModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name is required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Customer</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Customer Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="E.g., John Doe" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Phone Number</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="0300-1234567" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Email Address</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="john@example.com" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="123 Main St" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Customer'}</button>
      </form>
    </div>
  </div>;
}

`);

// Replace SupplierModal
code = code.replace(/function SupplierModal\(\{ onClose, onCreate \}\) \{[\s\S]*?\}\n\n/g, `function SupplierModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return alert('Name is required');
    setSubmitting(true);
    try { await onCreate(form); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Supplier</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Supplier / Brand Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="E.g., Royal Doulton Dist." /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Phone Number</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="Contact number" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Email Address</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="supplier@example.com" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="Warehouse address" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Supplier'}</button>
      </form>
    </div>
  </div>;
}

`);

// Replace ExpenseModal
code = code.replace(/function ExpenseModal\(\{ onClose, onCreate \}\) \{[\s\S]*?\}\n\n/g, `function ExpenseModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), category: EXPENSE_CATEGORIES[0], description: '', amount: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) return alert('Amount and Description required');
    setSubmitting(true);
    try { await onCreate({ ...form, amount: Number(form.amount) }); onClose(); } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-[24px] w-full max-w-md shadow-2xl">
      <div className="p-6 border-b flex items-center justify-between"><h3 className="font-display font-bold text-lg">Add Expense</h3><button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none bg-white">{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Description *</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none" placeholder="E.g., Monthly electricity bill" /></div>
        <div><label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Amount (Rs) *</label><input type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="mt-1 w-full h-12 px-4 border-2 border-slate-100 rounded-xl focus:border-violet-500 focus:outline-none font-mono" placeholder="10000" /></div>
        <button type="submit" disabled={submitting} className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold mt-2">{submitting ? 'Saving...' : 'Save Expense'}</button>
      </form>
    </div>
  </div>;
}

`);

// Replace SettingsTab
code = code.replace(/function SettingsTab\(\{ user \}\) \{[\s\S]*?\}\n/g, `function SettingsTab({ user }) {
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(''); setError('');
    try {
      await apiFetch('/auth/me/settings', {
        method: 'PUT',
        body: JSON.stringify({ email, currentPassword, newPassword: password })
      });
      setMsg('Settings updated successfully!');
      setCurrentPassword('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-100 to-indigo-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <h2 className="font-display font-bold text-xl mb-6 relative z-10 text-slate-800">Change Account Settings</h2>
        
        <form onSubmit={handleUpdate} className="space-y-5 relative z-10">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address</label>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          
          <hr className="border-slate-100 my-6" />
          <h3 className="font-semibold text-sm text-slate-700">Change Password (Optional)</h3>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors" placeholder="Enter to authorize changes" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors" placeholder="Leave blank if not changing" />
          </div>
          
          {msg && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 font-medium flex items-center gap-2"><Check className="w-4 h-4" />{msg}</div>}
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
          
          <button type="submit" disabled={loading} className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
`);

// Clean all remaining empty or asterisk placeholders in other locations
code = code.replaceAll('placeholder="********"', 'placeholder="Search..."');

fs.writeFileSync('src/App.jsx', code, 'utf8');
