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

    // --- ROTA: Home / Interface Web Principal (/) ---
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getHtmlPage(), {
        headers: { "Content-Type": "text/html;charset=UTF-8", ...cors }
      });
    }

    // --- ROTA: Registrar Canal (D1: @, Hash SHA-256, Avatar Base64 e Timestamp RFC 3306) ---
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

    // --- ROTA: Feed de Vídeos (KV Cache + D1 como fonte) ---
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

    // --- ROTA: Durable Objects (Likes e WebSocket do Vídeo) ---
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
// 3. FRONTEND INTEGRADO (Tailwind + FontAwesome + IndexedDB + Theme Switcher)
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
      theme: { extend: { colors: { darkbg: '#0f172a', cardbg: '#1e293b', lightbg: '#f8fafc', lightcard: '#ffffff', accent: '#3b82f6' } } }
    }
  </script>
</head>
<body class="bg-slate-100 dark:bg-darkbg text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-200">

  <!-- Navbar -->
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-darkbg/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center space-x-3 cursor-pointer" onclick="window.location.href='/'">
      <i class="fa-solid fa-broadcast-tower text-2xl text-blue-500"></i>
      <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Castly</span>
    </div>
    <div class="flex items-center space-x-3">
      <!-- Botão Dark/Light Mode -->
      <button onclick="toggleTheme()" id="theme-btn" class="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:opacity-80 transition text-sm">
        <i id="theme-icon" class="fa-solid fa-moon"></i>
      </button>

      <a href="/" class="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:opacity-80 transition text-sm font-medium">
        <i class="fa-solid fa-house"></i>
        <span>Home</span>
      </a>
      <button onclick="openModal()" class="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
        <i class="fa-solid fa-user-plus"></i>
        <span>Criar Canal</span>
      </button>
    </div>
  </header>

  <!-- Conteúdo Principal -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-2xl font-bold flex items-center space-x-3">
        <i class="fa-solid fa-fire text-orange-500"></i>
        <span>Feed em Alta (D1 + KV + DO)</span>
      </h1>
      <span class="text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700">
        IndexedDB Auto-Session Ativo
      </span>
    </div>

    <!-- Grid de Vídeos -->
    <div id="video-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-cardbg rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 col-span-full shadow">
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
        <button onclick="closeModal()" class="text-slate-400 hover:text-slate-900 dark:hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>
      <form id="channel-form" onsubmit="createChannel(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Identificador (@)</label>
          <input type="text" id="username" required placeholder="@daniellorenzo" class="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Senha</label>
          <input type="password" id="password" required placeholder="••••••••" class="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-xs text-slate-500 dark:text-slate-400 mb-1">Foto de Perfil (Base64)</label>
          <input type="file" id="avatar-file" accept="image/*" class="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500">
        </div>
        <button type="submit" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 transition rounded-xl font-semibold text-sm text-white shadow-lg shadow-blue-600/30">
          Registrar no D1
        </button>
      </form>
    </div>
  </div>

  <script>
    // ==========================================
    // 3.1. INDEXEDDB PARA SESSÃO E TEMA
    // ==========================================
    function openDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("CastlyDB", 1);
        request.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("session")) {
            db.createObjectStore("session", { keyPath: "id" });
          }
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
      });
    }

    async function saveSessionToIDB(username, password, theme) {
      const db = await openDB();
      const tx = db.transaction("session", "readwrite");
      const store = tx.objectStore("session");
      store.put({ id: "current_user", username, password, theme });
    }

    async function loadSessionFromIDB() {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction("session", "readonly");
        const store = tx.objectStore("session");
        const req = store.get("current_user");
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = () => resolve(null);
      });
    }

    // ==========================================
    // 3.2. GERENCIAMENTO DE TEMA (DARK / LIGHT)
    // ==========================================
    async function applyTheme(theme) {
      const html = document.documentElement;
      const icon = document.getElementById('theme-icon');
      
      if (theme === 'dark') {
        html.classList.add('dark');
        if (icon) icon.className = "fa-solid fa-sun text-yellow-400";
      } else {
        html.classList.remove('dark');
        if (icon) icon.className = "fa-solid fa-moon text-slate-700";
      }
    }

    async function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(currentTheme);
      
      const session = await loadSessionFromIDB() || {};
      await saveSessionToIDB(session.username || "", session.password || "", currentTheme);
    }

    // Inicializar Tema (Detecta automaticamente ou carrega do IndexedDB)
    async function initTheme() {
      const session = await loadSessionFromIDB();
      if (session && session.theme) {
        applyTheme(session.theme);
      } else {
        // Detecção automática baseada no sistema operacional
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
      }
    }

    // ==========================================
    // 3.3. FUNÇÕES GERAIS DA INTERFACE
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
          grid.innerHTML = \`<div class="bg-white dark:bg-cardbg rounded-2xl p-6 text-center text-slate-500 dark:text-slate-400 col-span-full shadow">Nenhum vídeo cadastrado ainda no Castly.</div>\`;
          return;
        }

        grid.innerHTML = videos.map(v => {
          const timeAgo = formatTimeAgo(v.posted_at);
          const avatar = v.avatar_base64 || 'https://via.placeholder.com/40';
          return \`
            <div class="bg-white dark:bg-cardbg rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xl group">
              <div class="aspect-video bg-slate-900 relative overflow-hidden flex items-center justify-center">
                <i class="fa-solid fa-play text-4xl text-slate-600 group-hover:text-blue-500 transition"></i>
              </div>
              <div class="p-4 flex space-x-3">
                <div class="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                  <img src="\${avatar}" alt="Avatar" class="w-full h-full object-cover">
                </div>
                <div>
                  <h3 class="font-semibold text-sm line-clamp-2">\${v.title}</h3>
                  <span class="text-xs text-slate-500 dark:text-slate-400 mt-1 block">\${v.username}</span>
                  <div class="text-xs text-slate-400 dark:text-slate-500 mt-1">
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
        // Salvar sessão e senha no IndexedDB para relogin automático
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        await saveSessionToIDB(username, password, currentTheme);

        alert("Canal criado e sessão salva no IndexedDB com sucesso!");
        closeModal();
      } else {
        alert(data.error || "Erro ao criar canal");
      }
    }

    // Inicialização ao carregar a página
    window.addEventListener('DOMContentLoaded', async () => {
      await initTheme();
      loadFeed();
      
      // Checar se há sessão salva no IndexedDB
      const session = await loadSessionFromIDB();
      if (session && session.username) {
        console.log("Sessão encontrada no IndexedDB para o usuário:", session.username);
      }
    });
  </script>
</body>
</html>`;
}
