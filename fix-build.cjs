const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Fix the input/button tag error in Add Customer modal
code = code.replace(/<input value=\{form\.name\} onChange=\{e=>setForm\(\{\.\.\.form,name:e\.target\.value\}\)\} placeholder="\*\*\*\*\*\*\*\*">\{submitting \? '\.\.\.' : 'Add to DB'\}<\/button>/g, '<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full h-10 px-3 border rounded-xl" placeholder="Name" /><button type="submit" className="w-full h-10 bg-slate-900 text-white rounded-xl">{submitting ? \'...\' : \'Add to DB\'}</button>');

// Remove duplicate SettingsTab
const parts = code.split('// --- Settings Tab ---');
if (parts.length > 2) {
  code = parts[0] + '// --- Settings Tab ---' + parts[1];
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
