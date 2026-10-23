// ============================================================================
// TEMPLATE HTML / CSS / JS - LOJA PRINCIPAL (PS5 UI COM CSS PURO)
// ============================================================================
const HOME_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - PS5 Experience</title>
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- SweetAlert2 CDN -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <style>
    :root {
      --bg-color: #0d1117;
      --card-bg: rgba(22, 27, 34, 0.85);
      --card-hover: rgba(31, 36, 44, 0.95);
      --ps5-blue: #0070d1;
      --ps5-blue-hover: #005fb8;
      --accent: #00f2fe;
      --text-main: #f0f4f8;
      --text-muted: #8b949e;
      --border-color: rgba(255, 255, 255, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; padding-bottom: 50px; }

    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 30px; background: rgba(13, 17, 23, 0.8); backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 100;
    }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-area h1 { font-size: 1.25rem; font-weight: bold; }
    .tag-ps5 { background: rgba(0, 242, 254, 0.15); color: var(--accent); padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; border: 1px solid rgba(0, 242, 254, 0.3); }

    .user-profile { display: flex; gap: 15px; align-items: center; background: rgba(0,0,0,0.4); padding: 6px 16px; border-radius: 30px; border: 1px solid var(--border-color); }
    .badge-sl { background: var(--ps5-blue); color: #fff; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; box-shadow: 0 0 10px rgba(0,112,209,0.4); }

    .container { max-width: 1300px; margin: auto; padding: 30px 20px; }

    .section-box {
      background: var(--card-bg); border: 1px solid var(--border-color);
      border-radius: 16px; padding: 24px; margin-bottom: 25px; backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .section-box h3 { color: var(--accent); font-size: 1rem; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; }

    .grid-auth { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    input, select {
      width: 100%; padding: 12px 15px; background: rgba(10, 15, 22, 0.8);
      border: 1px solid var(--border-color); color: #fff; border-radius: 10px; outline: none; transition: 0.2s;
    }
    input:focus, select:focus { border-color: var(--ps5-blue); box-shadow: 0 0 8px rgba(0,112,209,0.4); }

    .btn {
      background: var(--ps5-blue); color: #fff; border: none; padding: 12px 20px;
      border-radius: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-align: center;
    }
    .btn:hover { background: var(--ps5-blue-hover); transform: translateY(-1px); }
    .btn-play { background: #10b981; }
    .btn-play:hover { background: #059669; }
    .btn-delete { background: #ef4444; font-size: 0.8rem; padding: 8px 12px; }
    .btn-delete:hover { background: #dc2626; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }

    /* Carrossel PS5 */
    .ps5-carousel {
      display: flex; gap: 20px; overflow-x: auto; padding-bottom: 15px;
      scroll-snap-type: x mandatory; scrollbar-width: thin; scrollbar-color: var(--ps5-blue) var(--card-bg);
    }
    .ps5-hero-card {
      min-width: 300px; max-width: 300px; height: 170px; scroll-snap-align: start;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border: 2px solid var(--border-color); border-radius: 14px; padding: 18px;
      display: flex; flex-direction: column; justify-content: space-between; transition: 0.3s;
    }
    .ps5-hero-card:hover { transform: scale(1.03); border-color: var(--ps5-blue); box-shadow: 0 10px 25px rgba(0,112,209,0.3); }

    /* Grid do Catálogo */
    h2 { font-size: 1.4rem; font-weight: 500; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    .game-card {
      background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 14px;
      padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: 0.3s;
    }
    .game-card:hover { transform: translateY(-5px); border-color: var(--ps5-blue); background: var(--card-hover); box-shadow: 0 10px 25px rgba(0,112,209,0.2); }

    /* Player Tela Cheia */
    #player-section {
      background: rgba(8, 12, 18, 0.96); position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 1000; padding: 25px; display: none; flex-direction: column; backdrop-filter: blur(20px);
    }
    .player-wrapper { flex: 1; width: 100%; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); margin-top: 15px; }
    iframe { width: 100%; height: 100%; border: none; background: #fff; }
  </style>
</head>
<body>

  <header>
    <div class="logo-area">
      <i class="fa-solid fa-gamepad" style="color: var(--accent); font-size: 1.5rem;"></i>
      <h1>PythonSL GameShop <span class="tag-ps5">PS5 UI</span></h1>
    </div>
    <div class="user-profile">
      <span id="user-display" style="color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-user"></i> Visitante</span>
      <span class="badge-sl" id="balance-display">SL$ 0</span>
      <a href="/dev/" class="btn" style="padding: 6px 12px; font-size: 0.8rem; background: #059669;"><i class="fa-solid fa-code"></i> Painel Dev</a>
    </div>
  </header>

  <div class="container">

    <!-- Conta & Vonder -->
    <div class="section-box">
      <h3><i class="fa-solid fa-key"></i> PythonSL Account & Resgate de Vonder</h3>
      <div class="grid-auth">
        <input type="text" id="username" placeholder="Usuário PythonSL">
        <input type="password" id="password" placeholder="Senha SHA256">
        <input type="text" id="redeem-code" placeholder="Código Vonder (ex: STATER2016)">
        <button class="btn" onclick="redeem()"><i class="fa-solid fa-right-to-bracket"></i> Conectar / Resgatar</button>
      </div>
    </div>

    <!-- Carrossel Destaque PS5 -->
    <div style="margin-bottom: 35px;">
      <h2><i class="fa-solid fa-fire" style="color: #f59e0b;"></i> Jogos em Destaque (PS5 Carousel)</h2>
      <div id="ps5-hero-carousel" class="ps5-carousel">
        <p style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">A carregar carrossel...</p>
      </div>
    </div>

    <!-- Busca Avançada -->
    <div class="section-box">
      <h3><i class="fa-solid fa-magnifying-glass"></i> Pesquisar na Store</h3>
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: center;">
        <input type="text" id="search-query" placeholder="Nome, dev, UUID ou Hash..." oninput="filterGames()">
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
        <button class="btn btn-secondary" onclick="resetSearch()" title="Limpar Filtros"><i class="fa-solid fa-rotate-right"></i></button>
      </div>
    </div>

    <!-- Catálogo Completo -->
    <h2><i class="fa-solid fa-store" style="color: var(--accent);"></i> Biblioteca Completa</h2>
    <div class="games-grid" id="games-list"></div>

  </div>

  <!-- Player Tela Cheia PS5 -->
  <div id="player-section">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 id="playing-title" style="font-size: 1.1rem; color: #fff;"><i class="fa-solid fa-play" style="color: #10b981;"></i> Rodando Jogo</h3>
      <button class="btn btn-delete" onclick="closePlayer()"><i class="fa-solid fa-xmark"></i> Sair do Jogo</button>
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

      if (!user || !pass) {
        return Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Preencha seu usuário e senha da PythonSL Account!', background: '#161b22', color: '#fff' });
      }

      const res = await fetch('/api/reedem/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass, code })
      });
      const data = await res.json();
      
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Erro', text: data.error, background: '#161b22', color: '#fff' });
      } else {
        Swal.fire({ icon: 'success', title: 'Sucesso!', text: data.message, background: '#161b22', color: '#fff', timer: 2000, showConfirmButton: false });
        document.getElementById('user-display').innerHTML = '<i class="fa-solid fa-user"></i> ' + user;
        document.getElementById('balance-display').innerText = 'SL$ ' + data.new_balance;
        filterGames();
      }
    }

    async function loadGames() {
      const res = await fetch('/api/listgames');
      allGamesCache = await res.json();
      renderHeroCarousel(allGamesCache);
      filterGames();
    }

    function renderHeroCarousel(games) {
      const carousel = document.getElementById('ps5-hero-carousel');
      carousel.innerHTML = '';

      if (games.length === 0) {
        carousel.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Nenhum jogo em destaque no momento.</p>';
        return;
      }

      const recentGames = [...games].reverse().slice(0, 6);

      recentGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'ps5-hero-card';
        card.innerHTML = \`
          <div>
            <span style="font-size: 0.7rem; background: var(--ps5-blue); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">Destaque</span>
            <h4 style="font-size: 1.1rem; color: #fff; margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${game.title}</h4>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">Dev: \${game.developer}</p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <span style="color: var(--accent); font-weight: bold; font-size: 0.95rem;">SL$ \${game.price}</span>
            <div style="display: flex; gap: 6px;">
              <button onclick="buyAndInstall('\${game.uuid}')" class="btn" style="padding: 6px 10px; font-size: 0.8rem;" title="Baixar/Instalar"><i class="fa-solid fa-download"></i></button>
              <button onclick="playGame('\${game.uuid}', '\${game.title}')" class="btn btn-play" style="padding: 6px 10px; font-size: 0.8rem;" title="Jogar Agora"><i class="fa-solid fa-play"></i></button>
            </div>
          </div>
        \`;
        carousel.appendChild(card);
      });
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
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-ghost" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i> Nenhum jogo encontrado na Store.</p>';
        return;
      }
      games.forEach(game => {
        const isOwner = currentUser && currentUser === game.developer;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = \`
          <div>
            <h3 style="font-size: 1.1rem; font-weight: bold; color: #fff; margin-bottom: 4px;">\${game.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px;"><i class="fa-solid fa-code-merge"></i> Dev: \${game.developer}</p>
            <p style="color: var(--accent); font-weight: bold; font-size: 1rem; margin-bottom: 15px;"><i class="fa-solid fa-coins"></i> SL$ \${game.price}</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button onclick="buyAndInstall('\${game.uuid}')" class="btn" style="font-size: 0.85rem; padding: 10px;"><i class="fa-solid fa-download"></i> Baixar / Instalar</button>
            <button onclick="playGame('\${game.uuid}', '\${game.title}')" class="btn btn-play" style="font-size: 0.85rem; padding: 10px;"><i class="fa-solid fa-play"></i> Play</button>
            \${isOwner ? \`<button onclick="deleteGame('\${game.uuid}')" class="btn btn-delete" style="width: 100%;"><i class="fa-solid fa-trash"></i> Excluir Jogo</button>\` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function buyAndInstall(uuid) {
      const user = document.getElementById('username').value.trim();
      if (!user) {
        return Swal.fire({ icon: 'warning', title: 'Conta Necessária', text: 'Conecte sua PythonSL Account no topo para instalar jogos!', background: '#161b22', color: '#fff' });
      }

      const costRes = await fetch('/api/costmoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, game_uuid: uuid })
      });
      const costData = await costRes.json();
      if (!costRes.ok) {
        return Swal.fire({ icon: 'error', title: 'Falha na Instalação', text: costData.error || 'Saldo insuficiente', background: '#161b22', color: '#fff' });
      }

      document.getElementById('balance-display').innerText = 'SL$ ' + costData.new_balance;

      const dlRes = await fetch('/download/' + uuid);
      if (!dlRes.ok) {
        return Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao baixar o jogo do servidor.', background: '#161b22', color: '#fff' });
      }
      const htmlContent = await dlRes.text();

      const tx = db.transaction(["games"], "readwrite");
      const store = tx.objectStore("games");
      store.put({ uuid, content: htmlContent, updatedAt: new Date().toISOString() });

      tx.oncomplete = () => {
        Swal.fire({ icon: 'success', title: 'Instalado!', text: 'Jogo salvo com sucesso no IndexedDB!', background: '#161b22', color: '#fff', timer: 2000, showConfirmButton: false });
      };
    }

    async function deleteGame(uuid) {
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      if (!user || !pass) {
        return Swal.fire({ icon: 'warning', title: 'Autenticação', text: 'Digite seu usuário e senha!', background: '#161b22', color: '#fff' });
      }

      const confirmResult = await Swal.fire({
        title: 'Tem certeza?',
        text: "Deseja realmente deletar este jogo permanentemente?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sim, deletar',
        cancelButtonText: 'Cancelar',
        background: '#161b22',
        color: '#fff'
      });

      if (!confirmResult.isConfirmed) return;

      const res = await fetch('/api/deletegame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass, game_uuid: uuid })
      });
      const data = await res.json();
      
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Erro', text: data.error, background: '#161b22', color: '#fff' });
      } else {
        Swal.fire({ icon: 'success', title: 'Deletado', text: data.message, background: '#161b22', color: '#fff', timer: 2000, showConfirmButton: false });
        loadGames();
      }
    }

    function playGame(uuid, title) {
      const tx = db.transaction(["games"], "readonly");
      const store = tx.objectStore("games");
      const getReq = store.get(uuid);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (!record) {
          return Swal.fire({ icon: 'info', title: 'Não instalado', text: 'Instale o jogo clicando em "Baixar / Instalar" primeiro!', background: '#161b22', color: '#fff' });
        }

        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        const blob = new Blob([record.content], { type: 'text/html;charset=utf-8' });
        currentBlobUrl = URL.createObjectURL(blob);

        document.getElementById('playing-title').innerHTML = '<i class="fa-solid fa-play" style="color: #10b981;"></i> Rodando: ' + title;
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
// TEMPLATE HTML - PAINEL DEV (/dev/)
// ============================================================================
const DEV_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - Painel Dev</title>
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- SweetAlert2 CDN -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <style>
    :root {
      --bg-color: #0d1117;
      --card-bg: rgba(22, 27, 34, 0.9);
      --ps5-blue: #0070d1;
      --ps5-blue-hover: #005fb8;
      --accent: #00f2fe;
      --text-main: #f0f4f8;
      --text-muted: #8b949e;
      --border-color: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-color); color: var(--text-main); min-height: 100vh; padding: 30px 20px; display: flex; align-items: center; justify-content: center; }

    .dev-card {
      width: 100%; max-width: 600px; background: var(--card-bg); border: 1px solid var(--border-color);
      border-radius: 20px; padding: 30px; backdrop-filter: blur(15px); box-shadow: 0 15px 35px rgba(0,0,0,0.5);
    }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; margin-bottom: 20px; }
    header h1 { font-size: 1.2rem; color: var(--accent); }

    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px; }
    input, textarea {
      width: 100%; padding: 12px 15px; background: rgba(10, 15, 22, 0.8);
      border: 1px solid var(--border-color); color: #fff; border-radius: 10px; outline: none; transition: 0.2s; font-size: 0.95rem;
    }
    input:focus, textarea:focus { border-color: var(--ps5-blue); box-shadow: 0 0 8px rgba(0,112,209,0.4); }

    .btn {
      background: #059669; color: #fff; border: none; padding: 14px;
      border-radius: 10px; font-weight: bold; cursor: pointer; width: 100%; transition: 0.2s; text-decoration: none; display: block; text-align: center; margin-top: 10px;
    }
    .btn:hover { background: #047857; }
    .btn-back { background: #334155; padding: 8px 14px; font-size: 0.8rem; width: auto; display: inline-block; }
    .btn-back:hover { background: #475569; }
  </style>
</head>
<body>

  <div class="dev-card">
    <header>
      <h1><i class="fa-solid fa-code"></i> Painel de Publicação Dev</h1>
      <a href="/" class="btn btn-back"><i class="fa-solid fa-store"></i> Voltar à Store</a>
    </header>

    <div>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px;">
        Insira suas credenciais da <strong style="color: var(--accent);">PythonSL Account</strong> para publicar seu jogo HTML5 na nuvem via <code style="background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; color: var(--accent);">/api/postgame</code>.
      </p>

      <div class="form-group">
        <label>Usuário PythonSL (Developer):</label>
        <input type="text" id="dev-user" placeholder="Seu usuário">
      </div>

      <div class="form-group">
        <label>Senha da Conta (SHA256):</label>
        <input type="password" id="dev-pass" placeholder="Sua senha">
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label>Nome Oficial do Jogo:</label>
          <input type="text" id="game-title" placeholder="Ex: Cyber PythonSL">
        </div>
        <div class="form-group">
          <label>Preço em SL$ (0 = Grátis):</label>
          <input type="number" id="game-price" value="0" min="0">
        </div>
      </div>

      <div class="form-group">
        <label>Arquivo HTML (.html):</label>
        <input type="file" id="game-file" accept=".html,.htm" style="padding: 8px; cursor: pointer;">
      </div>

      <div class="form-group">
        <label>Ou Código HTML5 Bruto:</label>
        <textarea id="game-code" rows="5" placeholder="<!DOCTYPE html>..."></textarea>
      </div>

      <button onclick="publishGame()" class="btn"><i class="fa-solid fa-cloud-arrow-up"></i> Publicar Jogo na Nuvem</button>
    </div>
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
        return Swal.fire({ icon: 'warning', title: 'Campos Incompletos', text: 'Preencha todas as informações e o código HTML!', background: '#161b22', color: '#fff' });
      }

      Swal.fire({
        title: 'Publicando...',
        text: 'Enviando jogo para a nuvem da PythonSL...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: '#161b22', color: '#fff'
      });

      const res = await fetch('/api/postgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developer, pass, title, price, html_content })
      });

      const data = await res.json();
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Erro ao Publicar', text: data.error || 'Falha desconhecida', background: '#161b22', color: '#fff' });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Publicado com Sucesso!',
          text: 'Seu jogo já está disponível na Store.',
          background: '#161b22',
          color: '#fff'
        }).then(() => {
          window.location.href = '/';
        });
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
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; frame-src 'self' blob:;",
          'X-Frame-Options': 'SAMEORIGIN'
        }
      });
    }

    if (path === '/dev/' && request.method === 'GET') {
      return new Response(DEV_PAGE, {
        headers: { 
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; frame-src 'self' blob:;",
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
