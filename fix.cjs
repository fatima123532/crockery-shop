const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(/placeholder=""/g, 'placeholder="********"');
fs.writeFileSync('src/App.jsx', code, 'utf8');
