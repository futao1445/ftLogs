const fs = require('fs');
let c = fs.readFileSync('server/combined.cjs', 'utf8');

// Find and replace the systemPrompt construction
// The problematic code is:
//   var systemPrompt = '你是一个温暖的 AI 树洞...
//     + '1. ...\n' + diaryText + '\n' + ...
// We need to replace the whole multiline string

// Match everything from 'var systemPrompt = ' up to the line ending with '关联知识图谱数据';
const startMarker = "var systemPrompt = '";
const endMarker = "如果用户提到日记中的内容，关联知识图谱数据'";

var startIdx = c.indexOf(startMarker);
var endIdx = c.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) {
  console.log('MARKERS NOT FOUND');
  process.exit(1);
}
endIdx += endMarker.length;

var oldPrompt = c.slice(startIdx, endIdx);
// Remove escaped newlines by finding the actual pattern
var newPrompt = "var systemPrompt = '你是一个温暖的 AI 树洞，用户的私人对话伙伴。你有以下数据源：\\n' +\n" +
  "  '1. 用户最近的日记内容：\\\\n' + diaryText + '\\\\n' +\n" +
  "  '2. 用户的知识图谱实体：\\\\n' + graphText + '\\\\n' +\n" +
  "  '3. 对话历史：\\\\n' + history + '\\\\n\\\\n' +\n" +
  "  '规则：\\\\n' +\n" +
  "  '- 用温暖、朋友般的语气回应用户\\\\n' +\n" +
  "  '- 基于真实日记数据说话，不凭空猜测\\\\n' +\n" +
  "  '- 可以主动提问引导用户深入话题\\\\n' +\n" +
  "  '- 回复控制在 100-150 字，语言自然口语化\\\\n' +\n" +
  "  '- 可以适当使用 emoji\\\\n' +\n" +
  "  '- 如果用户提到日记中的内容，关联知识图谱数据'";

c = c.slice(0, startIdx) + newPrompt + c.slice(endIdx);

// Also check for any other remaining literal newlines in strings
// Fix any join(' with a newline inside
var lines = c.split('\n');
for (var i = 0; i < lines.length; i++) {
  if (lines[i].includes("').join('") && !lines[i].includes("');")) {
    // This line has a string starting with .join(' that continues on next line
    var nextLine = lines[i+1];
    if (nextLine && nextLine.trim() === "');") {
      lines[i] = lines[i] + "\\n');";
      lines.splice(i+1, 1); // remove the next line
    }
  }
}
c = lines.join('\n');

fs.writeFileSync('server/combined.cjs', c, 'utf8');
console.log('OK');
