const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'server', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace route definitions with async
  content = content.replace(/\(req,\s*res\)\s*=>/g, 'async (req, res) =>');
  content = content.replace(/async\s+async/g, 'async');
  
  // Replace db.prepare(...).get|all|run(...) with await db.prepare(...).get|all|run(...)
  // We can just add 'await ' in front of 'db.prepare'
  content = content.replace(/db\.prepare/g, 'await db.prepare');
  
  // What if it's db.prepare(...); then later stmt.get()?
  // Let's check if there are any variables storing statements.
  
  fs.writeFileSync(filePath, content);
}

// Also replace in auth.js where we have signToken etc which might need async? No, JWT sign is sync.
console.log('Refactored routes!');
