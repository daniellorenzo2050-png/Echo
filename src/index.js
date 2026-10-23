// ============================================================================
// TEMPLATE HTML / CSS / JS - LOJA PRINCIPAL COM UI ESTILO PS5 (/)
// ============================================================================
const HOME_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - PS5 Edition</title>
  <style>
    :root {
      --ps5-bg: #111418;
      --ps5-blue: #0070d1;
      --ps5-blue-hover: #005fb8;
      --ps5-card-bg: rgba(26, 32, 44, 0.85);
      --ps5-card-hover: rgba(45, 55, 72, 0.95);
      --text-main: #f0f4f8;
      --text-muted: #a0aec0;
      --accent: #00f2fe;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { background-color: var(--ps5-bg); color: var(--text-main); min-height: 100vh; overflow-x: hidden; }

    /* Estilo PS5 Header / StatusBar */
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 40px; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08); position: sticky; top: 0; z-index: 100;
    }
    .logo-area { display: flex; align-items: center; gap: 15px; }
    .logo-area h1 { font-size: 1.4em; letter-spacing: 1px; color: #fff; font-weight: 700; }
    .user-profile { display: flex; gap: 20px; align-items: center; background: rgba(0, 0, 0, 0.4); padding: 8px 18px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1); }
    .badge-sl { background: var(--ps5-blue); color: #fff; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85em; box-shadow: 0 0 10px rgba(0,112,209,0.5); }

    /* Layout Principal Estilo Console */
    .container { padding: 30px 40px; max-width: 1400px; margin: auto; }

    /* Painel de Conta / Resgate Estilo Card Flutuante */
    .ps5-card-section {
      background: var(--ps5-card-bg); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 20px 25px; margin-bottom: 30px;
      backdrop-filter: blur(15px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .ps5-card-section h3 { margin-bottom: 12px; font-size: 1.1em; color: var(--accent); }
    .auth-grid { display: flex; gap: 12px; flex-wrap: wrap; }
    input, select {
      flex: 1; min-width: 200px; padding: 12px 16px; background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; outline: none; transition: 0.2s;
    }
    input:focus, select:focus { border-color: var(--ps5-blue); box-shadow: 0 0 8px rgba(0,112,209,0.4); }

    /* Botões PS5 Style */
    .btn-ps5 {
      background: var(--ps5-blue); color: #fff; border: none; padding: 12px 24px;
      border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-ps5:hover { background: var(--ps5-blue-hover); transform: scale(1.02); }
    .btn-play { background: #10b981; }
    .btn-play:hover { background: #059669; }
    .btn-delete { background: #ef4444; }
    .btn-delete:hover { background: #dc2626; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }

    /* Grid de Jogos (Carrossel / Grade Estilo PS Store) */
    h2 { font-size: 1.6em; margin-bottom: 20px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 25px; }
    .game-card {
      background: var(--ps5-card-bg); border-radius: 14px; border: 1px solid rgba(255,255,255,0.06);
      overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); padding: 20px;
    }
    .game-card:hover {
      transform: translateY(-8px) scale(1.02);
      border-color: var(--ps5-blue);
      box-shadow: 0 15px 35px rgba(0, 112, 209, 0.3);
      background: var(--ps5-card-hover);
    }
    .game-title { font-size: 1.25em; font-weight: bold; color: #fff; margin-bottom: 6px; }
    .game-dev { color: var(--text-muted); font-size: 0.85em; margin-bottom: 12px; }
    .game-price { font-size: 1.1em; font-weight: bold; color: var(--accent); margin-bottom: 15px; }

    .card-actions { display: flex; flex-direction: column; gap: 8px; }

    /* Player Overlay / Modal Estilo Tela Cheia PS5 */
    #player-section {
      background: rgba(10, 15, 25, 0.95); position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 1000; padding: 40px; display: flex; flex-direction: column;
    }
    .player-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .player-wrapper { flex: 1; width: 100%; background: #000; border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); }
    iframe { width: 100%; height: 100%; border: none; background: #fff; }
  </style>
</head>
<body>

  <!-- Barra Superior / Status PS5 -->
  <header>
    <div class="logo-area">
      <span style="font-size: 1.8em;">🎮</span>
      <h1>PythonSL GameShop <span style="font-size:0.5em; color:var(--ps5-blue); font-weight:bold; background:rgba(0,112,209,0.15); padding:4px 8px; border-radius:6px;">PS5 UI</span></h1>
    </div>
    <div class="user-profile">
      <span id="user-display" style="color: var(--text-muted);">Visitante</span>
      <span class="badge-sl" id="balance-display">SL$ 0</span>
      <a href="/dev/" class="btn-ps5" style="padding: 6px 14px; font-size: 0.85em; background: #10b981;">Painel Dev</a>
    </div>
  </header>

  <div class="container">

    <!-- Seção de Conta e Resgate -->
    <div class="ps5-card-section">
      <h3>🔐 PythonSL Account & Resgate de Vonder</h3>
      <div class="auth-grid" style="margin-top: 12px;">
        <input type="text" id="username" placeholder="Usuário PythonSL">
        <input type="password" id="password" placeholder="Senha SHA256">
        <input type="text" id="redeem-code" placeholder="Código Vonder (ex: STATER2016)">
        <button class="btn-ps5" onclick="redeem()">Conectar / Resgatar</button>
      </div>
    </div>

    <!-- Barra de Busca Avançada -->
    <div class="ps5-card-section">
      <h3>🔍 Pesquisar na Store</h3>
      <div class="auth-grid" style="margin-top: 12px;">
        <input type="text" id="search-query" placeholder="Nome do jogo, desenvolvedor, UUID ou Hash..." oninput="filterGames()" style="flex: 2;">
        <select id="search-price-filter" onchange="filterGames()">
          <option value="all">Todos os Preços</option>
          <option value="free">Grátis (SL$ 0)</option>
          <option value="paid">Pagos (SL$ > 0)</option>
        </select>
        <select id="search-sort" onchange="filterGames()">
          <option value="newest">Mais Recentes</option>
          <option value="price-asc">Menor Preço</option>
          <option value="price-desc">Maior Preço</option>
          <option value="title">Nome (A-Z)</option>
        </select>
        <button class="btn-ps5 btn-secondary" onclick="resetSearch()">Limpar</button>
      </div>
    </div>

    <!-- Catálogo -->
    <h2>🎮 Biblioteca & Jogos Disponíveis</h2>
    <div class="grid" id="games-list" style="margin-top: 20px;"></div>

  </div>

  <!-- Player de Jogo (Fullscreen PS5 Modal) -->
  <div id="player-section" style="display:none;">
    <div class="player-header">
      <h2 id="playing-title" style="margin:0;">🕹️ Rodando Jogo</h2>
      <button class="btn-ps5 btn-delete" onclick="closePlayer()">Sair do Jogo (✕)</button>
    </div>
    <div class="player-wrapper">
      <iframe id="game-frame" sandbox="allow-scripts allow-same-origin allow-modals"></iframe>
    </div>
  </div>

  <script>
    let db;
    let currentBlobUrl = null;
    let allGamesCache = [];

    const request = indexedDB.open("PythonSLGameShopDB", 1);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("games")) {
        db.createObjectStore("games", { keyPath: "uuid" });
      }
    };
    request.onsuccess = (e) => { db = e.target.result; loadGames(); };

    async function redeem() {
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      const code = document.getElementById('redeem-code').value.trim();

      if (!user || !pass) return alert("Preencha seu usuário e senha da PythonSL Account!");

      const res = await fetch('/api/reedem/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass, code })
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (res.ok) {
        document.getElementById('user-display').innerText = user;
        document.getElementById('balance-display').innerText = 'SL$ ' + data.new_balance;
        filterGames();
      }
    }

    async function loadGames() {
      const res = await fetch('/api/listgames');
      allGamesCache = await res.json();
      filterGames();
    }

    function filterGames() {
      const rawQuery = document.getElementById('search-query').value.trim().toLowerCase();
      const priceFilter = document.getElementById('search-price-filter').value;
      const sortBy = document.getElementById('search-sort').value;
      const currentUser = document.getElementById('username').value.trim();

      let filtered = allGamesCache.filter(game => {
        if (rawQuery) {
          const matchTitle = game.title.toLowerCase().includes(rawQuery);
          const matchDev = game.developer.toLowerCase().includes(rawQuery);
          const matchUuid = game.uuid.toLowerCase().includes(rawQuery);
          const matchHash = game.hash.toLowerCase().includes(rawQuery);
          if (!matchTitle && !matchDev && !matchUuid && !matchHash) return false;
        }
        if (priceFilter === 'free' && game.price > 0) return false;
        if (priceFilter === 'paid' && game.price === 0) return false;
        return true;
      });

      filtered.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return 0;
      });

      renderGames(filtered, currentUser);
    }

    function resetSearch() {
      document.getElementById('search-query').value = '';
      document.getElementById('search-price-filter').value = 'all';
      document.getElementById('search-sort').value = 'newest';
      filterGames();
    }

    function renderGames(games, currentUser) {
      const container = document.getElementById('games-list');
      container.innerHTML = '';
      if (games.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Nenhum jogo encontrado na Store.</p>';
        return;
      }
      games.forEach(game => {
        const isOwner = currentUser && currentUser === game.developer;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = \`
          <div>
            <div class="game-title">\${game.title}</div>
            <div class="game-dev">Dev: \${game.developer}</div>
            <div class="game-price">SL$ \${game.price}</div>
          </div>
          <div class="card-actions">
            <button class="btn-ps5" onclick="buyAndInstall('\${game.uuid}')">📥 Baixar / Instalar</button>
            <button class="btn-ps5 btn-play" onclick="playGame('\${game.uuid}', '\${game.title}')">▶️ Play</button>
            \${isOwner ? \`<button class="btn-ps5 btn-delete" onclick="deleteGame('\${game.uuid}')">🗑️ Excluir Jogo</button>\` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function buyAndInstall(uuid) {
      const user = document.getElementById('username').value.trim();
      if (!user) return alert("É necessário conectar sua PythonSL Account no topo para instalar jogos!");

      const costRes = await fetch('/api/costmoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, game_uuid: uuid })
      });
      const costData = await costRes.json();
      if (!costRes.ok) return alert("Erro na compra: " + (costData.error || "Saldo insuficiente"));

      document.getElementById('balance-display').innerText = 'SL$ ' + costData.new_balance;

      const dlRes = await fetch('/download/' + uuid);
      if (!dlRes.ok) return alert("Erro ao baixar o jogo do servidor.");
      const htmlContent = await dlRes.text();

      const tx = db.transaction(["games"], "readwrite");
      const store = tx.objectStore("games");
      store.put({ uuid, content: htmlContent, updatedAt: new Date().toISOString() });

      tx.oncomplete = () => alert("Jogo instalado com sucesso no IndexedDB!");
    }

    async function deleteGame(uuid) {
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      if (!user || !pass) return alert("Digite seu usuário e senha!");
      if (!confirm("Deseja realmente deletar este jogo permanentemente?")) return;

      const res = await fetch('/api/deletegame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass, game_uuid: uuid })
      });
      const data = await res.json();
      alert(data.message || data.error);
      if (res.ok) loadGames();
    }

    function playGame(uuid, title) {
      const tx = db.transaction(["games"], "readonly");
      const store = tx.objectStore("games");
      const getReq = store.get(uuid);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) return alert("Jogo não encontrado no IndexedDB! Instale o jogo primeiro.");

        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        const blob = new Blob([record.content], { type: 'text/html;charset=utf-8' });
        currentBlobUrl = URL.createObjectURL(blob);

        document.getElementById('playing-title').innerText = '🕹️ Rodando: ' + title;
        document.getElementById('game-frame').src = currentBlobUrl;
        document.getElementById('player-section').style.display = 'flex';
      };
    }

    function closePlayer() {
      document.getElementById('player-section').style.display = 'none';
      document.getElementById('game-frame').src = 'about:blank';
      if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
    }
  </script>
</body>
</html>`;

// ============================================================================
// TEMPLATE HTML - PAINEL DEV (/dev/) ESTILO PS5
// ============================================================================
const DEV_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - Painel Dev PS5</title>
  <style>
    :root {
      --ps5-bg: #111418;
      --ps5-blue: #0070d1;
      --ps5-blue-hover: #005fb8;
      --ps5-card-bg: rgba(26, 32, 44, 0.85);
      --text-main: #f0f4f8;
      --text-muted: #a0aec0;
      --accent: #00f2fe;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { background-color: var(--ps5-bg); color: var(--text-main); padding: 40px; max-width: 900px; margin: auto; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 30px; background: var(--ps5-card-bg); border-radius: 14px; margin-bottom: 30px;
      border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(15px);
    }
    .section { background: var(--ps5-card-bg); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(15px); }
    input, textarea {
      width: 100%; padding: 14px; margin: 10px 0 20px 0; background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; outline: none;
    }
    input:focus, textarea:focus { border-color: var(--ps5-blue); box-shadow: 0 0 8px rgba(0,112,209,0.4); }
    .btn-ps5 {
      background: var(--ps5-blue); color: #fff; border: none; padding: 14px;
      border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%; transition: 0.2s; text-decoration: none; display: block; text-align: center;
    }
    .btn-ps5:hover { background: var(--ps5-blue-hover); transform: scale(1.01); }
  </style>
</head>
<body>
  <header>
    <h1>🛠️ Painel de Publicação Dev</h1>
    <a href="/" class="btn-ps5" style="width: auto; padding: 10px 20px; background: #334155;">Voltar à Store</a>
  </header>

  <div class="section">
    <h3 style="color: var(--accent); margin-bottom: 10px;">Publicar Novo Jogo HTML5 via /api/postgame</h3>
    <p style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 20px;">
      Insira suas credenciais da <strong>PythonSL Account</strong> para registrar o jogo na nuvem com UUID e Hash SHA-256 exclusivos.
    </p>

    <label>Usuário PythonSL (Developer):</label>
    <input type="text" id="dev-user" placeholder="Seu usuário cadastrado">

    <label>Senha da Conta (SHA256):</label>
    <input type="password" id="dev-pass" placeholder="Sua senha">

    <label>Nome Oficial do Jogo:</label>
    <input type="text" id="game-title" placeholder="Ex: Horizon PythonSL">

    <label>Preço em SL$ (0 para gratuito):</label>
    <input type="number" id="game-price" value="0" min="0">

    <label>Arquivo HTML do Jogo (.html):</label>
    <input type="file" id="game-file" accept=".html,.htm" style="padding: 10px; background:rgba(15, 23, 42, 0.7); border:1px solid rgba(255,255,255,0.15); color:#fff; border-radius:8px; margin-bottom:20px;">
    
    <label>Ou Código Fonte HTML5 Bruto:</label>
    <textarea id="game-code" rows="8" placeholder="<!DOCTYPE html>..."></textarea>

    <button class="btn-ps5" onclick="publishGame()" style="background: #10b981;">🚀 Publicar na Nuvem</button>
  </div>

  <script>
    document.getElementById('game-file').addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        document.getElementById('game-code').value = evt.target.result;
      };
      reader.readAsText(file);
    });

    async function publishGame() {
      const developer = document.getElementById('dev-user').value.trim();
      const pass = document.getElementById('dev-pass').value;
      const title = document.getElementById('game-title').value.trim();
      const price = parseInt(document.getElementById('game-price').value, 10);
      const html_content = document.getElementById('game-code').value;

      if (!developer || !pass || !title || !html_content) {
        return alert("Preencha todos os campos obrigatórios e forneça o código HTML!");
      }

      const res = await fetch('/api/postgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developer, pass, title, price, html_content })
      });

      const data = await res.json();
      if (!res.ok) {
        alert("Erro ao publicar: " + (data.error || "Falha desconhecida"));
      } else {
        alert("Sucesso! Jogo '" + title + "' publicado na Store.");
        window.location.href = '/';
      }
    }
  </script>
</body>
</html>`;

// ============================================================================
// WORKER CLOUDFLARE BACKEND
// ============================================================================
async function hashSHA256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        balance INTEGER DEFAULT 0
      )
    `).run();

    if (path === '/' && request.method === 'GET') {
      return new Response(HOME_PAGE, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob:; frame-src 'self' blob:;",
          'X-Frame-Options': 'SAMEORIGIN'
        }
      });
    }

    if (path === '/dev/' && request.method === 'GET') {
      return new Response(DEV_PAGE, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob:;",
          'X-Frame-Options': 'SAMEORIGIN'
        }
      });
    }

    if (path === '/api/postgame' && request.method === 'POST') {
      try {
        const { developer, pass, title, price, html_content } = await request.json();
        
        if (!developer || !pass || !title || price === undefined || !html_content) {
          return Response.json({ error: "Dados incompletos para postar o jogo." }, { status: 400 });
        }

        const passHash = await hashSHA256(pass);
        let userAccount = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(developer).first();

        if (!userAccount) {
          return Response.json({ error: "PythonSL Account não encontrada. Registre sua conta primeiro fazendo login na página principal." }, { status: 401 });
        }
        if (userAccount.password_hash !== passHash) {
          return Response.json({ error: "Senha incorreta da PythonSL Account." }, { status: 401 });
        }

        const uuid = crypto.randomUUID();
        const hash = await hashSHA256(html_content);

        const metadata = {
          uuid,
          title,
          developer,
          price: parseInt(price, 10),
          hash,
          created_at: new Date().toISOString()
        };

        await env.GAMES_KV.put(`game:${uuid}`, html_content, { metadata });

        const listRaw = await env.GAMES_KV.get('games_index');
        const list = listRaw ? JSON.parse(listRaw) : [];
        list.push(metadata);
        await env.GAMES_KV.put('games_index', JSON.stringify(list));

        return Response.json({ message: "Jogo postado com sucesso!", uuid, hash });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (path === '/api/listgames' && request.method === 'GET') {
      const listRaw = await env.GAMES_KV.get('games_index');
      return new Response(listRaw || '[]', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path.startsWith('/download/')) {
      const uuid = path.split('/download/')[1];
      const htmlContent = await env.GAMES_KV.get(`game:${uuid}`);

      if (!htmlContent) {
        return new Response('Jogo não encontrado', { status: 404 });
      }

      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob:;",
          'X-Frame-Options': 'SAMEORIGIN'
        }
      });
    }

    if (path === '/api/reedem/' && request.method === 'POST') {
      try {
        const { user, pass, code } = await request.json();
        if (!user || !pass) return Response.json({ error: "Usuário e senha necessários." }, { status: 400 });

        const passHash = await hashSHA256(pass);
        let userData = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(user).first();

        if (!userData) {
          let initialBalance = (code === 'STATER2016') ? 800 : 0;
          await env.DB.prepare('INSERT INTO users (username, password_hash, balance) VALUES (?, ?, ?)')
            .bind(user, passHash, initialBalance).run();
          
          return Response.json({ message: "PythonSL Account criada com sucesso!", new_balance: initialBalance });
        }

        if (userData.password_hash !== passHash) {
          return Response.json({ error: "Senha incorreta." }, { status: 401 });
        }

        let newBalance = userData.balance;
        if (code === 'STATER2016') {
          newBalance += 800;
          await env.DB.prepare('UPDATE users SET balance = ? WHERE username = ?').bind(newBalance, user).run();
        }

        return Response.json({ message: "Login realizado com sucesso!", new_balance: newBalance });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (path === '/api/costmoney' && request.method === 'POST') {
      try {
        const { user, game_uuid } = await request.json();
        const listRaw = await env.GAMES_KV.get('games_index');
        const games = listRaw ? JSON.parse(listRaw) : [];
        const game = games.find(g => g.uuid === game_uuid);

        if (!game) return Response.json({ error: "Jogo não encontrado." }, { status: 404 });

        const buyer = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(user).first();
        if (!buyer) return Response.json({ error: "PythonSL Account não encontrada." }, { status: 400 });

        if (buyer.balance < game.price) {
          return Response.json({ error: "Saldo em SL$ insuficiente na sua conta." }, { status: 402 });
        }

        const newBuyerBalance = buyer.balance - game.price;
        await env.DB.prepare('UPDATE users SET balance = ? WHERE username = ?').bind(newBuyerBalance, user).run();

        const devUser = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(game.developer).first();
        if (devUser) {
          await env.DB.prepare('UPDATE users SET balance = balance + ? WHERE username = ?').bind(game.price, game.developer).run();
        } else {
          await env.DB.prepare('INSERT INTO users (username, password_hash, balance) VALUES (?, ?, ?)')
            .bind(game.developer, 'AUTO_CREATED_PASS', game.price).run();
        }

        return Response.json({ message: "Compra e transferência realizadas com sucesso!", new_balance: newBuyerBalance });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    if (path === '/api/deletegame' && request.method === 'POST') {
      try {
        const { user, pass, game_uuid } = await request.json();
        if (!user || !pass || !game_uuid) return Response.json({ error: "Dados incompletos." }, { status: 400 });

        const passHash = await hashSHA256(pass);
        const userData = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(user).first();

        if (!userData || userData.password_hash !== passHash) {
          return Response.json({ error: "Credenciais inválidas." }, { status: 401 });
        }

        const listRaw = await env.GAMES_KV.get('games_index');
        let games = listRaw ? JSON.parse(listRaw) : [];
        const gameIndex = games.findIndex(g => g.uuid === game_uuid);

        if (gameIndex === -1) return Response.json({ error: "Jogo não encontrado." }, { status: 404 });
        if (games[gameIndex].developer !== user) return Response.json({ error: "Apenas o desenvolvedor dono pode deletar este jogo." }, { status: 403 });

        await env.GAMES_KV.delete(`game:${game_uuid}`);
        games.splice(gameIndex, 1);
        await env.GAMES_KV.put('games_index', JSON.stringify(games));

        return Response.json({ message: "Jogo deletado com sucesso!" });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return new Response('Rota não encontrada', { status: 404 });
  }
};
