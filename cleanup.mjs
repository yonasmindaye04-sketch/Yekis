import fs from 'fs';
import path from 'path';

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        if (['node_modules', '.git', 'dist', 'build', '.next', '.pnpm-store'].includes(name)) return;
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

const emojiRegex = /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu;
const legacyProjectPattern = new RegExp(['muya', 'logy'].join(''), 'gi');
let count = 0;

walkSync('.', function(filePath, stat) {
    if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.ico') || filePath.endsWith('.lock') || filePath.endsWith('pnpm-lock.yaml') || filePath.endsWith('.mjs') || filePath.endsWith('.ps1')) return;
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(legacyProjectPattern, 'Yekis_jobs')
            .replace(emojiRegex, '');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Cleaned up', filePath);
            count++;
        }
    } catch (e) {
        // ignore binary files or errors
    }
});

console.log(`Cleaned up ${count} files.`);
