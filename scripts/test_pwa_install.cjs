const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const { test } = require('node:test');

const script = readFileSync(require('node:path').join(__dirname, '../static/js/pwa.js'), 'utf8');

function renderInstallGuide({ userAgent, standalone = false, platform = 'iPhone', maxTouchPoints = 5 }) {
  const listeners = {};
  const toggle = {
    attributes: { 'aria-expanded': 'false' },
    addEventListener(event, callback) { listeners[event] = callback; },
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const message = { textContent: 'In Safari, follow these steps:' };
  const guide = { hidden: true, querySelector() { return message; } };
  const steps = { hidden: true };
  const document = {
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === '[data-ios-install]' ? guide : toggle; },
    getElementById() { return steps; },
  };
  const navigator = { userAgent, platform, maxTouchPoints, standalone };
  const window = { navigator, matchMedia() { return { matches: standalone }; }, addEventListener() {} };
  runInNewContext(script, { document, navigator, window, console });
  return { guide, steps, toggle, message, click: () => listeners.click?.() };
}

test('iPhone Safari shows accessible installation instructions', () => {
  const ui = renderInstallGuide({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
  assert.equal(ui.guide.hidden, false);
  ui.click();
  assert.equal(ui.steps.hidden, false);
  assert.equal(ui.toggle.getAttribute('aria-expanded'), 'true');
  ui.click();
  assert.equal(ui.steps.hidden, true);
});

test('iOS alternative browser directs installation through Safari', () => {
  const ui = renderInstallGuide({ userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1' });
  assert.equal(ui.guide.hidden, false);
  assert.match(ui.message.textContent, /Open this website in Safari/);
});

test('already installed iPhone app does not show install guidance', () => {
  const ui = renderInstallGuide({ userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/604.1', standalone: true });
  assert.equal(ui.guide.hidden, true);
});

test('Windows browser does not show iPhone guidance', () => {
  const ui = renderInstallGuide({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36', platform: 'Win32', maxTouchPoints: 0 });
  assert.equal(ui.guide.hidden, true);
});
