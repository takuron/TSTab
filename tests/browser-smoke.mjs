import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

// 每次自行启动全新临时配置，绝不连接用户正在使用的浏览器。
const profile = fs.mkdtempSync(join(tmpdir(), 'tstab-browser-test-'));
const clients = [];
const processHandle = spawn(process.env.CHROMIUM_PATH ?? 'chromium', [
	'--headless', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
	'--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
	`--user-data-dir=${profile}`, `--load-extension=${resolve('build')}`, 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
let startupError;
processHandle.on('error', (error) => { startupError = error; });
const exited = new Promise((resolve) => processHandle.once('exit', resolve));
processHandle.stderr.on('data', () => {});
let endpoint;

class CDP {
 constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.errors=[];ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')this.errors.push(m.params.exceptionDetails);};}
 static async connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});const client=new CDP(ws);clients.push(client);return client;}
 send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
 async until(expression){for(let i=0;i<100;i++){if(await this.eval(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timeout: '+expression);}
 close(){this.ws.close();}
}
try {
for (let i = 0; i < 200; i++) {
	if (startupError) throw startupError;
	const activePort = join(profile, 'DevToolsActivePort');
	if (fs.existsSync(activePort)) { endpoint = `http://127.0.0.1:${fs.readFileSync(activePort, 'utf8').split('\n')[0]}`; break; }
	if (processHandle.exitCode !== null) throw new Error('Chromium failed to start');
	await new Promise((resolve) => setTimeout(resolve, 50));
}
if (!endpoint) throw new Error('Chromium startup timeout');
const version=await fetch(endpoint+'/json/version').then(r=>r.json());
const browser=await CDP.connect(version.webSocketDebuggerUrl);
async function page(url){const {targetId}=await browser.send('Target.createTarget',{url});let info;for(let i=0;i<20;i++){info=(await fetch(endpoint+'/json/list').then(r=>r.json())).find(p=>p.id===targetId);if(info)break;await new Promise(r=>setTimeout(r,50));}const p=await CDP.connect(info.webSocketDebuggerUrl);await p.send('Runtime.enable');await p.send('Network.enable');await p.send('Network.setBlockedURLs',{urls:['http://*','https://*']});return p;}
const a=await page('chrome://newtab/');
await a.until("document.querySelector('input[aria-label]') && typeof chrome.storage !== 'undefined'");
console.log('newtab',await a.eval('location.href'));
assert.deepEqual(await a.eval('chrome.runtime.getManifest().permissions'), ['storage', 'activeTab', 'bookmarks']);
assert.equal(await a.eval('chrome.runtime.getManifest().default_locale'), 'zh_CN');
assert.equal(await a.eval('chrome.runtime.getManifest().name'), 'TSTab');
const nativeTitle = await a.eval("chrome.i18n.getMessage('actionTitle')");
assert.ok(['添加到快捷访问', 'Add to Quick Access'].includes(nativeTitle));
assert.equal(await a.eval('chrome.runtime.getManifest().action.default_title'), nativeTitle);
assert.ok(await a.eval("chrome.runtime.getManifest().description === chrome.i18n.getMessage('extensionDescription')"));
const base=await a.eval('location.origin');
// 等待首次迁移写入完成，避免测试数据与初始化的默认设置互相覆盖。
await a.until("chrome.storage.local.get(['locale','quickAccess']).then(value=>value.locale==='browser' && Array.isArray(value.quickAccess))");
await a.eval("navigator.locks.request('tstab:storage',()=>chrome.storage.local.set({quoteEnabled:false,locale:'en-US',quickAccess:[{id:'a',title:'Alpha',url:'https://github.com/',icon:'',addedAt:1},{id:'b',title:'Beta',url:'https://google.com/',icon:'',addedAt:1}]}))");
await a.until("document.documentElement.lang==='en-US' && document.querySelectorAll('nav a').length===2");
assert.equal(await a.eval('document.title'), 'New Tab');
assert.match(await a.eval("document.querySelector('meta[name=description]').content"), /A clean new tab/);
const b=await page(base+'/newtab.html');await b.until("document.documentElement.lang==='en-US' && document.querySelectorAll('nav a').length===2");
await a.eval("document.querySelector('button[aria-label=\"Open settings\"]').focus();document.querySelector('button[aria-label=\"Open settings\"]').click()");
await a.until("document.querySelector('dialog')?.open");
assert.equal(await a.eval("document.activeElement.closest('dialog')!==null"),true);
assert.ok(await a.eval("document.querySelector('dialog').textContent.includes('Third-party API')"));
// 通过真实页面选择器修改设置，验证另一页面实时同步。
await a.eval("{const s=document.querySelector('dialog select[aria-label=Language]');s.value='zh-CN';s.dispatchEvent(new Event('change',{bubbles:true}));}");
await b.until("document.documentElement.lang==='zh-CN'");
assert.equal(await b.eval('document.title'), '新标签页');
assert.match(await b.eval("document.querySelector('meta[name=description]').content"), /简洁的新标签页/);
assert.ok(await a.eval("document.querySelector('dialog').textContent.includes('第三方 API')"));
await b.eval("{const s=document.querySelector('select');s.value='google';s.dispatchEvent(new Event('change',{bubbles:true}));}");
await a.until("document.querySelector('dialog select').value==='google'");
assert.equal(await a.eval("chrome.storage.local.get(['locale','searchEngine']).then(x=>x.locale==='zh-CN'&&x.searchEngine==='google')"),true);
// 剪切与拖拽不再被默认复制保护取消。
assert.equal(await a.eval("{const input=document.querySelector('dialog input[type=text]'); const e=new Event('cut',{bubbles:true,cancelable:true}); input.dispatchEvent(e); !e.defaultPrevented;}"),true);
assert.equal(await a.eval("{const handle=document.querySelector('[draggable=true]'); const e=new DragEvent('dragstart',{bubbles:true,cancelable:true,dataTransfer:new DataTransfer()}); handle.dispatchEvent(e); !e.defaultPrevented;}"),true);
await a.eval("document.querySelector('button[aria-label=\"下移 Alpha\"]').click()");
await b.until("document.querySelector('nav a')?.getAttribute('aria-label')==='Beta'");
await a.eval("{const s=document.querySelector('#qa-position');s.value='top';s.dispatchEvent(new Event('change',{bubbles:true}));}");
await b.until("getComputedStyle(document.querySelector('nav')).top==='20px'");
await a.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await a.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await a.until("!document.querySelector('dialog')");
assert.equal(await a.eval("document.activeElement.getAttribute('aria-label')"),'打开设置');
// 模拟真正的 Chrome 配额拒绝：保存总是乐观成功，界面保留新值且不弹出错误提示。
await a.eval("document.querySelector('button[aria-label=\"打开设置\"]').click()");
await a.until("document.querySelector('dialog')?.open");
const quota = await a.eval(`(async () => {
	const original = chrome.storage.local.set;
	chrome.storage.local.set = (items, callback) => original({ quotaProbe: 'x'.repeat(11 * 1024 * 1024) }, callback);
	try {
		const select = document.querySelector('#qa-position');
		select.value = 'bottom'; select.dispatchEvent(new Event('change', { bubbles: true }));
		await new Promise(r => setTimeout(r, 200));
		return { value: select.value, saved: (await chrome.storage.local.get('quickAccessPosition')).quickAccessPosition, error: !!document.querySelector('dialog [role=alert]') };
	} finally { chrome.storage.local.set = original; }
})()`);
assert.deepEqual(quota, { value: 'bottom', saved: 'top', error: false });
await a.eval("document.querySelector('dialog button[aria-label=\"关闭设置\"]').click()");

// popup 在独立页面加载时也必须读取已保存的固定语言。
await a.eval("chrome.storage.local.set({locale:'en-US'})");
const popup=await page(base+'/popup.html');await popup.until("document.documentElement.lang==='en-US'");
assert.equal(await popup.eval("document.querySelector('h2').textContent"),'Quick Access');
assert.equal(await popup.eval('document.title'), 'Add to Quick Access');
// 模拟无标题的内部页面，确认占位标题与仍显示的状态提示都能随跨页面语言设置刷新。
await popup.send('Page.enable');
const injection = await popup.send('Page.addScriptToEvaluateOnNewDocument', { source: "chrome.tabs.query = async () => [{title:'', url:'edge://settings/'}];" });
await popup.send('Page.reload');
try {
	await popup.until("document.body.textContent.includes('Unknown site') && document.body.textContent.includes('Only HTTP(S) web pages can be added.')");
} catch (error) {
	console.error('popup language diagnostics', await popup.eval("({text:document.body.textContent,query:chrome.tabs.query.toString()})"), popup.errors);
	throw error;
}
await a.eval("chrome.storage.local.set({locale:'zh-CN'})");
await popup.until("document.documentElement.lang==='zh-CN' && document.body.textContent.includes('未知网站') && document.body.textContent.includes('仅支持添加 HTTP(S) 网页。')");
assert.equal(await popup.eval('document.title'), '添加到快捷访问');
assert.equal(await popup.eval("chrome.runtime.getManifest().action.default_title"), nativeTitle);
await popup.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
await a.eval("chrome.storage.local.set({locale:'en-US'})");
await a.until("document.documentElement.lang==='en-US'");
await a.eval("chrome.storage.local.set({quickAccessMode:'bookmark',bookmarkFolderId:'1'})");
await a.eval("Promise.all([chrome.bookmarks.create({parentId:'1',title:'Same 1',url:'https://github.com/'}),chrome.bookmarks.create({parentId:'1',title:'Same 2',url:'https://github.com/'})])");
await a.send('Page.reload');await a.until("Array.from(document.querySelectorAll('nav a')).map(a=>a.textContent.trim()).join(',')==='Same 1,Same 2'");
assert.equal(await a.eval("Array.from(document.querySelectorAll('nav a')).map(a=>a.textContent.trim()).join(',')"),'Same 1,Same 2');
await a.send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
await a.eval("document.querySelector('button[aria-label=\"Open settings\"]').click()");
await a.until("document.querySelector('dialog')?.open");
// Tab 不应离开对话框，Esc 在上面已验证焦点恢复。
for (let i = 0; i < 30; i++) {
	await a.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	await a.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
	assert.equal(await a.eval("!!document.activeElement.closest('dialog')"), true);
}
assert.deepEqual(a.errors,[]);assert.deepEqual(b.errors,[]);assert.deepEqual(popup.errors,[]);
console.log('PASS: extension boot, native locale metadata, storage synchronization, translated metadata/licenses/popup status, dialog focus/Escape, copy/drag, keyboard reorder, Dock position, duplicate bookmarks, optimistic save on quota error and focus recovery; no runtime exceptions');
} finally {
	clients.forEach((client) => client.close());
	processHandle.kill('SIGTERM');
	await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
	if (processHandle.exitCode === null && processHandle.signalCode === null) { processHandle.kill('SIGKILL'); await exited; }
	fs.rmSync(profile, { recursive: true, force: true });
}
