const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(path.join(__dirname, 'apps', 'frontend', 'src'), function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/Yekis marketplace/g, 'Yekis jobs')
            .replace(/Yekis Marketplace/g, 'Yekis Jobs');
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent);
            console.log('Updated: ' + filePath);
        }
    }
});
