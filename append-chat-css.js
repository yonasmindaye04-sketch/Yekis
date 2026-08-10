const fs = require('fs');
const cssPath = require('path').join(__dirname, 'apps/frontend/src/index.css');
let css = fs.readFileSync(cssPath, 'utf8');

const newStyles = `
/* Support Chat: staff avatar, attach button, head layout */
.chat-head-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.chat-agent-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #436a56;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  flex-shrink: 0;
}
.chat-attach-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid #d1dcd6;
  border-radius: 50%;
  background: transparent;
  color: #5b6b64;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.chat-attach-btn:hover {
  background: #e6efea;
  color: #436a56;
}
`;

css += newStyles;
fs.writeFileSync(cssPath, css);
console.log('CSS updated successfully');
