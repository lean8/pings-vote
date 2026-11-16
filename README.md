# 企鵝小物購買意願投票

GitHub Pages + Supabase，純 HTML/CSS/JavaScript，無需安裝 Node.js。

## 1. 建立 Supabase 資料庫
1. 到 https://supabase.com 建立免費專案。
2. 開啟 **SQL Editor**，貼上 `supabase.sql` 全部內容並執行。
3. 到 **Project Settings / API**（不同版本介面可能在 **Connect** 或 **API Keys**）取得 Project URL 與 **publishable key**（或舊版 anon key）。
4. 編輯 `config.js`：

```js
window.PINGU_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseKey: 'YOUR_PUBLISHABLE_OR_ANON_KEY'
};
```

**不要填 service_role 或 secret key**。前端的 publishable/anon key 會公開，這是正常設計；資料表已禁用訪客直接讀寫，只能透過限定的 RPC 操作。

## 2. 部署 GitHub Pages
1. 建立 GitHub **Public** repository（例如 `pingu-vote`）。
2. 將此資料夾中的所有檔案直接上傳至 repository 根目錄（不要多包一層資料夾）。
3. Repository > **Settings > Pages > Build and deployment**。
4. Source: **Deploy from a branch**；Branch: **main**；Folder: **/(root)**；Save。
5. 等候部署後，開啟 `https://你的帳號.github.io/pingu-vote/`。

## 3. 投票規則與限制
- 每個瀏覽器使用 localStorage 保存隨機 UUID，資料庫以 UUID 唯一鍵防止同一 UUID 重複投票。
- **不是真正的每人一票**：換瀏覽器、清除網站資料、使用不同裝置，或刻意更換 UUID 都可能再次投票。
- 票數是公開的，開站即顯示票數；投票後也會更新。
- 這是匿名、低風險的購買意願調查。若需要嚴格一人一票，必須增加登入驗證、身分或其他可信驗證及防濫用機制。
- `config.js` 沒設定時，網站會顯示圖片，但不允許假投票。

## 4. 查看統計
網站直接顯示各款票數與百分比。管理者也可以在 Supabase SQL Editor 執行：

```sql
select item_id, count(*) as votes
from public.pingu_votes
 group by item_id order by item_id;
```

## 注意
- 若 SQL 執行失敗，請檢查是否已在相同專案建立過不同版本的函式。
- 不要把 Supabase 資料庫密碼或 service_role/secret key 提交到 GitHub。
