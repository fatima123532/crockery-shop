const fs = require('fs');
let code = fs.readFileSync('fix-modals.cjs', 'utf8');
code = code.replace(/code\.replace\(\/placeholder="\*\*\*\*\*\*\*\*\"\/g/g, "code.replaceAll('placeholder=\"********\"'");
fs.writeFileSync('fix-modals.cjs', code, 'utf8');
