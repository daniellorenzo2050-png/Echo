// ==========================================
// 1. DURABLE OBJECT: Gerenciador de Tempo Real (Likes & WebSockets)
// ==========================================
export class VideoRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Set();

    this.state.blockConcurrencyWhile(async () => {
      this.sql = this.state.storage.sql;
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER);
      `);
      const res = this.sql.exec("SELECT value FROM stats WHERE key = 'likes'").toArray();
      if (res.length === 0) {
        this.sql.exec("INSERT INTO stats (key, value) VALUES ('likes', 0)");
      }
    });
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade !== "websocket") return new Response("Esperando WebSocket", { status: 426 });
      
      const pair = new WebSocketPair();
      this.connectSession(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    if (url.pathname === "/like" && request.method === "POST") {
      this.sql.exec("UPDATE stats SET value = value + 1 WHERE key = 'likes'");
      const current = this.sql.exec("SELECT value FROM stats WHERE key = 'likes'").toArray()[0].value;
      
      this.broadcast({ type: "LIKE_UPDATE", likes: current });
      return new Response(JSON.stringify({ success: true, likes: current }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("DO Rota não encontrada", { status: 404 });
  }

  connectSession(ws) {
    ws.accept();
    this.sessions.add(ws);
    const current = this.sql.exec("SELECT value FROM stats WHERE key = 'likes'").toArray()[0].value;
    ws.send(JSON.stringify({ type: "INIT", likes: current }));
    ws.addEventListener("close", () => this.sessions.delete(ws));
  }

  broadcast(msg) {
    const str = JSON.stringify(msg);
    for (const ws of this.sessions) {
      try { ws.send(str); } catch (e) { this.sessions.delete(ws); }
    }
  }
}

// ==========================================
// 2. WORKER PRINCIPAL (API & Frontend Server)
// ==========================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getHtmlPage(), {
        headers: { "Content-Type": "text/html;charset=UTF-8", ...cors }
      });
    }

    if (url.pathname === "/api/register" && request.method === "POST") {
      try {
        const { username, password, avatar_base64 } = await request.json();
        
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const password_hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const created_at = new Date().toISOString();
        const id = crypto.randomUUID();

        await env.DB.prepare(
          `INSERT INTO users (id, username, password_hash, avatar_base64, created_at) VALUES (?, ?, ?, ?, ?)`
        ).bind(id, username, password_hash, avatar_base64 || "", created_at).run();

        return new Response(JSON.stringify({ success: true, message: "Canal criado com sucesso!", username, created_at }), {
          headers: { "Content-Type": "application/json", ...cors }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Erro ao registrar. O '@' pode já estar em uso." }), {
          status: 400, headers: { "Content-Type": "application/json", ...cors }
        });
      }
    }

    if (url.pathname === "/api/feed" && request.method === "GET") {
      const cacheKey = "castly_feed_cache";
      let cached = await env.CASTLY_KV.get(cacheKey);
      if (cached) {
        return new Response(cached, { headers: { "Content-Type": "application/json", "X-Cache": "HIT-KV", ...cors } });
      }

      const { results } = await env.DB.prepare(
        `SELECT v.id, v.title, v.video_url, v.posted_at, u.username, u.avatar_base64 
         FROM videos v JOIN users u ON v.user_id = u.id ORDER BY v.posted_at DESC LIMIT 20`
      ).all();

      const payload = JSON.stringify(results);
      await env.CASTLY_KV.put(cacheKey, payload, { expirationTtl: 30 });

      return new Response(payload, { headers: { "Content-Type": "application/json", "X-Cache": "MISS-D1", ...cors } });
    }

    if (url.pathname.startsWith("/api/video/")) {
      const match = url.pathname.match(/^\/api\/video\/([^\/]+)\/(.+)$/);
      if (!match) return new Response("Rota inválida", { status: 404 });

      const videoId = match[1];
      const action = match[2];

      const id = env.VIDEO_ROOM.idFromName(videoId);
      const stub = env.VIDEO_ROOM.get(id);

      const doUrl = new URL(request.url);
      doUrl.pathname = "/" + action;
      return stub.fetch(new Request(doUrl, request));
    }

    return new Response("Castly Edge API Not Found", { status: 404, headers: cors });
  }
};

// ==========================================
// 3. FRONTEND INTEGRADO (Tailwind + Font Awesome + IndexedDB + Fullscreen)
// ==========================================
function getHtmlPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Castly — Transmita o seu mundo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: { colors: { darkbg: '#0f172a', cardbg: '#1e293b', lightcard: '#ffffff', accent: '#3b82f6' } } }
    }
  </script>
</head>
<body class="bg-slate-50 dark:bg-darkbg text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-300">

  <!-- Navbar -->
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-darkbg/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center space-x-3 cursor-pointer" onclick="window.location.href='/'">
      <i class="fa-solid fa-broadcast-tower text-2xl text-blue-500"></i>
      <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Castly</span>
    </div>
    
    <div class="flex items-center space-x-3">
      <!-- Botão Dark / White Mode -->
      <button onclick="toggleTheme()" class="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-200 text-sm" title="Alternar Tema">
        <i id="theme-icon" class="fa-solid fa-moon"></i>
      </button>

      <!-- Botão Home -->
      <a href="/" class="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition text-sm font-medium">
        <i class="fa-solid fa-house"></i>
        <span class="hidden sm:inline">Home</span>
      </a>

      <!-- Perfil / Criar Canal -->
      <div id="user-profile-area">
        <button onclick="openModal()" class="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 transition text-sm font-semibold shadow-lg shadow-blue-500/20">
          <i class="fa-solid fa-user-plus"></i>
          <span>Criar Canal</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Conteúdo Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center space-x-3">
        <i class="fa-solid fa-fire text-orange-500"></i>
        <span>Feed em Alta</span>
      </h1>
      <span class="text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700">
        IndexedDB + Edge Active
      </span>
    </div>

    <!-- Grid de Vídeos com Tela Cheia -->
    <div id="video-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-cardbg rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 col-span-full shadow-md">
        Carregando vídeos do Castly...
      </div>
    </div>
  </main>

  <!-- Modal Criar Canal -->
  <div id="channel-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-cardbg border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold flex items-center space-x-2">
          <i class="fa-solid fa-circle-user text-blue-500"></i>
          <span>Criar seu Canal no Castly</span>
        </h2>
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 dark:hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form id="channel-form" onsubmit="createChannel(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Identificador (@)</label>
          <input type="text" id="username" required placeholder="@daniellorenzo" class="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Senha (Protegida por SHA-256)</label>
          <input type="password" id="password" required placeholder="••••••••" class="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-xs text-slate-600 dark:text-slate-400 mb-1">Foto de Perfil (Salva no IndexedDB e D1)</label>
          <input type="file" id="avatar-file" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500">
        </div>
        <button type="submit" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 transition rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/30 text-white">
          Registrar no D1 & Salvar Sessão
        </button>
      </form>
    </div>
  </div>

  <script>
    // ==========================================
    // 3.1. INDEXEDDB (Relogin Automático e Tema)
    // ==========================================
    const dbName = "CastlyDB";
    let db;

    function initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          db = request.result;
          resolve(db);
        };
        request.onupgradeneeded = (e) => {
          const database = e.target.result;
          if (!database.objectStoreNames.contains("session")) {
            database.createObjectStore("session", { keyPath: "key" });
          }
        };
      });
    }

    async function saveSessionToIDB(userData) {
      if (!db) await initIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("session", "readwrite");
        const store = tx.objectStore("session");
        store.put({ key: "current_user", ...userData });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }

    async function loadSessionFromIDB() {
      if (!db) await initIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction("session", "readonly");
        const store = tx.objectStore("session");
        const req = store.get("current_user");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    }

    async function saveThemeToIDB(mode) {
      if (!db) await initIndexedDB();
      const tx = db.transaction("session", "readwrite");
      tx.objectStore("session").put({ key: "theme_mode", mode });
    }

    // ==========================================
    // 3.2. GERENCIAMENTO DE TEMA (Dark / White Mode Automático)
    // ==========================================
    async function applyTheme(mode) {
      const html = document.documentElement;
      const icon = document.getElementById('theme-icon');
      if (mode === 'dark') {
        html.classList.add('dark');
        if(icon) icon.className = "fa-solid fa-sun";
      } else {
        html.classList.remove('dark');
        if(icon) icon.className = "fa-solid fa-moon";
      }
      await saveThemeToIDB(mode);
    }

    async function toggleTheme() {
      const isDark = document.documentElement.classList.contains('dark');
      applyTheme(isDark ? 'light' : 'dark');
    }

    async function setupAutoTheme() {
      await initIndexedDB();
      const savedTheme = await new Promise((res) => {
        const tx = db.transaction("session", "readonly");
        const req = tx.objectStore("session").get("theme_mode");
        req.onsuccess = () => res(req.result ? req.result.mode : null);
        req.onerror = () => res(null);
      });

      if (savedTheme) {
        applyTheme(savedTheme);
      } else {
        // Detectar automaticamente pelo sistema operacional
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }
    }

    // ==========================================
    // 3.3. TELA CHEIA (Fullscreen Player)
    // ==========================================
    function toggleFullscreen(containerId) {
      const container = document.getElementById(containerId);
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }

    // ==========================================
    // 3.4. FUNÇÕES DE UI E API
    // ==========================================
    function openModal() { document.getElementById('channel-modal').classList.remove('hidden'); document.getElementById('channel-modal').classList.add('flex'); }
    function closeModal() { document.getElementById('channel-modal').classList.add('hidden'); document.getElementById('channel-modal').classList.remove('flex'); }

    function formatTimeAgo(postedAtTimestamp) {
      const now = new Date();
      const postedDate = new Date(postedAtTimestamp);
      const diffInSeconds = Math.floor((now - postedDate) / 1000);
      if (diffInSeconds < 5) return 'agora mesmo';

      const minute = 60, hour = minute * 60, day = hour * 24, week = day * 7, year = day * 365;
      if (diffInSeconds < minute) return \`\${diffInSeconds} \${diffInSeconds === 1 ? 'segundo' : 'segundos'}\`;
      const minutes = Math.floor(diffInSeconds / minute);
      if (diffInSeconds < hour) return \`\${minutes} \${minutes === 1 ? 'minuto' : 'minutos'}\`;
      const hours = Math.floor(diffInSeconds / hour);
      if (diffInSeconds < day) return \`\${hours} \${hours === 1 ? 'hora' : 'horas'}\`;
      const days = Math.floor(diffInSeconds / day);
      if (diffInSeconds < week) return \`\${days} \${days === 1 ? 'dia' : 'dias'}\`;
      const weeks = Math.floor(diffInSeconds / week);
      if (diffInSeconds < year) return \`\${weeks} \${weeks === 1 ? 'semana' : 'semanas'}\`;
      const years = Math.floor(diffInSeconds / year);
      return \`\${years} \${years === 1 ? 'ano' : 'anos'}\`;
    }

    async function loadFeed() {
      try {
        const res = await fetch('/api/feed');
        const videos = await res.json();
        const grid = document.getElementById('video-grid');

        if (!videos || videos.length === 0) {
          grid.innerHTML = \`<div class="bg-white dark:bg-cardbg rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 col-span-full shadow-md">Nenhum vídeo cadastrado ainda no Castly.</div>\`;
          return;
        }

        grid.innerHTML = videos.map((v, index) => {
          const timeAgo = formatTimeAgo(v.posted_at);
          const avatar = v.avatar_base64 || 'https://via.placeholder.com/40';
          const containerId = \`video-box-\${index}\`;
          return \`
            <div class="bg-white dark:bg-cardbg rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 transition shadow-xl group flex flex-col">
              <div id="\${containerId}" class="aspect-video bg-black relative overflow-hidden flex items-center justify-center">
                <video src="\${v.video_url}" class="w-full h-full object-cover" controls></video>
                <button onclick="toggleFullscreen('\${containerId}')" class="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg text-xs backdrop-blur-sm transition" title="Tela Cheia">
                  <i class="fa-solid fa-expand"></i>
                </button>
              </div>
              <div class="p-4 flex space-x-3">
                <div class="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                  <img src="\${avatar}" alt="Avatar" class="w-full h-full object-cover">
                </div>
                <div>
                  <h3 class="font-semibold text-sm line-clamp-2">\${v.title}</h3>
                  <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 block">\${v.username}</span>
                  <div class="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center space-x-2">
                    <span>\${timeAgo}</span>
                  </div>
                </div>
              </div>
            </div>
          \`;
        }).join('');
      } catch(e) {
        console.error(e);
      }
    }

    async function createChannel(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const fileInput = document.getElementById('avatar-file');

      let avatar_base64 = "";
      if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        await new Promise(resolve => reader.onload = resolve);
        avatar_base64 = reader.result;
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, avatar_base64 })
      });

      const data = await res.json();
      if (data.success) {
        // Salvar dados no IndexedDB para relogin automático
        await saveSessionToIDB({ username, password, avatar_base64 });
        alert("Canal criado e sessão salva no IndexedDB com sucesso!");
        closeModal();
        checkAutoLogin();
      } else {
        alert(data.error || "Erro ao criar canal");
      }
    }

    async function checkAutoLogin() {
      const session = await loadSessionFromIDB();
      if (session && session.username) {
        const area = document.getElementById('user-profile-area');
        area.innerHTML = \`
          <div class="flex items-center space-x-2 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <div class="w-7 h-7 rounded-full overflow-hidden bg-slate-400">
              <img src="\${session.avatar_base64 || 'https://via.placeholder.com/30'}" class="w-full h-full object-cover">
            </div>
            <span class="text-xs font-semibold">\${session.username}</span>
          </div>
        \`;
      }
    }

    // Inicialização da Aplicação
    window.addEventListener('DOMContentLoaded', async () => {
      await setupAutoTheme();
      await initIndexedDB();
      await checkAutoLogin();
      loadFeed();
    });
  </script>
</body>
</html>`;
}
