export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Set();
    this.sql = state.storage.sql;
    this.initDatabase();
  }

  initDatabase() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        profile_pic TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "GET" && path === "/api/") {
      return new Response(JSON.stringify({ status: "Echo WhatsApp UI Edition Online" }), {
        headers: getSecurityHeaders({ "Content-Type": "application/json;charset=UTF-8" })
      });
    }

    if (method === "POST" && path === "/api/signup") {
      try {
        const { username, password_hash } = await request.json();
        if (!username || !password_hash) {
          return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
        }

        const existing = this.sql.exec("SELECT * FROM users WHERE username = ?", username).toArray();
        if (existing.length > 0) {
          return new Response(JSON.stringify({ error: "Usuário já existe" }), { status: 409, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
        }

        this.sql.exec("INSERT INTO users (username, password_hash, profile_pic) VALUES (?, ?, ?)", username, password_hash, "");
        return new Response(JSON.stringify({ message: "Cadastro realizado com sucesso!" }), { status: 201, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      }
    }

    if (method === "POST" && path === "/api/login") {
      try {
        const { username, password_hash } = await request.json();
        const user = this.sql.exec("SELECT * FROM users WHERE username = ? AND password_hash = ?", username, password_hash).toArray();

        if (user.length === 0) {
          return new Response(JSON.stringify({ error: "Credenciais inválidas" }), { status: 401, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
        }

        return new Response(JSON.stringify({ message: "Login bem-sucedido", username, profile_pic: user[0].profile_pic || "" }), { status: 200, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      }
    }

    if (method === "POST" && path === "/api/profile-pic") {
      try {
        const { username, uuid_filename, file_data } = await request.json();
        if (!username || !file_data) {
          return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
        }

        this.sql.exec("UPDATE users SET profile_pic = ? WHERE username = ?", file_data, username);
        return new Response(JSON.stringify({ message: "Foto atualizada", uuid_filename, profile_pic: file_data }), { status: 200, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro ao salvar foto" }), { status: 500, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
      }
    }

    if (path === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client, headers: getSecurityHeaders() });
    }

    return new Response("Not Found", { status: 404, headers: getSecurityHeaders() });
  }

  handleSession(websocket) {
    websocket.accept();
    this.sessions.add(websocket);

    const history = this.sql.exec("SELECT id, sender, type, content, timestamp FROM messages ORDER BY id ASC").toArray();
    websocket.send(JSON.stringify({ type: "history", messages: history }));

    websocket.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.sender && data.content && data.msgType) {
          this.sql.exec("INSERT INTO messages (sender, type, content) VALUES (?, ?, ?)", data.sender, data.msgType, data.content);

          for (const session of this.sessions) {
            session.send(JSON.stringify({
              type: "message",
              sender: data.sender,
              msgType: data.msgType,
              content: data.content,
              timestamp: new Date().toISOString()
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao processar mensagem", err);
      }
    });

    websocket.addEventListener("close", () => {
      this.sessions.delete(websocket);
    });
  }
}

function getSecurityHeaders(additionalHeaders = {}) {
  const securityHeaders = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Forwarded-Proto": "https",
    "Expect-CT": "max-age=86400, enforce",
    "Origin-Agent-Cluster": "?1",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; img-src 'self' data:; media-src 'self' data: blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
    "X-Content-Type-Options": "nosniff",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "no-referrer",
    "X-Download-Options": "noopen",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
    "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), microphone=(self), payment=(), usb=()",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Server": "Echo-Secure-Edge"
  };
  return { ...securityHeaders, ...additionalHeaders };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/") || url.pathname === "/ws") {
      const id = env.CHAT_ROOM.idFromName("global-chat-room");
      const stub = env.CHAT_ROOM.get(id);
      return stub.fetch(request);
    }

    if (request.method === "GET" && url.pathname === "/") {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Echo - WhatsApp Web</title>
    <style>
        :root {
            --wa-bg-header: #00a884;
            --wa-bg-main: #111b21;
            --wa-bg-sidebar: #111b21;
            --wa-bg-panel: #202c33;
            --wa-bg-chat: #0b141a;
            --wa-accent: #00a884;
            --wa-accent-hover: #008f6f;
            --wa-text-primary: #e9edef;
            --wa-text-secondary: #8696a0;
            --wa-outgoing: #005c4b;
            --wa-incoming: #202c33;
            --wa-border: #222d34;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif; }
        body { background-color: #0c1317; height: 100vh; width: 100vw; display: flex; justify-content: center; align-items: center; overflow: hidden; color: var(--wa-text-primary); }

        /* Fita superior verde estilo WhatsApp Web em telas grandes */
        body::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 127px;
            background-color: var(--wa-bg-header);
            z-index: 0;
        }

        .auth-wrapper {
            position: relative;
            z-index: 1;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background: rgba(11, 20, 26, 0.94);
        }
        .auth-container { width: 100%; max-width: 400px; background: var(--wa-bg-panel); padding: 36px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; flex-direction: column; gap: 18px; border: 1px solid var(--wa-border); margin: 20px; }
        .auth-container h2 { color: var(--wa-accent); text-align: center; font-size: 1.6rem; }
        .auth-container input { padding: 12px 14px; border-radius: 4px; border: 1px solid var(--wa-border); background: var(--wa-bg-chat); color: var(--wa-text-primary); outline: none; font-size: 0.95rem; }
        .auth-container input:focus { border-color: var(--wa-accent); }
        .auth-container button { padding: 12px; background: var(--wa-accent); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s; }
        .auth-container button:hover { background: var(--wa-accent-hover); }
        .switch-auth { text-align: center; font-size: 0.88rem; color: var(--wa-text-secondary); cursor: pointer; }
        .switch-auth span { color: var(--wa-accent); text-decoration: underline; }

        /* App Adaptativo preenchendo a tela inteira */
        .app-container {
            position: relative;
            z-index: 1;
            width: 100vw;
            height: 100vh;
            max-width: 1600px;
            max-height: calc(100vh - 38px);
            background: var(--wa-bg-sidebar);
            display: flex;
            overflow: hidden;
            box-shadow: 0 6px 18px rgba(0,0,0,0.6);
            border: 1px solid var(--wa-border);
        }

        @media (min-width: 1400px) {
            .app-container {
                border-radius: 6px;
                height: 95vh;
            }
        }

        .sidebar { width: 30%; min-width: 320px; max-width: 420px; background: var(--wa-bg-sidebar); border-right: 1px solid var(--wa-border); display: flex; flex-direction: column; height: 100%; }
        .sidebar-header { padding: 10px 16px; background: var(--wa-bg-panel); display: flex; justify-content: space-between; align-items: center; height: 60px; border-bottom: 1px solid var(--wa-border); }
        .user-profile { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        
        .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: #374248; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; overflow: hidden; flex-shrink: 0; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        
        .contact-list { flex: 1; overflow-y: auto; background: var(--wa-bg-sidebar); }
        .contact-item { padding: 0 16px; height: 72px; display: flex; align-items: center; gap: 14px; cursor: pointer; border-bottom: 1px solid rgba(34, 45, 52, 0.5); transition: background 0.15s; }
        .contact-item:hover, .contact-item.active { background: var(--wa-bg-panel); }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: var(--wa-bg-chat); height: 100%; min-width: 0; }
        .chat-header { padding: 10px 16px; background: var(--wa-bg-panel); display: flex; align-items: center; gap: 14px; height: 60px; border-bottom: 1px solid var(--wa-border); }
        
        .messages-container {
            flex: 1;
            padding: 20px 7%;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
            background-color: #0b141a;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231f2c34' fill-opacity='0.15' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E");
        }
        
        .message { max-width: 65%; padding: 6px 10px 8px 12px; border-radius: 7.5px; font-size: 0.91rem; position: relative; word-break: break-word; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); margin-bottom: 2px; }
        .message.outgoing { background: var(--wa-outgoing); align-self: flex-end; border-top-right-radius: 0; }
        .message.incoming { background: var(--wa-incoming); align-self: flex-start; border-top-left-radius: 0; }
        
        .chat-input-area { padding: 10px 16px; background: var(--wa-bg-panel); display: flex; gap: 10px; align-items: center; height: 62px; border-top: 1px solid var(--wa-border); }
        .chat-input-area input { flex: 1; padding: 10px 14px; border-radius: 8px; border: none; background: var(--wa-bg-chat); color: var(--wa-text-primary); outline: none; font-size: 0.95rem; }
        
        .icon-btn { background: transparent; border: none; color: var(--wa-text-secondary); cursor: pointer; font-size: 1.25rem; padding: 8px; border-radius: 50%; transition: background 0.15s; display: flex; align-items: center; justify-content: center; }
        .icon-btn:hover { background: rgba(255,255,255,0.05); color: var(--wa-text-primary); }
        .icon-btn.recording { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(2px); }
        .modal-content { background: var(--wa-bg-panel); padding: 26px; border-radius: 8px; width: 360px; display: flex; flex-direction: column; gap: 16px; border: 1px solid var(--wa-border); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .modal-content h3 { color: var(--wa-accent); font-size: 1.2rem; }
        
        .hidden { display: none !important; }
        .error-msg { color: #f87171; font-size: 0.82rem; text-align: center; }
    </style>
</head>
<body>
    <div id="auth-card" class="auth-wrapper">
        <div class="auth-container">
            <h2 id="form-title">Echo WhatsApp</h2>
            <input type="text" id="username" placeholder="Nome de usuário" required />
            <input type="password" id="password" placeholder="Senha" required />
            <button id="auth-btn">Entrar</button>
            <div class="switch-auth" id="switch-btn">Não tem uma conta? <span>Cadastre-se</span></div>
            <p id="auth-error" class="error-msg"></p>
        </div>
    </div>

    <div id="app-container" class="app-container hidden">
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="user-profile" id="open-profile-modal" title="Configurar Perfil e Foto">
                    <div class="avatar" id="my-avatar-container">
                        <span id="avatar-initial">U</span>
                    </div>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="icon-btn" id="open-contact-modal" title="Adicionar Contato">💬</button>
                    <button class="icon-btn" title="Menu">⋮</button>
                </div>
            </div>
            <div id="contact-list" class="contact-list">
                <div class="contact-item active">
                    <div class="avatar" style="background: var(--wa-accent);">🌐</div>
                    <div style="flex:1; overflow:hidden;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <b style="font-size: 0.98rem;">Geral</b>
                            <span style="font-size:0.7rem; color:var(--wa-text-secondary)">Online</span>
                        </div>
                        <p style="font-size: 0.8rem; color: var(--wa-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Chat público global seguro</p>
                    </div>
                </div>
            </div>
        </aside>
        
        <main class="chat-area">
            <div class="chat-header">
                <div class="avatar" style="background: var(--wa-accent);">🌐</div>
                <div style="flex:1;">
                    <b style="font-size: 0.98rem; display:block;">Conversa Global</b>
                    <p style="font-size: 0.73rem; color: var(--wa-text-secondary);">toque aqui para info do grupo</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="icon-btn" title="Pesquisar">🔍</button>
                    <button class="icon-btn" title="Anexo">📎</button>
                </div>
            </div>
            
            <div id="messages" class="messages-container"></div>
            
            <form id="chat-form" class="chat-input-area">
                <button type="button" class="icon-btn" title="Emoji">😊</button>
                <input type="text" id="message-input" placeholder="Digite uma mensagem" autocomplete="off" />
                <button type="button" class="icon-btn" id="record-audio-btn" title="Gravar Áudio">🎤</button>
                <button type="submit" class="icon-btn" style="color: var(--wa-accent);" title="Enviar">➤</button>
            </form>
        </main>
    </div>

    <!-- Modal Adicionar Contato -->
    <div id="contact-modal" class="modal hidden">
        <div class="modal-content">
            <h3>Nova Conversa</h3>
            <input type="text" id="new-contact-name" placeholder="Nome de usuário" />
            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="add-contact-confirm" style="flex: 1; padding: 10px; background: var(--wa-accent); border: none; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer;">Iniciar</button>
                <button id="close-contact-modal" style="flex: 1; padding: 10px; background: var(--wa-border); border: none; border-radius: 4px; color: #fff; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    </div>

    <!-- Modal Perfil / Upload Foto -->
    <div id="profile-modal" class="modal hidden">
        <div class="modal-content">
            <h3>Perfil do Usuário</h3>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div class="avatar" id="modal-avatar-preview" style="width: 90px; height: 90px; font-size: 2rem;">U</div>
                <input type="file" id="profile-file-input" accept="image/*" style="display: none;" />
                <button type="button" id="trigger-upload-btn" style="padding: 10px 16px; background: var(--wa-bg-chat); border: 1px solid var(--wa-border); border-radius: 4px; color: #fff; cursor: pointer; width: 100%; font-weight: 500;">Upload Foto de perfil</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="save-profile-confirm" style="flex: 1; padding: 10px; background: var(--wa-accent); border: none; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer;">Salvar</button>
                <button id="close-profile-modal" style="flex: 1; padding: 10px; background: var(--wa-border); border: none; border-radius: 4px; color: #fff; cursor: pointer;">Fechar</button>
            </div>
        </div>
    </div>

    <script>
        let db;
        let currentUser = "";
        let currentProfilePic = "";
        let socket;
        let mediaRecorder;
        let audioChunks = [];

        function generateUUIDv7() {
            const timeMs = Date.now();
            const timeHex = timeMs.toString(16).padStart(12, '0');
            const randA = Math.floor(Math.random() * 0xfff).toString(16).padStart(3, '0');
            const randB = Math.floor(Math.random() * 0x3fffffffffffffff).toString(16).padStart(16, '0');
            return \`\${timeHex.substring(0,8)}-\${timeHex.substring(8,12)}-7\${randA}-\${randB.substring(0,4)}-\${randB.substring(4,16)}\`;
        }

        const requestDB = indexedDB.open("EchoWhatsAppDB", 1);
        requestDB.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
            if (!db.objectStoreNames.contains("auth")) db.createObjectStore("auth", { keyPath: "username" });
        };
        requestDB.onsuccess = (e) => {
            db = e.target.result;
            checkAutoLogin();
        };

        async function hashPassword(password) {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        function checkAutoLogin() {
            const tx = db.transaction("auth", "readonly");
            const req = tx.objectStore("auth").getAll();
            req.onsuccess = () => {
                if (req.result.length > 0) {
                    currentUser = req.result[0].username;
                    currentProfilePic = req.result[0].profile_pic || "";
                    startApp();
                }
            };
        }

        let isSignup = false;
        const authCard = document.getElementById("auth-card");
        const appContainer = document.getElementById("app-container");
        const formTitle = document.getElementById("form-title");
        const authBtn = document.getElementById("auth-btn");
        const switchBtn = document.getElementById("switch-btn");
        const authError = document.getElementById("auth-error");
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");

        switchBtn.addEventListener("click", () => {
            isSignup = !isSignup;
            formTitle.textContent = isSignup ? "Echo Cadastro" : "Echo WhatsApp";
            authBtn.textContent = isSignup ? "Cadastrar" : "Entrar";
            switchBtn.innerHTML = isSignup ? "Já tem uma conta? <span>Entrar</span>" : "Não tem uma conta? <span>Cadastre-se</span>";
            authError.textContent = "";
        });

        authBtn.addEventListener("click", async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            if (!username || !password) {
                authError.textContent = "Preencha todos os campos.";
                return;
            }

            const password_hash = await hashPassword(password);
            const endpoint = isSignup ? "/api/signup" : "/api/login";

            try {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password_hash })
                });
                const data = await res.json();
                if (!res.ok) {
                    authError.textContent = data.error || "Erro na autenticação.";
                    return;
                }

                if (isSignup) {
                    alert("Cadastro realizado! Faça login.");
                    isSignup = false;
                    formTitle.textContent = "Echo WhatsApp";
                    authBtn.textContent = "Entrar";
                    switchBtn.innerHTML = "Não tem uma conta? <span>Cadastre-se</span>";
                    authError.textContent = "";
                } else {
                    currentUser = username;
                    currentProfilePic = data.profile_pic || "";
                    const tx = db.transaction("auth", "readwrite");
                    tx.objectStore("auth").put({ username, password_hash, profile_pic: currentProfilePic });
                    startApp();
                }
            } catch (err) {
                authError.textContent = "Erro de conexão com o servidor.";
            }
        });

        function startApp() {
            authCard.classList.add("hidden");
            appContainer.classList.remove("hidden");
            updateAvatarUI();
            loadOfflineMessages();
            initWebSocket();
        }

        function updateAvatarUI() {
            const containers = [document.getElementById("my-avatar-container"), document.getElementById("modal-avatar-preview")];
            containers.forEach(cont => {
                if (!cont) return;
                if (currentProfilePic) {
                    cont.innerHTML = \`<img src="\${currentProfilePic}" alt="Avatar" />\`;
                } else {
                    cont.innerHTML = \`<span>\${currentUser.charAt(0).toUpperCase()}</span>\`;
                }
            });
        }

        function loadOfflineMessages() {
            const tx = db.transaction("messages", "readonly");
            const req = tx.objectStore("messages").getAll();
            req.onsuccess = () => {
                const messagesContainer = document.getElementById("messages");
                messagesContainer.innerHTML = "";
                req.result.forEach(msg => appendMessageUI(msg.sender, msg.content, msg.msgType, msg.sender === currentUser));
            };
        }

        function saveMessageToIndexedDB(sender, content, msgType) {
            const tx = db.transaction("messages", "readwrite");
            tx.objectStore("messages").add({ sender, content, msgType, timestamp: new Date() });
        }

        function initWebSocket() {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(\`\${protocol}//\${window.location.host}/ws\`);

            socket.addEventListener("message", (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "history") {
                    const tx = db.transaction("messages", "readwrite");
                    const store = tx.objectStore("messages");
                    store.clear();
                    data.messages.forEach(msg => {
                        store.add({ sender: msg.sender, content: msg.content, msgType: msg.type });
                    });
                    loadOfflineMessages();
                } else if (data.type === "message") {
                    saveMessageToIndexedDB(data.sender, data.content, data.msgType);
                    appendMessageUI(data.sender, data.content, data.msgType, data.sender === currentUser);
                }
            });
        }

        document.getElementById("chat-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("message-input");
            const text = input.value.trim();
            if (!text) return;

            socket.send(JSON.stringify({ sender: currentUser, msgType: "text", content: text }));
            input.value = "";
        });

        const recordBtn = document.getElementById("record-audio-btn");
        let isRecording = false;

        recordBtn.addEventListener("click", async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = event => audioChunks.push(event.data);
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            socket.send(JSON.stringify({ sender: currentUser, msgType: "audio", content: reader.result }));
                        };
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.classList.add("recording");
                } catch (err) {
                    alert("Acesso ao microfone negado ou indisponível.");
                }
            } else {
                mediaRecorder.stop();
                isRecording = false;
                recordBtn.classList.remove("recording");
            }
        });

        function appendMessageUI(sender, content, msgType, isOutgoing) {
            const messagesContainer = document.getElementById("messages");
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message", isOutgoing ? "outgoing" : "incoming");

            let innerHTML = \`<b style="color: #53bdeb; display: block; font-size: 0.75rem; margin-bottom: 2px;">\${sender}</b>\`;
            if (msgType === "text") {
                innerHTML += \`<span>\${content}</span>\`;
            } else if (msgType === "audio") {
                innerHTML += \`<audio controls src="\${content}" style="width: 220px; height: 35px; margin-top: 4px;"></audio>\`;
            }

            messageDiv.innerHTML = innerHTML;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        const contactModal = document.getElementById("contact-modal");
        document.getElementById("open-contact-modal").addEventListener("click", () => contactModal.classList.remove("hidden"));
        document.getElementById("close-contact-modal").addEventListener("click", () => contactModal.classList.add("hidden"));
        document.getElementById("add-contact-confirm").addEventListener("click", () => {
            const contactName = document.getElementById("new-contact-name").value.trim();
            if (contactName) {
                const list = document.getElementById("contact-list");
                const item = document.createElement("div");
                item.className = "contact-item";
                item.innerHTML = \`<div class="avatar" style="background:#374248">\${contactName.charAt(0).toUpperCase()}</div><div style="flex:1;"><b style="font-size:0.98rem;">\${contactName}</b><p style="font-size: 0.8rem; color: var(--wa-text-secondary);">Conversa privada</p></div>\`;
                list.appendChild(item);
                document.getElementById("new-contact-name").value = "";
                contactModal.classList.add("hidden");
            }
        });

        const profileModal = document.getElementById("profile-modal");
        document.getElementById("open-profile-modal").addEventListener("click", () => profileModal.classList.remove("hidden"));
        document.getElementById("close-profile-modal").addEventListener("click", () => profileModal.classList.add("hidden"));
        
        const fileInput = document.getElementById("profile-file-input");
        document.getElementById("trigger-upload-btn").addEventListener("click", () => fileInput.click());

        let tempBase64Image = "";
        let uuidFilename = "";

        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uuidFilename = generateUUIDv7() + ".jpg";
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                tempBase64Image = reader.result;
                document.getElementById("modal-avatar-preview").innerHTML = \`<img src="\${tempBase64Image}" />\`;
            };
        });

        document.getElementById("save-profile-confirm").addEventListener("click", async () => {
            if (!tempBase64Image) {
                profileModal.classList.add("hidden");
                return;
            }

            try {
                const res = await fetch("/api/profile-pic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: currentUser,
                        uuid_filename: uuidFilename,
                        file_data: tempBase64Image
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    currentProfilePic = data.profile_pic;
                    updateAvatarUI();
                    
                    const tx = db.transaction("auth", "readwrite");
                    const store = tx.objectStore("auth");
                    store.get(currentUser).onsuccess = (e) => {
                        const record = e.target.result;
                        if (record) {
                            record.profile_pic = currentProfilePic;
                            store.put(record);
                        }
                    };
                }
            } catch (err) {
                console.error("Erro ao enviar imagem", err);
            }

            profileModal.classList.add("hidden");
        });
    </script>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: getSecurityHeaders({ "Content-Type": "text/html;charset=UTF-8" }),
      });
    }

    return new Response("Not Found", { status: 404, headers: getSecurityHeaders() });
  }
};
