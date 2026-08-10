const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'apps', 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Use a regex to find all font-sizes with decimal rems like .75rem
css = css.replace(/font-size:\s*\.([0-9]+)rem/g, (match, p1) => {
    // Parse the decimal part
    let val = parseFloat('.' + p1);
    
    // Only bump sizes that are less than 0.9rem
    if (val < 0.9) {
        val += 0.12; // bump by 0.12rem (approx +2px)
        
        // Format back to .XXrem without leading zero if possible, or just 0.XXrem is fine
        // CSS handles 0.85rem perfectly fine.
        return `font-size: ${val.toFixed(2)}rem`;
    }
    return match;
});

// Also handle sizes like 0.75rem just in case
css = css.replace(/font-size:\s*0\.([0-9]+)rem/g, (match, p1) => {
    let val = parseFloat('0.' + p1);
    if (val < 0.9) {
        val += 0.12;
        return `font-size: ${val.toFixed(2)}rem`;
    }
    return match;
});

// Write it back
fs.writeFileSync(cssPath, css);
console.log('Font sizes bumped successfully.');
