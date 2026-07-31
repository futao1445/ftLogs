const fs = require('fs');
let c = fs.readFileSync('server/combined.cjs', 'utf8');

// Extract the pieces we need:
// 1. Head section (imports + all working routers)
// 2. ragRouter (last working router before corruption)
// 3. treeholeRouter import and create
// 4. appRouter with treehole added
// 5. Express section (from 'const app = express()' to end)

// Find the end of ragRouter - it should be right before the 汇总路由 header
// There may be MULTIPLE '════' headers. Find the one with '汇总路由'
var searchFrom = c.indexOf('const ragRouter = t.router({');
var ragEnd = c.indexOf('// 汇总路由', searchFrom);
if (ragEnd < 0) ragEnd = c.indexOf('const appRouter = t.router({');

var headSection = c.slice(0, ragEnd);
// Check the last few lines - make sure no treeholeRouter def
if (headSection.includes('treeholeRouter')) {
  var thPos = headSection.lastIndexOf('\nconst treeholeRouter');
  if (thPos > 0) headSection = headSection.slice(0, thPos);
}

// Find the express section - 'const app = express()' to end of file
var expressPos = c.lastIndexOf('const app = express()');
var expressSection = c.slice(expressPos);

// Remove any treeholeRouter junk from the express section
// It might contain inline treehole code mixed with app.get/app.use
// Find the real start of express stuff (after any inline treehole)
var cleanExpress = expressSection;
// Check if there's app.use lines right at the start
if (cleanExpress.includes('const app = express()')) {
  // Good, it starts with app = express()
}

// Remove ALL inline treehole code from the express section
// The express section may have extra inline treehole code at the end
// Find 'AI 树洞' header and cut everything from there
var aiHolePos = cleanExpress.indexOf('AI 树洞');
if (aiHolePos > 0) {
  cleanExpress = cleanExpress.slice(0, aiHolePos);
  console.log('Removed AI treehole inline code from express section');
}

// Re-add app.listen() at the end if it was removed
if (!cleanExpress.includes('app.listen(PORT')) {
  cleanExpress += '\n\n// 启动\napp.listen(PORT, \'0.0.0.0\', () => {\n';
  cleanExpress += '  console.log(\'📝 Futao Logs running on http://localhost:\' + PORT);\n';
  cleanExpress += '  console.log(\'   API: http://localhost:\' + PORT + \'/api/trpc\');\n';
  cleanExpress += '  console.log(\'   Uploads: \' + uploadDir);\n';
  cleanExpress += '  console.log(\'   Exports: \' + exportDir);\n';
  cleanExpress += '});\n';
  console.log('Re-added app.listen');
}

// Rebuild
var output = headSection.trimRight() + '\n\n';
// Add treehole router
output += 'const { createTreeholeRouter } = require("./treehole-router.cjs");\n';
output += 'const treeholeRouter = createTreeholeRouter(t, prisma, readLLMConfig);\n\n';
// Add appRouter
output += 'const appRouter = t.router({\n';
output += '  diary: diaryRouter,\n';
output += '  tag: tagRouter,\n';
output += '  config: configRouter,\n';
output += '  export: exportRouter,\n';
output += '  summary: summaryRouter,\n';
output += '  treehole: treeholeRouter,\n';
output += '  rag: ragRouter,\n';
output += '  llm: t.router({\n';

// Extract llm procedures from the original appRouter
var origAppRouter = c.slice(c.indexOf('llm: t.router({'));
var origAppRouterEnd = origAppRouter.indexOf('}),\n});');
if (origAppRouterEnd > 0) {
  output += origAppRouter.slice(0, origAppRouterEnd + 4) + '\n';
} else {
  output += '    // llm router\n';
}

output += '  }),\n';
output += '});\n\n';

// Add the clean express section
output += cleanExpress.trimRight() + '\n';

// Verify cleanExpress doesn't contain inline treehole code
if (output.includes('createTreeholeRouter') && output.includes('treehole: treeholeRouter')) {
  var defCount = (output.match(/const treeholeRouter/g) || []).length;
  console.log('treeholeRouter definitions:', defCount);
  if (defCount === 1) {
    fs.writeFileSync('server/combined_rebuild_final.cjs', output, 'utf8');
    console.log('OK - file written. Length:', output.length);
  } else {
    console.log('ERROR: expected 1 definition, got', defCount);
  }
} else {
  console.log('ERROR: missing treehole references');
}
