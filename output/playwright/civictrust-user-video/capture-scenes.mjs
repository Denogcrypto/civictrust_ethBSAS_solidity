import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const targets = await (await fetch('http://127.0.0.1:9239/json/list')).json();
const page = targets.find((target) => target.type === 'page' && target.url.startsWith('http://127.0.0.1:4173/'));
if (!page) throw new Error('No encontré la pestaña CivicTrust en Chrome headless.');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const handlers = pending.get(message.id);
  pending.delete(message.id);
  message.error ? handlers.reject(new Error(message.error.message)) : handlers.resolve(message.result);
};
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Fallo la evaluación de la página.');
  return result.result?.value;
};
const capture = async (name) => {
  await wait(900);
  const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  fs.writeFileSync(path.join(outputDir, name), Buffer.from(result.data, 'base64'));
  console.log(`${name} (${Buffer.byteLength(result.data, 'base64')} bytes)`);
};

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await cdp('Page.bringToFront');
await wait(2200);

await evaluate('window.scrollTo({top:0,behavior:"instant"})');
await capture('01-inicio.png');

const identityTop = await evaluate('Math.max(0, document.querySelector(".identity-card").getBoundingClientRect().top + scrollY - 115)');
await evaluate(`window.scrollTo({top:${identityTop},behavior:"instant"})`);
await capture('02-credencial.png');
await evaluate('document.querySelector("#create-identity").click()');
await wait(1400);
await capture('03-compromiso.png');
await evaluate('document.querySelector("#toast").classList.remove("visible")');

await evaluate('document.querySelector("#admin-panel").classList.remove("hidden")');
const adminTop = await evaluate('Math.max(0, document.querySelector("#admin-panel").getBoundingClientRect().top + scrollY - 90)');
await evaluate(`window.scrollTo({top:${adminTop},behavior:"instant"})`);
await capture('04-panel-padron.png');
const publishTop = await evaluate('Math.max(0, document.querySelector("#create-poll-form").getBoundingClientRect().top + scrollY - 120)');
await evaluate(`window.scrollTo({top:${publishTop},behavior:"instant"})`);
await capture('05-panel-consulta.png');

const pollsTop = await evaluate('Math.max(0, document.querySelector(".section-heading").getBoundingClientRect().top + scrollY - 100)');
await evaluate(`window.scrollTo({top:${pollsTop},behavior:"instant"})`);
await capture('06-votacion-resultados.png');

await evaluate('window.scrollTo({top:0,behavior:"instant"})');
await capture('07-cierre.png');
console.log('capturedURL', await evaluate('location.href'));
ws.close();
