export interface Env {
  ORANGE_SITES: KVNamespace;
  ORANGE_DB: D1Database;
}

// Helper para gerar hash SHA-256 em ambiente Edge
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Garante que a tabela do banco exista no D1
async function ensureDatabaseSchema(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    await ensureDatabaseSchema(env.ORANGE_DB);

    // --- 1. Rota Principal /: Painel com IndexedDB, Login, Cadastro e Listagem ---
    if (path === "" || path === "/") {
      const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Orange Cloud - Painel de Controle</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body class="bg-orange-50 text-gray-800 min-h-screen flex flex-col justify-between">
          
          <header class="bg-orange-600 text-white shadow-md py-4 px-6 flex justify-between items-center">
              <div class="flex items-center space-x-3">
                  <i class="fa-solid fa-cloud text-2xl"></i>
                  <span class="font-bold text-xl tracking-wide">Orange Cloud</span>
              </div>
              <div id="user-info" class="hidden items-center space-x-4">
                  <span class="text-sm font-medium"><i class="fa-solid fa-user-circle"></i> <span id="lbl-username"></span></span>
                  <button onclick="fazerLogout()" class="bg-orange-700 hover:bg-orange-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>
              </div>
          </header>

          <main class="flex flex-col items-center justify-center text-center px-4 my-auto">
              <div id="view-welcome" class="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-orange-100">
                  <div class="text-orange-500 mb-4">
                      <i class="fa-solid fa-server text-5xl"></i>
                  </div>
                  <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Bem-vindo à Orange Cloud</h1>
                  <p class="text-gray-600 mb-6">Plataforma brasileira de hospedagem serverless de alta performance.</p>
                  
                  <div class="flex gap-3">
                      <button onclick="abrirLogin()" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg flex items-center justify-center space-x-2">
                          <i class="fa-solid fa-right-to-bracket"></i>
                          <span>Login</span>
                      </button>
                      <button onclick="abrirSignup()" class="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl transition duration-200 shadow-lg flex items-center justify-center space-x-2">
                          <i class="fa-solid fa-user-plus"></i>
                          <span>Signup</span>
                      </button>
                  </div>
              </div>

              <div id="view-dashboard" class="hidden bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-orange-100 text-left">
                  <div class="flex justify-between items-center mb-6">
                      <h2 class="text-2xl font-bold text-gray-900"><i class="fa-solid fa-folder-open text-orange-500"></i> Seus Sites Hospedados</h2>
                      <button onclick="abrirCriarSite()" class="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2 px-4 rounded-xl transition shadow flex items-center space-x-2">
                          <i class="fa-solid fa-plus"></i>
                          <span>Novo Site</span>
                      </button>
                  </div>
                  <div id="sites-list" class="space-y-3 max-h-96 overflow-y-auto pr-2">
                      <!-- Lista injetada dinamicamente -->
                  </div>
              </div>
          </main>

          <footer class="text-center py-4 text-xs text-gray-500">
              &copy; 2026 Orange Cloud. Todos os direitos reservados.
          </footer>

          <script>
              // --- Configuração do IndexedDB para relogin automático ---
              const dbName = "OrangeCloudDB";
              const storeName = "session";

              function openIndexedDB() {
                  return new Promise((resolve, reject) => {
                      const request = indexedDB.open(dbName, 1);
                      request.onerror = () => reject(request.error);
                      request.onsuccess = () => resolve(request.result);
                      request.onupgradeneeded = (event) => {
                          const db = event.target.result;
                          if (!db.objectStoreNames.contains(storeName)) {
                              db.createObjectStore(storeName, { keyPath: "id" });
                          }
                      };
                  });
              }

              async function salvarSessaoIndexedDB(username, password) {
                  const db = await openIndexedDB();
                  return new Promise((resolve, reject) => {
                      const transaction = db.transaction(storeName, "readwrite");
                      const store = transaction.objectStore(storeName);
                      store.put({ id: "currentUser", username, password });
                      transaction.oncomplete = () => resolve(true);
                      transaction.onerror = () => reject(transaction.error);
                  });
              }

              async function carregarSessaoIndexedDB() {
                  try {
                      const db = await openIndexedDB();
                      return new Promise((resolve, reject) => {
                          const transaction = db.transaction(storeName, "readonly");
                          const store = transaction.objectStore(storeName);
                          const request = store.get("currentUser");
                          request.onsuccess = () => resolve(request.result);
                          request.onerror = () => reject(request.error);
                      });
                  } catch (e) {
                      return null;
                  }
              }

              async function limparSessaoIndexedDB() {
                  try {
                      const db = await openIndexedDB();
                      const transaction = db.transaction(storeName, "readwrite");
                      transaction.objectStore(storeName).delete("currentUser");
                  } catch (e) {}
              }

              // --- Estado Global ---
              let usuarioAtual = null;

              window.addEventListener('DOMContentLoaded', async () => {
                  const sessaoSalva = await carregarSessaoIndexedDB();
                  if (sessaoSalva && sessaoSalva.username && sessaoSalva.password) {
                      // Tenta relogar automaticamente usando as credenciais salvas no IndexedDB
                      const res = await fetch('/api/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ username: sessaoSalva.username, password: sessaoSalva.password })
                      });
                      if (res.ok) {
                          usuarioAtual = sessaoSalva;
                          mostrarDashboard();
                      } else {
                          await limparSessaoIndexedDB();
                      }
                  }
              });

              function mostrarDashboard() {
                  document.getElementById('view-welcome').classList.add('hidden');
                  document.getElementById('view-dashboard').classList.remove('hidden');
                  document.getElementById('user-info').classList.remove('hidden');
                  document.getElementById('user-info').classList.add('flex');
                  document.getElementById('lbl-username').innerText = usuarioAtual.username;
                  carregarSites();
              }

              function fazerLogout() {
                  limparSessaoIndexedDB();
                  usuarioAtual = null;
                  document.getElementById('view-dashboard').classList.add('hidden');
                  document.getElementById('view-welcome').classList.remove('hidden');
                  document.getElementById('user-info').classList.add('hidden');
                  Swal.fire('Logout', 'Sessão encerrada com sucesso.', 'info');
              }

              // --- Ações de Autenticação (Login e Signup) ---
              async function abrirLogin() {
                  const { value: formValues } = await Swal.fire({
                      title: '<span class="text-orange-600"><i class="fa-solid fa-right-to-bracket"></i> Login na Orange Cloud</span>',
                      html:
                          '<div class="flex flex-col space-y-3 text-left">' +
                              '<div><label class="text-xs font-semibold text-gray-600">Username</label>' +
                              '<input id="swal-user" class="swal2-input !m-0 !w-full text-sm rounded-lg" placeholder="Seu usuário"></div>' +
                              '<div><label class="text-xs font-semibold text-gray-600">Senha</label>' +
                              '<input id="swal-pass" type="password" class="swal2-input !m-0 !w-full text-sm rounded-lg" placeholder="Sua senha"></div>' +
                          '</div>',
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Entrar',
                      cancelButtonText: 'Cancelar',
                      confirmButtonColor: '#f97316',
                      preConfirm: () => ({
                          username: document.getElementById('swal-user').value,
                          password: document.getElementById('swal-pass').value
                      })
                  });

                  if (formValues && formValues.username && formValues.password) {
                      const res = await fetch('/api/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(formValues)
                      });
                      const data = await res.json();
                      if (res.ok) {
                          usuarioAtual = formValues;
                          await salvarSessaoIndexedDB(formValues.username, formValues.password);
                          mostrarDashboard();
                          Swal.fire('Sucesso!', 'Login efetuado com sucesso!', 'success');
                      } else {
                          Swal.fire('Erro', data.error, 'error');
                      }
                  }
              }

              async function abrirSignup() {
                  const { value: formValues } = await Swal.fire({
                      title: '<span class="text-orange-600"><i class="fa-solid fa-user-plus"></i> Cadastro (Signup)</span>',
                      html:
                          '<div class="flex flex-col space-y-3 text-left">' +
                              '<div><label class="text-xs font-semibold text-gray-600">Username</label>' +
                              '<input id="swal-user" class="swal2-input !m-0 !w-full text-sm rounded-lg" placeholder="Novo usuário"></div>' +
                              '<div><label class="text-xs font-semibold text-gray-600">Senha</label>' +
                              '<input id="swal-pass" type="password" class="swal2-input !m-0 !w-full text-sm rounded-lg" placeholder="Nova senha"></div>' +
                          '</div>',
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Cadastrar',
                      cancelButtonText: 'Cancelar',
                      confirmButtonColor: '#f97316',
                      preConfirm: () => ({
                          username: document.getElementById('swal-user').value,
                          password: document.getElementById('swal-pass').value
                      })
                  });

                  if (formValues && formValues.username && formValues.password) {
                      const res = await fetch('/api/signup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(formValues)
                      });
                      const data = await res.json();
                      if (res.ok) {
                          usuarioAtual = formValues;
                          await salvarSessaoIndexedDB(formValues.username, formValues.password);
                          mostrarDashboard();
                          Swal.fire('Sucesso!', 'Conta criada com sucesso!', 'success');
                      } else {
                          Swal.fire('Erro', data.error, 'error');
                      }
                  }
              }

              // --- Criar e Listar Sites ---
              async function abrirCriarSite() {
                  const { value: formValues } = await Swal.fire({
                      title: '<span class="text-orange-600"><i class="fa-solid fa-globe"></i> Criar Novo Site</span>',
                      html:
                          '<div class="flex flex-col space-y-3 text-left">' +
                              '<div><label class="text-xs font-semibold text-gray-600">Nome do Site (Rota)</label>' +
                              '<input id="swal-sitename" class="swal2-input !m-0 !w-full text-sm rounded-lg" placeholder="ex: meublog"></div>' +
                              '<div><label class="text-xs font-semibold text-gray-600">Código HTML</label>' +
                              '<textarea id="swal-code" class="swal2-textarea !m-0 !w-full text-sm rounded-lg" placeholder="<h1>Olá Mundo!</h1>"></textarea></div>' +
                          '</div>',
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Deploy Site',
                      cancelButtonText: 'Cancelar',
                      confirmButtonColor: '#f97316',
                      preConfirm: () => ({
                          siteName: document.getElementById('swal-sitename').value,
                          htmlCode: document.getElementById('swal-code').value
                      })
                  });

                  if (formValues && formValues.siteName && formValues.htmlCode) {
                      const res = await fetch('/api/deploy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              username: usuarioAtual.username,
                              password: usuarioAtual.password,
                              siteName: formValues.siteName,
                              htmlCode: formValues.htmlCode
                          })
                      });
                      const data = await res.json();
                      if (res.ok) {
                          Swal.fire('Sucesso!', data.message, 'success');
                          carregarSites();
                      } else {
                          Swal.fire('Erro', data.error, 'error');
                      }
                  }
              }

              async function carregarSites() {
                  const res = await fetch('/api/sites?username=' + encodeURIComponent(usuarioAtual.username));
                  const data = await res.json();
                  const container = document.getElementById('sites-list');
                  
                  if (!res.ok || data.sites.length === 0) {
                      container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhum site hospedado ainda.</p>';
                      return;
                  }

                  container.innerHTML = data.sites.map(site => \`
                      <div class="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <div>
                              <h4 class="font-bold text-gray-800"><i class="fa-solid fa-file-code text-orange-500"></i> /pages/\${site.name}</h4>
                              <p class="text-xs text-gray-400">Criado em: \${new Date(site.createdAt).toLocaleString()}</p>
                          </div>
                          <div class="flex space-x-2">
                              <a href="/pages/\${site.name}" target="_blank" class="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition flex items-center space-x-1">
                                  <i class="fa-solid fa-external-link-alt"></i> <span>Acessar</span>
                              </a>
                          </div>
                      </div>
                  \`).join('');
              }
          </script>
      </body>
      </html>`;
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // --- 2. API de Signup (/api/signup) ---
    if (path === "/api/signup" && request.method === "POST") {
      try {
        const { username, password } = await request.json() as any;
        if (!username || !password) return Response.json({ error: "Preencha todos os campos." }, { status: 400 });

        const passHash = await hashPassword(password);
        const userCheck = await env.ORANGE_DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (userCheck) return Response.json({ error: "Usuário já existe." }, { status: 400 });

        await env.ORANGE_DB.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").bind(username, passHash).run();
        return Response.json({ success: true });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- 3. API de Login (/api/login) ---
    if (path === "/api/login" && request.method === "POST") {
      try {
        const { username, password } = await request.json() as any;
        if (!username || !password) return Response.json({ error: "Preencha todos os campos." }, { status: 400 });

        const passHash = await hashPassword(password);
        const userCheck = await env.ORANGE_DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, passHash).first();
        
        if (!userCheck) return Response.json({ error: "Credenciais inválidas." }, { status: 401 });
        return Response.json({ success: true });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- 4. API de Deploy (/api/deploy) ---
    if (path === "/api/deploy" && request.method === "POST") {
      try {
        const { username, password, siteName, htmlCode } = await request.json() as any;
        if (!username || !password || !siteName || !htmlCode) {
          return Response.json({ error: "Preencha todos os campos." }, { status: 400 });
        }

        const passHash = await hashPassword(password);
        const userCheck = await env.ORANGE_DB.prepare("SELECT * FROM users WHERE username = ? AND password_hash = ?").bind(username, passHash).first();
        if (!userCheck) return Response.json({ error: "Autenticação falhou." }, { status: 401 });

        await env.ORANGE_SITES.put(`site:${siteName}`, htmlCode, {
          metadata: { owner: username, createdAt: new Date().toISOString() }
        });

        return Response.json({ success: true, message: `Site /pages/${siteName} publicado com sucesso!` });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- 5. API para Listar Sites do Usuário (/api/sites) ---
    if (path === "/api/sites" && request.method === "GET") {
      try {
        const username = url.searchParams.get("username");
        if (!username) return Response.json({ sites: [] });

        const list = await env.ORANGE_SITES.list({ prefix: "site:" });
        const sites = [];

        for (const key of list.keys) {
          if (key.metadata && (key.metadata as any).owner === username) {
            sites.push({
              name: key.name.replace("site:", ""),
              createdAt: (key.metadata as any).createdAt
            });
          }
        }

        return Response.json({ sites });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- 6. Servidor de Páginas HTML Hospedadas (/pages/:name) ---
    if (path.startsWith("/pages/")) {
      const siteName = path.replace("/pages/", "");
      const siteData = await env.ORANGE_SITES.getWithMetadata(`site:${siteName}`);

      if (!siteData.value) {
        return new Response("404 - Site não encontrado na Orange Cloud", { status: 404 });
      }

      const customHeaders = {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Powered-By": "Orange Cloud Engine",
        "X-Orange-Server": "Cloudflare Edge",
        "Cache-Control": "public, max-age=60"
      };

      return new Response(siteData.value, { headers: customHeaders });
    }

    return new Response("Endpoint não encontrado na Orange Cloud", { status: 404 });
  },
};
