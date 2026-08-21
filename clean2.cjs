const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Sidebar remaining text
code = code.replace(/<p className="text-xs text-emerald-700\/80 mt-1">API:3001 • DB:crockery.db • Auth: Bearer JWT • Transactions ON<\/p>/g, '');

// POS Header remaining text
code = code.replace(/<div className="hidden md:flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 rounded-xl font-semibold"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" \/>POS Transactional • JWT Secured<\/div>/g, '');

// POS Alert
code = code.replace(/Sale completed via transactional API! Stock auto-deducted in DB./g, 'Sale completed! Stock updated.');

// Receipt
code = code.replace(/DB: crockery.db<br\/>JWT Secured Transaction/g, 'Receipt');

// Any trailing strange placeholders
code = code.replace(/placeholder=""/g, 'placeholder="********"');

fs.writeFileSync('src/App.jsx', code, 'utf8');
