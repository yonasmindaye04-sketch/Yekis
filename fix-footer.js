const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'apps', 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Update footer links
css = css.replace(
  /\.landing-footer button \{ border: 0; background: transparent; color: #c1cecf; font-size: 0\.99rem; \}/,
  '.landing-footer button, .landing-footer a { border: 0; background: transparent; color: #c1cecf; font-size: 0.99rem; text-decoration: none; }.landing-footer button:hover, .landing-footer a:hover { color: #436a56; }'
);

// Update chat fab bottom offset
css = css.replace(
  /\.landing-chat-fab \{ position: fixed; z-index: 12; right: clamp\(18px, 3vw, 42px\); bottom: 24px;/,
  '.landing-chat-fab { position: fixed; z-index: 12; right: clamp(18px, 3vw, 42px); bottom: 80px;'
);

fs.writeFileSync(cssPath, css);
console.log('Fixed footer and fab');
