const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'apps', 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

// The Asella Organic Theme mapping
const replacements = [
  // Backgrounds
  { search: /#0b1116/g, replace: '#f9f6f0' }, // main bg
  { search: /#121c23/g, replace: '#ffffff' }, // panels, metric cards, role-choice
  { search: /#101a20/g, replace: '#ffffff' }, // sidebar bg
  { search: /#111a21/g, replace: '#ffffff' }, // icon button bg
  { search: /#111b22/g, replace: '#f2efe9' }, // inputs, segmented control
  { search: /#0e171d/g, replace: '#f2efe9' }, // inputs
  { search: /#17242c/g, replace: '#f2efe9' }, // hover states
  { search: /#17242a/g, replace: '#f2efe9' }, // hover states
  { search: /#223039/g, replace: '#e6efea' }, // role icon bg
  { search: /#111e24/g, replace: '#e6efea' }, // auth art bg
  
  // Text colors
  { search: /#f7faf9/g, replace: '#2b3631' }, // primary text
  { search: /#94a6ad/g, replace: '#5b6b64' }, // secondary text
  { search: /#91a3aa/g, replace: '#5b6b64' }, // secondary text
  { search: /#8da0a8/g, replace: '#5b6b64' }, // secondary text
  { search: /#84979f/g, replace: '#5b6b64' }, // secondary text
  { search: /#9aacb1/g, replace: '#5b6b64' }, // secondary text
  { search: /#b5c2c5/g, replace: '#5b6b64' }, // labels
  { search: /#81939b/g, replace: '#5b6b64' }, // secondary text
  { search: /#b9c7ca/g, replace: '#4a5952' }, // table text
  { search: /#c0ccce/g, replace: '#4a5952' }, // nav links
  { search: /#c5d1d4/g, replace: '#2b3631' }, // nav active
  { search: /rgba\(11,17,22,.72\)/g, replace: 'rgba(43,54,49,.72)' },
  { search: /rgba\(11,17,22,.65\)/g, replace: 'rgba(43,54,49,.65)' },
  { search: /rgba\(11,17,22,.7\)/g, replace: 'rgba(43,54,49,.7)' },

  // Borders
  { search: /#26343d/g, replace: '#e2e8e4' }, // default border
  { search: /#1e2c33/g, replace: '#e2e8e4' }, // topbar border
  { search: /#2a3a43/g, replace: '#d1dcd6' }, // input border
  { search: /#3a5060/g, replace: '#baccbe' }, // hover border
  { search: /#384b55/g, replace: '#baccbe' }, // secondary button border

  // Brand / Accents (Lime -> Organic Green)
  { search: /#d8f36b/g, replace: '#436a56' }, // primary button, brand mark
  { search: /#c7e85d/g, replace: '#3e604f' }, // eyebrow, text button
  { search: /#40500e/g, replace: '#ffffff' }, // text on primary button
  { search: /#77d9c5/g, replace: '#8ab8a8' }, // secondary accent
  
  // Specific overrides for Asella organic buttons where text should be white on dark green
  { search: /color: #0b1116;/g, replace: 'color: #ffffff;' }, // primary button text
  { search: /background: #0b1116;/g, replace: 'background: #f9f6f0;' }, // primary button hover bg
  
  // Badges
  { search: /#193b3b/g, replace: '#e6efea' }, // badge held bg
  { search: /#3d351b/g, replace: '#fdf3d1' }, // badge pending bg
  { search: /#f3d574/g, replace: '#b38200' }, // badge pending text
  { search: /#1e3b2f/g, replace: '#e2f4ea' }, // badge released bg
  { search: /#a9e7a9/g, replace: '#1d7042' }, // badge released text

  // Glass card and panel padding loosening
  { search: /padding: 18px;/g, replace: 'padding: 24px;' }, // glass-card
  { search: /padding: 20px;/g, replace: 'padding: 28px;' }, // panel
  { search: /padding: 30px 5vw 80px;/g, replace: 'padding: 40px 5vw 80px;' }, // platform-content
  { search: /padding: 36px 5vw 25px;/g, replace: 'padding: 40px 5vw 30px;' }, // platform-topbar
  { search: /padding: 25px 16px;/g, replace: 'padding: 30px 20px;' }, // platform-sidebar
];

replacements.forEach(({ search, replace }) => {
  css = css.replace(search, replace);
});

// A few manual touchups
// The background gradient for hero cards
css = css.replace(/linear-gradient\(135deg, #16242b 0%, #121e25 100%\)/g, 'linear-gradient(135deg, #f2efe9 0%, #ffffff 100%)');
// The background of bottom nav
css = css.replace(/rgba\(17, 26, 33, \.96\)/g, 'rgba(255, 255, 255, .96)');
css = css.replace(/rgba\(17, 26, 33, \.97\)/g, 'rgba(255, 255, 255, .97)');

// Loosen grid gaps
css = css.replace(/gap: 14px;/g, 'gap: 20px;');
css = css.replace(/gap: 12px;/g, 'gap: 16px;');
css = css.replace(/gap: 10px;/g, 'gap: 14px;');

// Soft shadows for cards
css = css.replace(/border-radius: 13px; background: #ffffff;/g, 'border-radius: 16px; background: #ffffff; box-shadow: 0 4px 24px rgba(43,54,49,0.04);');
css = css.replace(/border-radius: 14px; background: #ffffff;/g, 'border-radius: 16px; background: #ffffff; box-shadow: 0 4px 24px rgba(43,54,49,0.04);');
css = css.replace(/border-radius: 15px; background: #ffffff;/g, 'border-radius: 16px; background: #ffffff; box-shadow: 0 4px 24px rgba(43,54,49,0.04);');

fs.writeFileSync(cssPath, css);
console.log('CSS refactored successfully.');
