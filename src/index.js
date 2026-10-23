// ============================================================================
// TEMPLATE HTML / CSS / JS - LOJA PRINCIPAL (/)
// ============================================================================
const HOME_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background-color: var(--bg-color); color: var(--text); padding: 20px; line-height: 1.6; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px; background: var(--card-bg); backdrop-filter: blur(10px);
      border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-bottom: 25px;
    }
    .user-info { display: flex; gap: 15px; align-items: center; }
    .badge { background: #0284c7; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.9em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
    .card {
      background: var(--card-bg); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 20px; display: flex; flex-direction: column; justify-content: space-between;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover { transform: translateY(-5px); border-color: var(--accent); }
    .btn {
      background: var(--accent); color: #000; border: none; padding: 10px 15px;
      border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; text-decoration: none; text-align: center; margin-top: 10px;
    }
    .btn:hover { background: var(--accent-hover); color: #fff; }
    .btn-play { background: #10b981; color: #fff; }
    .btn-play:hover { background: #059669; }
    .btn-delete { background: #ef4444; color: #fff; padding: 6px 10px; font-size: 0.85em; margin-top: 5px; }
    .btn-delete:hover { background: #dc2626; }
    input, select {
      width: 100%; padding: 10px; margin: 8px 0; background: #1e293b; border: 1px solid #334155;
      color: #fff; border-radius: 6px;
    }
    .section { background: var(--card-bg); padding: 20px; border-radius: 12px; margin-bottom: 25px; }
    .search-box-container {
      display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: center;
    }
    @media(max-width: 768px) { .search-box-container { grid-template-columns: 1fr; } }
    .player-container { position: relative; margin-top: 15px; }
    iframe { width: 100%; height: 500px; border: none; border-radius: 8px; background: #fff; }
  </style>
</head>
<body>

  <header>
    <h1>🐍 PythonSL GameShop</h1>
    <div class="user-info">
      <span id="user-display">Visitante</span>
      <span class="badge" id="balance-display">SL$ 0</span>
      <a href="/dev/" class="btn" style="margin:0; padding:6px 12px; font-size:0.85em; background:#10b981; color:#fff;">Painel Dev (/dev/)</a>
    </div>
  </header>

  <div class="section">
    <h3>🔑 PythonSL Account (Login / Resgatar Vonder)</h3>
    <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
      <input type="text" id="username" placeholder="Usuário PythonSL" style="flex: 1;">
      <input type="password" id="password" placeholder="Senha SHA256" style="flex: 1;">
      <input type="text" id="redeem-code" placeholder="Código Vonder (ex: STATER2016)" style="flex: 1;">
      <button class="btn" onclick="redeem()" style="margin-top:8px;">Entrar / Registrar</button>
    </div>
  </div>

  <div class="section">
    <h3>🔍 Busca Avançada de Jogos por Nome, Dev, UUID ou Hash</h3>
    <div class="search-box-container" style="margin-top: 12px;">
      <input type="text" id="search-query" placeholder="Digite o nome do jogo, dev..." oninput="filterGames()">
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
      <button class="btn" onclick="resetSearch()" style="background:#475569; color:#fff; margin-top:0;">Limpar</button>
    </div>
  </div>

  <h2>🎮 Catálogo de Jogos</h2>
  <div class="grid" id="games-list" style="margin-top: 15px;"></div>

  <div class="section" id="player-section" style="display:none; margin-top: 25px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 id="playing-title">🕹️ Rodando Jogo</h3>
      <button class="btn" onclick="closePlayer()" style="background:#ef4444; color:#fff; margin:0; padding: 5px 10px;">Fechar Jogo</button>
    </div>
    <div class="player-container">
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

      if (!user || !pass) return alert("Preencha usuário e senha da sua PythonSL Account!");

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
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Nenhum jogo encontrado.</p>';
        return;
      }
      games.forEach(game => {
        const isOwner = currentUser && currentUser === game.developer;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = \`
          <div>
            <h3 style="color: var(--accent);">\${game.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.85em; margin-top: 4px;">Dev: \${game.developer}</p>
            <p style="margin-top: 12px;">Preço: <strong>SL$ \${game.price}</strong></p>
          </div>
          <div style="display:flex; gap:5px; flex-direction:column; margin-top: 15px;">
            <button class="btn" onclick="buyAndInstall('\${game.uuid}')">📥 Baixar / Instalar</button>
            <button class="btn btn-play" onclick="playGame('\${game.uuid}', '\${game.title}')">▶️ Play</button>
            \${isOwner ? \`<button class="btn btn-delete" onclick="deleteGame('\${game.uuid}')">🗑️ Excluir Jogo</button>\` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function buyAndInstall(uuid) {
      const user = document.getElementById('username').value.trim();
      if (!user) return alert("É necessário possuir/conectar uma PythonSL Account no topo para instalar jogos!");

      const costRes = await fetch('/api/costmoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, game_uuid: uuid })
      });
      const costData = await costRes.json();
      if (!costRes.ok) return alert("Erro na compra/instalação: " + (costData.error || "Saldo insuficiente"));

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
      if (!confirm("Deseja realmente deletar este jogo?")) return;

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
        document.getElementById('player-section').style.display = 'block';
        document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
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
// TEMPLATE HTML - PAINEL DEV (/dev/)
// ============================================================================
const DEV_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - Painel Dev</title>
  <style>
    :root {
      --bg-color: #0f172a;
      --card-bg: rgba(30, 41, 59, 0.7);
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
    body { background-color: var(--bg-color); color: var(--text); padding: 20px; line-height: 1.6; max-width: 800px; margin: auto; }
    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px; background: var(--card-bg); border-radius: 12px; margin-bottom: 25px;
    }
    .section { background: var(--card-bg); padding: 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
    input, textarea {
      width: 100%; padding: 12px; margin: 10px 0 20px 0; background: #1e293b; border: 1px solid #334155;
      color: #fff; border-radius: 6px;
    }
    .btn {
      background: var(--accent); color: #000; border: none; padding: 12px 20px;
      border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; transition: 0.2s; text-decoration: none; display: inline-block; text-align: center;
    }
    .btn:hover { background: var(--accent-hover); color: #fff; }
  </style>
</head>
<body>
  <header>
    <h1>🛠️ Painel de Publicação Dev</h1>
    <a href="/" class="btn" style="width: auto; padding: 8px 15px; background: #475569; color:#fff;">Voltar à Loja</a>
  </header>

  <div class="section">
    <h3>Postar Jogo HTML5 via /api/postgame</h3>
    <p style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 15px;">
      Exige uma <strong>PythonSL Account</strong> válida. O jogo receberá um nome oficial, UUID e Hash SHA-256 exclusivos na nuvem.
    </p>

    <label>Usuário PythonSL (Developer):</label>
    <input type="text" id="dev-user" placeholder="Seu usuário cadastrado">

    <label>Senha da Conta (SHA256):</label>
    <input type="password" id="dev-pass" placeholder="Sua senha">

    <label>Nome do Jogo (Título Oficial):</label>
    <input type="text" id="game-title" placeholder="Ex: Super PythonSL Bros">

    <label>Preço em SL$ (0 para gratuito):</label>
    <input type="number" id="game-price" value="0" min="0">

    <label>Arquivo HTML do Jogo (.html):</label>
    <input type="file" id="game-file" accept=".html,.htm" style="padding: 8px; background:#1e293b; border:1px solid #334155; color:#fff; border-radius:6px; margin-bottom:15px;">
    
    <textarea id="game-code" rows="8" placeholder="Ou cole o código HTML5 bruto aqui diretamente..."></textarea>

    <button class="btn" onclick="publishGame()">🚀 Publicar Jogo na Nuvem</button>
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
        return alert("Preencha todos os campos obrigatórios, incluindo o Nome do Jogo e o código HTML!");
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
        alert("Sucesso! Jogo '" + title + "' publicado. UUID: " + data.uuid);
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
          return Response.json({ error: "PythonSL Account não encontrada. Registre sua conta fazendo login na página principal." }, { status: 401 });
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
