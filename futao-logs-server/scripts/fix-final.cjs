const fs = require('fs');
let c = fs.readFileSync('server/combined.cjs', 'utf8');

// The combined.cjs has appRouter working but treeholeRouter is broken inside it.
// Strategy: find appRouter definition, fix treehole reference, remove broken treehole code

// Step 1: Find appRouter
const appRouterStart = c.indexOf('const appRouter = t.router({');
const appRouterEnd = c.indexOf('const app = express()');

if (appRouterStart === -1 || appRouterEnd === -1) {
  console.log('CANNOT FIND KEY SECTIONS');
  process.exit(1);
}

// Step 2: Check if treehole: treeholeRouter is in appRouter
const appRouterCode = c.slice(appRouterStart, appRouterEnd);
const hasTreehole = appRouterCode.includes('treehole:');

// Step 3: Everything up to the Express section is good. The broken treehole code is after app.listen.
// Actually, the problem is MORE CODE after app.listen.

// Let's find where treeholeRouter starts (the broken inline one) and remove it + everything after
const thStart = c.indexOf('\nconst treeholeRouter = t.router({', appRouterEnd);
const thEnd = c.lastIndexOf('});');

if (thStart === -1) {
  console.log('NO INLINE TREEHOLE FOUND - may already be clean');
}

// The issue is that the EXPRESS section and app.listen are INSIDE the treeholeCode
// Let me check: is app.listen after treehole start?
const listenPos = c.indexOf('app.listen(PORT,', thStart > 0 ? thStart : 0);
console.log('treeholeStart:', thStart, 'listenPos:', listenPos);

// If listen is BEFORE the inline treehole end, we have mixed code
// Strategy: remove everything from treehole start to where the EXPRESS section begins
// But keep the Express section!

// Actually, the key insight: the Express section and everything after it should be at the END of file
// The treeholeRouter which is at line ~862 is inside the appRouter area
// Let me rebuild the file properly

// Part 1: Everything up to appRouter (but without treehole inside appRouter if it was added inline)
var header = c.slice(0, appRouterStart);

// Step: add treehole router import
header += '\nconst { createTreeholeRouter } = require("./treehole-router.cjs");\n';
header += 'const treeholeRouter = createTreeholeRouter(t, prisma, readLLMConfig);\n\n';

// Part 2: the appRouter
var appRouterContent = appRouterCode;
// The appRouter may have 'treehole: treeholeRouter' already, or not
// If not, we need to add it
if (!appRouterContent.includes('treehole:')) {
  appRouterContent = appRouterContent.replace('rag: ragRouter,', 'treehole: treeholeRouter,\n  rag: ragRouter,');
}

header += appRouterContent;

// Part 3: Express section + SPA + listen - everything after appRouter
var postApp = c.slice(appRouterEnd);

// Check if there's lingering treehole code after the Express section
// The listen might be duplicated or placed inside treeholeRouter
// Just take everything from 'const app = express()' to the last line
var expressPos = postApp.indexOf('const app = express()');
if (expressPos >= 0) {
  header += postApp.slice(expressPos);
}

// Remove any leftover treehole code (before the listen section)
// Look for anything after the last listen callback '});'
var lastListen = header.lastIndexOf('app.listen(PORT');
if (lastListen >= 0) {
  var afterListen = header.slice(lastListen);
  var listenEnd = afterListen.indexOf('});');
  if (listenEnd >= 0) {
    // Everything after the listen's }); is junk
    header = header.slice(0, lastListen + listenEnd + 3);
    console.log('Trimmed after listen');
  }
}

fs.writeFileSync('server/combined_rebuilt.cjs', header, 'utf8');
console.log('Rebuilt file. Length:', header.length);
console.log('treeholeRouter refs:', (header.match(/treeholeRouter/g) || []).length);
