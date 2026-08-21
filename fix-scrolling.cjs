const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replaceAll('className="bg-white rounded-[24px] w-full max-w-md shadow-2xl"', 'className="bg-white rounded-[24px] w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"');
code = code.replaceAll('<form onSubmit={handleSubmit} className="p-6 space-y-4">', '<form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">');
fs.writeFileSync('src/App.jsx', code, 'utf8');
