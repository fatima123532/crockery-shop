const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const settingsTabCode = `function SettingsTab({ user }) {
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
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors bg-white" />
          </div>
          
          <hr className="border-slate-100 my-6" />
          <h3 className="font-semibold text-sm text-slate-700">Change Password (Optional)</h3>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors bg-white" placeholder="Enter to authorize changes" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:outline-none focus:border-violet-500 transition-colors bg-white" placeholder="Leave blank if not changing" />
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
}`;

const start = code.indexOf('function SettingsTab({ user })');
const end = code.indexOf('}', code.indexOf('</button>', start)) + 1 + 20; // safe approximation, replace manually below
code = code.replace(/function SettingsTab\(\{ user \}\) \{[\s\S]*?\}\n\n/g, settingsTabCode + '\n\n');

// Also fix the dangling </div> in Sidebar from master-clean.cjs
code = code.replace(/<div className="p-3 border-t border-slate-100">\n          <div className="mt-2            \n          <\/div>\n          <div className="mt-3 flex items-center gap-3 p-2">/g, 
  '<div className="p-3 border-t border-slate-100">\n          <div className="mt-2 flex items-center gap-3 p-2">');

code = code.replace(/<div className="p-3 border-t border-slate-100">\n          <div className="mt-2\n            \n          <\/div>\n          <div className="mt-3 flex items-center gap-3 p-2">/g, 
  '<div className="p-3 border-t border-slate-100">\n          <div className="mt-2 flex items-center gap-3 p-2">');

// Another pattern in Sidebar just to be sure
code = code.replace(/<div className="p-3 border-t border-slate-100">\n          <div className="mt-2[\s\S]*?<div className="mt-3 flex items-center gap-3 p-2">/g, '<div className="p-3 border-t border-slate-100">\n          <div className="mt-2 flex items-center gap-3 p-2">');

fs.writeFileSync('src/App.jsx', code, 'utf8');
