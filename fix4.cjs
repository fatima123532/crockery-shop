const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
const lines = code.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('placeholder=')) {
    return line.replace(/placeholder=".*"/, 'placeholder="********"');
  }
  return line;
});
fs.writeFileSync('src/App.jsx', fixedLines.join('\n'), 'utf8');
