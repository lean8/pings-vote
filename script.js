'use strict';
const items = [
  {id:1,name:'企鵝早餐提袋組',img:'images/item1.png'},
  {id:2,name:'企鵝麵包袋玩偶',img:'images/item2.png'},
  {id:3,name:'企鵝吐司吊飾',img:'images/item3.png'}
];
const config = window.PINGU_CONFIG || {};
const url = (config.supabaseUrl || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const key = config.supabaseKey || '';
const ready = Boolean(url && key);
const storageKey = 'pingu-vote-choice-v2';
const tokenKey = 'pingu-voter-token-v2';
const grid = document.querySelector('#grid');
const status = document.querySelector('#status');
const mode = document.querySelector('#mode');
let choice = Number(localStorage.getItem(storageKey)) || null;
let counts = null;
let busy = false;
let loading = ready;
mode.textContent = ready ? '匿名投票 · 可以不限次數更換選擇（同一瀏覽器識別）' : '網站尚未連接 Supabase，請先設定 config.js';
function token() {
  let value = localStorage.getItem(tokenKey);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(tokenKey, value); }
  return value;
}
async function rpc(name, payload = {}) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method:'POST',
    headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Supabase RPC error', name, response.status, details);
    throw new Error(`連線失敗（${response.status}），請確認 Supabase SQL 已更新`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
function render() {
  const total = counts ? Object.values(counts).reduce((a,b)=>a+b,0) : 0;
  grid.innerHTML = items.map(item => {
    const count = counts ? (counts[item.id] || 0) : 0;
    const percent = total ? Math.round(count / total * 100) : 0;
    const selected = choice === item.id;
    const label = selected ? '✓ 目前選擇' : choice ? '↻ 改投這款' : '投給這款 ♡';
    return `<article class="card"><div class="photo"><img src="${item.img}" alt="${item.name}"></div><div class="body"><div class="tag">OPTION 0${item.id}</div><h2>${item.name}</h2><button class="vote ${selected ? 'selected' : ''}" data-id="${item.id}" ${!ready || busy || loading || selected ? 'disabled' : ''}>${label}</button>${counts ? `<div class="result">${count} 票 · ${percent}%</div><div class="bar"><div class="fill" style="width:${percent}%"></div></div>` : ''}</div></article>`;
  }).join('');
  grid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => vote(Number(button.dataset.id))));
}
async function refreshCounts() {
  const rows = await rpc('get_vote_counts');
  counts = Object.fromEntries((rows || []).map(row => [Number(row.item_id), Number(row.vote_count)]));
  render();
}
async function vote(id) {
  if (!ready || busy || loading || choice === id) return;
  busy = true;
  status.textContent = choice ? '正在更新選擇…' : '正在送出投票…';
  render();
  try {
    await rpc('cast_vote', {p_item_id:id,p_voter_token:token()});
    choice = id;
    localStorage.setItem(storageKey, String(id));
    status.textContent = '已儲存你的選擇！之後仍可更換 ♡';
    await refreshCounts();
  } catch (error) {
    status.textContent = error.message || '操作失敗，請稍後再試';
  } finally { busy = false; render(); }
}
async function init() {
  if (!ready) {
    status.textContent = '請先完成 Supabase 設定，投票按鈕才會開啟。';
    render();
    return;
  }
  status.textContent = '正在讀取投票狀態…';
  render();
  try {
    // Server is the source of truth; preserve the original browser token so existing votes can be changed.
    const [serverChoice] = await Promise.all([
      rpc('get_my_vote', {p_voter_token:token()}),
      refreshCounts()
    ]);
    choice = serverChoice == null ? null : Number(serverChoice);
    if (choice) localStorage.setItem(storageKey, String(choice));
    else localStorage.removeItem(storageKey);
    status.textContent = choice ? '你可以隨時改投其他商品，總票數不會增加。' : '請選擇最想購買的一款！';
  } catch (error) {
    status.textContent = '讀取失敗，請先確認 Supabase 已執行新版 SQL，再重新整理。';
    console.error(error);
    // Avoid modifying votes when server state cannot be verified.
    busy = true;
  } finally { loading = false; render(); }
}
init();
