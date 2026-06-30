const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/pages', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We want to replace <table className="..."> with <div className="table-responsive"><table className="...">
    // and </table> with </table></div>
    // Note: This regex assumes simple table structures without nested tables
    
    let original = content;
    
    // Check if it already has table-responsive wrapper
    if (content.includes('className="table-responsive"')) {
        return;
    }
    
    // Match <table ...> up to > 
    let newContent = content.replace(/(<table\b[^>]*>)/g, '<div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>\n$1');
    newContent = newContent.replace(/(<\/table>)/g, '$1\n</div>');
    
    if (newContent !== original) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Fixed:', filePath);
    }
  }
});
