'use strict';
const items = [
  {id:1,name:'企鵝早餐提袋組',img:'images/item1.png'},
  {id:2,name:'企鵝麵包袋玩偶',img:'images/item2.png'},
  {id:3,name:'企鵝吐司吊飾',img:'images/item3.png'}
];
const config = window.PINGU_CONFIG || {};
const url = (config.supabaseUrl || '').replace(/\/$/, '');
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
mode.textContent = ready ? '匿名投票 · 同一瀏覽器限制一票（可清除瀏覽器資料重投）' : '網站尚未連接 Supabase，請先設定 config.js';
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
    if (details.includes('already_voted')) throw new Error('這個瀏覽器已投過票囉');
    throw new Error(`連線失敗（${response.status}），請稍後再試`);
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
    return `<article class="card"><div class="photo"><img src="${item.img}" alt="${item.name}"></div><div class="body"><div class="tag">OPTION 0${item.id}</div><h2>${item.name}</h2><button class="vote ${choice === item.id ? 'selected' : ''}" data-id="${item.id}" ${!ready || choice || busy ? 'disabled' : ''}>${choice === item.id ? '✓ 已投票' : choice ? '已完成投票' : '投給這款 ♡'}</button>${counts ? `<div class="result">${count} 票 · ${percent}%</div><div class="bar"><div class="fill" style="width:${percent}%"></div></div>` : ''}</div></article>`;
  }).join('');
  grid.querySelectorAll('button').forEach(button => button.addEventListener('click', () => vote(Number(button.dataset.id))));
}
async function refreshCounts() {
  const rows = await rpc('get_vote_counts');
  counts = Object.fromEntries((rows || []).map(row => [Number(row.item_id), Number(row.vote_count)]));
  render();
}
async function vote(id) {
  if (!ready || choice || busy) return;
  busy = true; status.textContent = '正在送出投票…'; render();
  try {
    await rpc('cast_vote', {p_item_id:id,p_voter_token:token()});
    choice = id; localStorage.setItem(storageKey, String(id));
    status.textContent = '投票成功！謝謝你 ♡';
    await refreshCounts();
  } catch (error) {
    status.textContent = error.message || '投票失敗，請稍後再試';
    // A lost response can mean the server saved the vote; keep token for retry.
  } finally { busy = false; render(); }
}
render();
if (ready) {
  status.textContent = choice ? '你已完成投票，以下是目前票數。' : '請選擇最想購買的一款！';
  refreshCounts().catch(() => { status.textContent = '暫時無法取得票數，仍可嘗試投票。'; });
} else status.textContent = '請先完成 Supabase 設定，投票按鈕才會開啟。';
