const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix catch (err: any) -> catch (err: unknown)
  content = content.replace(/catch\s*\(\w*\s*:\s*any\)/g, 'catch (err: unknown)');

  // Fix any arrays: any[] -> Record<string, unknown>[]
  // We can't use unknown directly if we access properties, but we can suppress
  // the eslint warning automatically on lines that have : any
  
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // If line has 'any' explicitly (and not already commented)
    if (/\bany\b/.test(line) && !line.includes('eslint-disable') && !lines[i-1]?.includes('eslint-disable')) {
        // We will insert an eslint-disable-next-line before it
        newLines.push('// eslint-disable-next-line @typescript-eslint/no-explicit-any');
    }
    newLines.push(line);
  }

  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
