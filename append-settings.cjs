const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const settingsTab = `
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
}`;

fs.writeFileSync('src/App.jsx', code + settingsTab, 'utf8');
