/**
 * Helper script to assist in replacing console.log statements with our new logger
 * Usage: node scripts/replace-logs.js [path/to/file.ts]
 * 
 * This script is meant to be a starting point and will need manual review after running.
 */

const fs = require('fs');
const path = require('path');

// File to process (from command line argument)
const filePath = process.argv[2];

if (!filePath) {
  console.error('Please provide a file path');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), filePath);

if (!fs.existsSync(fullPath)) {
  console.error(`File not found: ${fullPath}`);
  process.exit(1);
}

// Extract the component/class name from the file path
const fileName = path.basename(fullPath, path.extname(fullPath));
const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);

// Read the file content
let content = fs.readFileSync(fullPath, 'utf8');

// Check if the logger is already imported
const hasLoggerImport = content.includes('import { getLogger }') || 
                        content.includes('import { Logger }');

// Add logger import if not already present
if (!hasLoggerImport) {
  // Look for other imports to add after
  const importMatch = content.match(/import .+;(\r?\n)/);
  if (importMatch) {
    const importEnd = content.indexOf(importMatch[0]) + importMatch[0].length;
    const loggerImport = `import { getLogger } from '../utils/logger';\n\n// Create a contextualized logger for ${componentName}\nconst logger = getLogger('${componentName}');\n`;
    content = content.slice(0, importEnd) + loggerImport + content.slice(importEnd);
  }
}

// Replace console.log statements with logger methods
content = content
  // Replace console.error with logger.error
  .replace(/console\.error\(['"](.+?)['"](.*)\)/g, 'logger.error(\'$1\'$2)')
  // Replace console.warn with logger.warn
  .replace(/console\.warn\(['"](.+?)['"](.*)\)/g, 'logger.warn(\'$1\'$2)')
  // Replace console.log with logger.info or logger.debug based on content
  .replace(/console\.log\(['"](.+?)['"](.*)\)/g, (match, message, args) => {
    // Use info level for important messages, debug for routine operations
    if (message.includes('initialized') || 
        message.includes('starting') || 
        message.includes('complete') ||
        message.includes('error')) {
      return `logger.info('${message}'${args})`;
    } else {
      return `logger.debug('${message}'${args})`;
    }
  });

// Remove component name prefix in log messages (since it's now in the context)
content = content.replace(new RegExp(`logger\\.(info|debug|warn|error)\\('${componentName}: `, 'g'), 'logger.$1(\'');

// Save the modified file
fs.writeFileSync(fullPath, content);

console.log(`Updated ${fullPath}`);
console.log('IMPORTANT: Please review the changes manually to ensure correctness.'); 