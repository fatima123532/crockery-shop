const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const newLogin = `// --- Login ---
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
                  <input value={email} onChange={e => setEmail(e.target.value)} className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 bg-white/50 backdrop-blur-sm transition-all text-slate-800 shadow-inner" placeholder="admin@crockery.local" />
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
}`;

code = code.replace(/\/\/ --- Login with Backend ---[\s\S]*?(?=\/\/ --- Sidebar ---)/, newLogin + '\n\n');
fs.writeFileSync('src/App.jsx', code, 'utf8');
