const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Sidebar changes
code = code.replace(/<Database className="w-3 h-3" \/>SQLite • JWT/g, 'Inventory System');
code = code.replace(/<div className="p-3">\s*<div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">[\s\S]*?<\/div>\s*<div className="mt-3/g, '<div className="p-3 border-t border-slate-100">\n          <div className="mt-2');

// Header changes
code = code.replace(/{dataLoading \? 'Syncing DB\.\.\.' : 'DB Synced'}/g, "{dataLoading ? 'Syncing...' : 'Live'}");

// Dashboard changes
code = code.replace(/Dashboard • Backend Live/g, 'Dashboard');
code = code.replace(/<p className="text-slate-500 mt-1 flex items-center gap-2"><Database className="w-4 h-4" \/>SQLite transactional DB • JWT secured • Stock integrity via transactions<\/p>/g, '');
code = code.replace(/trend="DB synced"/g, 'trend="Live"');
code = code.replace(/Recent Transactions \(from DB\)/g, 'Recent Transactions');
code = code.replace(/<span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-1 rounded-full">Live from \/api\/sales<\/span>/g, '');

// Products Page changes
code = code.replace(/Products & Stock • DB Backed/g, 'Products & Stock');
code = code.replace(/<p className="text-sm text-slate-500">POST \/api\/products • Transactional adjustments • FK protected<\/p>/g, '');
code = code.replace(/Recent Stock Adjustments \(from DB\)/g, 'Recent Stock Adjustments');
code = code.replace(/Edit Product \(PUT \/api\/products\/:id\)/g, 'Edit Product');
code = code.replace(/Add Product \(POST \/api\/products\)/g, 'Add Product');

// POS remaining text
code = code.replace(/<div className="hidden md:flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 rounded-xl font-semibold"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" \/>POS Transactional • JWT Secured<\/div>/g, '');
code = code.replace(/Sale completed via transactional API! Stock auto-deducted in DB./g, 'Sale completed! Stock updated.');
code = code.replace(/DB: crockery.db<br\/>JWT Secured Transaction/g, 'Receipt');

fs.writeFileSync('src/App.jsx', code, 'utf8');
