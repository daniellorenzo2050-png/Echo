// ============================================================================
// TEMPLATE HTML / CSS / JS - LOJA PRINCIPAL COM CARROSSEL DE CARDS ESTILO PS5
// ============================================================================
const HOME_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PythonSL GameShop - PS5 Experience</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- SweetAlert2 CDN -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            ps5Bg: '#0d1117',
            ps5Blue: '#0070d1',
            ps5BlueHover: '#005fb8',
            ps5Card: '#161b22',
            ps5CardHover: '#1f242c',
          }
        }
      }
    }
  </script>
  <style>
    /* Estilo de Carrossel PS5 Smooth */
    .ps5-carousel {
      display: flex;
      gap: 20px;
      overflow-x: auto;
      padding-bottom: 15px;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      scrollbar-color: #0070d1 #161b22;
    }
    .ps5-carousel::-webkit-scrollbar { height: 8px; }
    .ps5-carousel::-webkit-scrollbar-track { background: #161b22; border-radius: 4px; }
    .ps5-carousel::-webkit-scrollbar-thumb { background: #0070d1; border-radius: 4px; }
    
    .ps5-hero-card {
      min-width: 320px;
      max-width: 320px;
      height: 180px;
      scroll-snap-align: start;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      position: relative;
      overflow: hidden;
    }
    .ps5-hero-card:hover {
      transform: scale(1.05);
      border-color: #0070d1;
      box-shadow: 0 15px 30px rgba(0, 112, 209, 0.4);
    }
  </style>
</head>
<body class="bg-ps5Bg text-slate-100 min-h-screen selection:bg-cyan-500 selection:text-black">

  <!-- Header / StatusBar -->
  <header class="flex justify-between items-center px-10 py-5 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-gamepad text-2xl text-cyan-400"></i>
      <h1 class="text-xl font-bold tracking-wide">PythonSL GameShop <span class="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-md ml-2 border border-cyan-500/30">PS5 UI</span></h1>
    </div>
    <div class="flex items-center gap-4 bg-black/40 px-5 py-2 rounded-full border border-white/10">
      <span id="user-display" class="text-slate-400 text-sm"><i class="fa-solid fa-user mr-1.5"></i> Visitante</span>
      <span id="balance-display" class="bg-ps5Blue text-white px-3 py-1 rounded-full font-bold text-xs shadow-lg shadow-blue-500/30">SL$ 0</span>
      <a href="/dev/" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5">
        <i class="fa-solid fa-code"></i> Painel Dev
      </a>
    </div>
  </header>

  <main class="max-w-7xl mx-auto p-8 space-y-8">

    <!-- Seção de Conta & Vonder -->
    <section class="bg-slate-900/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
      <h3 class="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
        <i class="fa-solid fa-key"></i> PythonSL Account & Resgate de Vonder
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input type="text" id="username" placeholder="Usuário PythonSL" class="bg-slate-950/70 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-ps5Blue focus:ring-2 focus:ring-ps5Blue/40 transition">
        <input type="password" id="password" placeholder="Senha SHA256" class="bg-slate-950/70 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-ps5Blue focus:ring-2 focus:ring-ps5Blue/40 transition">
        <input type="text" id="redeem-code" placeholder="Código Vonder (ex: STATER2016)" class="bg-slate-950/70 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-ps5Blue focus:ring-2 focus:ring-ps5Blue/40 transition">
        <button onclick="redeem()" class="bg-ps5Blue hover:bg-ps5BlueHover text-white font-bold px-6 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30">
          <i class="fa-solid fa-right-to-bracket"></i> Conectar / Resgatar
        </button>
      </div>
    </section>

    <!-- SISTEMA DE CARDS EM DESTAQUE (ESTILO CARROSSEL PS5) -->
    <section>
      <h2 class="text-2xl font-light mb-4 flex items-center gap-2.5">
        <i class="fa-solid fa-fire text-amber-400"></i> Jogos em Destaque (PS5 Carousel)
      </h2>
      <div id="ps5-hero-carousel" class="ps5-carousel">
        <p class="text-slate-500 text-sm italic">Carregando carrossel...</p>
      </div>
    </section>

    <!-- Barra de Pesquisa Avançada -->
    <section class="bg-slate-900/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
      <h3 class="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
        <i class="fa-solid fa-magnifying-glass"></i> Pesquisar na Store
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input type="text" id="search-query" placeholder="Nome, dev, UUID ou Hash..." oninput="filterGames()" class="md:col-span-2 bg-slate-950/70 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-ps5Blue focus:ring-2 focus:ring-ps5Blue/40 transition">
        <select id="search-price-filter" onchange="filterGames()" class="bg-slate-950/70 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-ps5Blue">
          <option value="all">Todos os Preços</option>
          <option value="free">Grátis (SL$ 0)</option>
          <option value="paid">Pagos (SL$ > 0)</option>
        </select>
        <div class="flex gap-2">
          <select id="search-sort" onchange="filterGames()" class="w-full bg-slate-950/70 border border-white/15 px-3 py-3 rounded-xl focus:outline-none focus:border-ps5Blue">
            <option value="newest">Mais Recentes</option>
            <option value="price-asc">Menor Preço</option>
            <option value="price-desc">Maior Preço</option>
            <option value="title">Nome (A-Z)</option>
          </select>
          <button onclick="resetSearch()" class="bg-slate-700 hover:bg-slate-600 px-4 py-3 rounded-xl transition text-white" title="Limpar Filtros">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>
    </section>

    <!-- Catálogo de Jogos -->
    <div>
      <h2 class="text-2xl font-light mb-6 flex items-center gap-2.5">
        <i class="fa-solid fa-store text-cyan-400"></i> Biblioteca Completa
      </h2>
      <div id="games-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>
    </div>

  </main>

  <!-- Player de Jogo (Fullscreen PS5 Modal) -->
  <div id="player-section" class="fixed inset-0 bg-slate-950/95 z-50 p-8 flex-col hidden backdrop-blur-2xl">
    <div class="flex justify-between items-center mb-4">
      <h3 id="playing-title" class="text-xl font-semibold flex items-center gap-2">
        <i class="fa-solid fa-play text-emerald-400"></i> Rodando Jogo
      </h3>
      <button onclick="closePlayer()" class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-red-600/30">
        <i class="fa-solid fa-xmark"></i> Sair do Jogo
      </button>
    </div>
    <div class="flex-1 w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <iframe id="game-frame" sandbox="allow-scripts allow-same-origin allow-modals" class="w-full h-full bg-white"></iframe>
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
        return Swal.fire({ icon: 'warning', title: 'Atenção', text: 'Preencha seu usuário e senha da PythonSL Account!', background: '#1e293b', color: '#fff' });
      }

      const res = await fetch('/api/reedem/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, pass, code })
      });
      const data = await res.json();
      
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Erro', text: data.error, background: '#1e293b', color: '#fff' });
      } else {
        Swal.fire({ icon: 'success', title: 'Sucesso!', text: data.message, background: '#1e293b', color: '#fff', timer: 2000, showConfirmButton: false });
        document.getElementById('user-display').innerHTML = '<i class="fa-solid fa-user mr-1.5"></i> ' + user;
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

    // Renderizador do Carrossel Estilo PS5 no Topo
    function renderHeroCarousel(games) {
      const carousel = document.getElementById('ps5-hero-carousel');
      carousel.innerHTML = '';

      if (games.length === 0) {
        carousel.innerHTML = '<p class="text-slate-500 text-sm">Nenhum jogo em destaque no momento.</p>';
        return;
      }

      // Pega até os últimos 6 jogos adicionados para o carrossel estilo PS5
      const recentGames = [...games].reverse().slice(0, 6);

      recentGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'ps5-hero-card';
        card.innerHTML = \`
          <div>
            <span class="text-xs bg-ps5Blue text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Destaque</span>
            <h4 class="text-lg font-bold text-white mt-2 truncate">\${game.title}</h4>
            <p class="text-slate-400 text-xs">Dev: \${game.developer}</p>
          </div>
          <div class="flex justify-between items-center mt-3">
            <span class="text-cyan-400 font-bold text-sm">SL$ \${game.price}</span>
            <div class="flex gap-2">
              <button onclick="buyAndInstall('\${game.uuid}')" class="bg-ps5Blue hover:bg-ps5BlueHover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow" title="Baixar/Instalar">
                <i class="fa-solid fa-download"></i>
              </button>
              <button onclick="playGame('\${game.uuid}', '\${game.title}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow" title="Jogar Agora">
                <i class="fa-solid fa-play"></i>
              </button>
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
        container.innerHTML = '<p class="text-slate-500 col-span-full text-center py-12"><i class="fa-solid fa-ghost text-4xl mb-3 block"></i> Nenhum jogo encontrado na Store.</p>';
        return;
      }
      games.forEach(game => {
        const isOwner = currentUser && currentUser === game.developer;
        const card = document.createElement('div');
        card.className = 'bg-slate-900/80 border border-white/5 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:border-ps5Blue hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-slate-800/90';
        card.innerHTML = \`
          <div>
            <h3 class="text-lg font-bold text-white mb-1">\${game.title}</h3>
            <p class="text-slate-400 text-xs mb-4"><i class="fa-solid fa-code-merge mr-1"></i> Dev: \${game.developer}</p>
            <p class="text-cyan-400 font-bold text-base mb-4"><i class="fa-solid fa-coins mr-1"></i> SL$ \${game.price}</p>
          </div>
          <div class="flex flex-col gap-2">
            <button onclick="buyAndInstall('\${game.uuid}')" class="bg-ps5Blue hover:bg-ps5BlueHover text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-download"></i> Baixar / Instalar
            </button>
            <button onclick="playGame('\${game.uuid}', '\${game.title}')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-play"></i> Play
            </button>
            \${isOwner ? \`<button onclick="deleteGame('\${game.uuid}')" class="bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center justify-center gap-2 mt-1"><i class="fa-solid fa-trash"></i> Excluir Jogo</button>\` : ''}
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function buyAndInstall(uuid) {
      const user = document.getElementById('username').value.trim();
      if (!user) {
        return Swal.fire({ icon: 'warning', title: 'Conta Necessária', text: 'Conecte sua PythonSL Account no topo para instalar jogos!', background: '#1e293b', color: '#fff' });
      }

      const costRes = await fetch('/api/costmoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, game_uuid: uuid })
      });
      const costData = await costRes.json();
      if (!costRes.ok) {
        return Swal.fire({ icon: 'error', title: 'Falha na Instalação', text: costData.error || 'Saldo insuficiente', background: '#1e293b', color: '#fff' });
      }

      document.getElementById('balance-display').innerText = 'SL$ ' + costData.new_balance;

      const dlRes = await fetch('/download/' + uuid);
      if (!dlRes.ok) {
        return Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao baixar o jogo do servidor.', background: '#1e293b', color: '#fff' });
      }
      const htmlContent = await dlRes.text();

      const tx = db.transaction(["games"], "readwrite");
      const store = tx.objectStore("games");
      store.put({ uuid, content: htmlContent, updatedAt: new Date().toISOString() });

      tx.oncomplete = () => {
        Swal.fire({ icon: 'success', title: 'Instalado!', text: 'Jogo salvo com sucesso no IndexedDB!', background: '#1e293b', color: '#fff', timer: 2000, showConfirmButton: false });
      };
    }

    async function deleteGame(uuid) {
      const user = document.getElementById('username').value.trim();
      const pass = document.getElementById('password').value;
      if (!user || !pass) {
        return Swal.fire({ icon: 'warning', title: 'Autenticação', text: 'Digite seu usuário e senha!', background: '#1e293b', color: '#fff' });
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
        background: '#1e293b',
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
        Swal.fire({ icon: 'error', title: 'Erro', text: data.error, background: '#1e293b', color: '#fff' });
      } else {
        Swal.fire({ icon: 'success', title: 'Deletado', text: data.message, background: '#1e293b', color: '#fff', timer: 2000, showConfirmButton: false });
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
          return Swal.fire({ icon: 'info', title: 'Não instalado', text: 'Instale o jogo clicando em "Baixar / Instalar" primeiro!', background: '#1e293b', color: '#fff' });
        }

        if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
        const blob = new Blob([record.content], { type: 'text/html;charset=utf-8' });
        currentBlobUrl = URL.createObjectURL(blob);

        document.getElementById('playing-title').innerHTML = '<i class="fa-solid fa-play text-emerald-400"></i> Rodando: ' + title;
        document.getElementById('game-frame').src = currentBlobUrl;
        
        const playerSec = document.getElementById('player-section');
        playerSec.classList.remove('hidden');
        playerSec.classList.add('flex');
      };
    }

    function closePlayer() {
      const playerSec = document.getElementById('player-section');
      playerSec.classList.remove('flex');
      playerSec.classList.add('hidden');
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
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Font Awesome CDN -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- SweetAlert2 CDN -->
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body class="bg-[#111418] text-slate-100 min-h-screen p-8 flex flex-col items-center justify-center">

  <div class="w-full max-w-2xl bg-slate-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl space-y-6">
    <header class="flex justify-between items-center border-b border-white/10 pb-4">
      <h1 class="text-xl font-bold flex items-center gap-2"><i class="fa-solid fa-code text-cyan-400"></i> Painel de Publicação Dev</h1>
      <a href="/" class="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-1.5">
        <i class="fa-solid fa-store"></i> Voltar à Store
      </a>
    </header>

    <div class="space-y-4">
      <p class="text-slate-400 text-sm">
        Insira suas credenciais da <strong class="text-cyan-400">PythonSL Account</strong> para publicar seu jogo HTML5 na nuvem via <code class="bg-black/50 px-2 py-0.5 rounded text-cyan-300">/api/postgame</code>.
      </p>

      <div>
        <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Usuário PythonSL (Developer):</label>
        <input type="text" id="dev-user" placeholder="Seu usuário" class="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500">
      </div>

      <div>
        <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Senha da Conta (SHA256):</label>
        <input type="password" id="dev-pass" placeholder="Sua senha" class="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500">
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Nome Oficial do Jogo:</label>
          <input type="text" id="game-title" placeholder="Ex: Cyber PythonSL" class="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500">
        </div>
        <div>
          <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Preço em SL$ (0 = Grátis):</label>
          <input type="number" id="game-price" value="0" min="0" class="w-full bg-slate-950 border border-white/15 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500">
        </div>
      </div>

      <div>
        <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Arquivo HTML (.html):</label>
        <input type="file" id="game-file" accept=".html,.htm" class="w-full bg-slate-950 border border-white/15 p-2.5 rounded-xl text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer">
      </div>

      <div>
        <label class="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Ou Código HTML5 Bruto:</label>
        <textarea id="game-code" rows="6" placeholder="<!DOCTYPE html>..." class="w-full bg-slate-950 border border-white/15 p-4 rounded-xl focus:outline-none font-mono text-sm focus:border-cyan-500"></textarea>
      </div>

      <button onclick="publishGame()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30">
        <i class="fa-solid fa-cloud-arrow-up"></i> Publicar Jogo na Nuvem
      </button>
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
        return Swal.fire({ icon: 'warning', title: 'Campos Incompletos', text: 'Preencha todas as informações e o código HTML!', background: '#1e293b', color: '#fff' });
      }

      Swal.fire({
        title: 'Publicando...',
        text: 'Enviando jogo para a nuvem da PythonSL...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: '#1e293b', color: '#fff'
      });

      const res = await fetch('/api/postgame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ developer, pass, title, price, html_content })
      });

      const data = await res.json();
      if (!res.ok) {
        Swal.fire({ icon: 'error', title: 'Erro ao Publicar', text: data.error || 'Falha desconhecida', background: '#1e293b', color: '#fff' });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Publicado com Sucesso!',
          text: 'Seu jogo já está disponível na Store.',
          background: '#1e293b',
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
