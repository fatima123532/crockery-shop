const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
code = code.replace(/placeholder="."/g, 'placeholder="********"');
code = code.replace(/placeholder="\ufffd"/g, 'placeholder="********"');
fs.writeFileSync('src/App.jsx', code, 'utf8');
