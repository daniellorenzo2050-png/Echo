export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = new Set();
    this.sql = state.storage.sql;
    this.env = env;
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
        recipient TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        file_name TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "GET" && path === "/api/") {
      return new Response(JSON.stringify({ status: "Online" }), {
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

        let profilePic = user[0].profile_pic || "";
        if (this.env && this.env.EchoKV) {
          const cachedPic = await this.env.EchoKV.get(`profile_pic_${username}`);
          if (cachedPic) profilePic = cachedPic;
        }

        return new Response(JSON.stringify({ message: "Login bem-sucedido", username, profile_pic: profilePic }), { status: 200, headers: getSecurityHeaders({ "Content-Type": "application/json" }) });
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
        
        if (this.env && this.env.EchoKV) {
          await this.env.EchoKV.put(`profile_pic_${username}`, file_data);
        }

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

    websocket.addEventListener("message", async (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "auth") {
          websocket.username = data.username;
          const history = this.sql.exec(
            "SELECT id, sender, recipient, type, content, file_name, timestamp FROM messages WHERE sender = ? OR recipient = ? ORDER BY id ASC",
            data.username, data.username
          ).toArray();
          websocket.send(JSON.stringify({ type: "history", messages: history }));
          return;
        }

        if (data.type === "message" || data.type === "file" || data.type === "audio") {
          this.sql.exec(
            "INSERT INTO messages (sender, recipient, type, content, file_name) VALUES (?, ?, ?, ?, ?)",
            data.sender, data.recipient, data.type, data.content, data.file_name || ""
          );

          for (const session of this.sessions) {
            if (session.username === data.recipient || session.username === data.sender) {
              session.send(JSON.stringify({
                type: "message",
                sender: data.sender,
                recipient: data.recipient,
                msgType: data.type,
                content: data.content,
                file_name: data.file_name || "",
                timestamp: new Date().toISOString()
              }));
            }
          }

          if (data.recipient === "EchoAI" && data.msgType === "text") {
            let aiReplyText = "Olá! Como posso ajudar você hoje?";
            try {
              if (this.env && this.env.AI) {
                const aiResponse = await this.env.AI.run("@cf/zai-org/glm-2-7b", {
                  messages: [
                    { role: "system", content: "Você é um assistente virtual prestativo e amigável. Responda de forma concisa e direta." },
                    { role: "user", content: data.content }
                  ]
                });
                if (aiResponse && aiResponse.response) {
                  aiReplyText = aiResponse.response;
                }
              }
            } catch (aiErr) {
              aiReplyText = "Estou com uma instabilidade momentânea no momento. Sua mensagem foi: " + data.content;
            }

            this.sql.exec(
              "INSERT INTO messages (sender, recipient, type, content, file_name) VALUES (?, ?, ?, ?, ?)",
              "EchoAI", data.sender, "text", aiReplyText, ""
            );

            for (const session of this.sessions) {
              if (session.username === data.sender) {
                session.send(JSON.stringify({
                  type: "message",
                  sender: "EchoAI",
                  recipient: data.sender,
                  msgType: "text",
                  content: aiReplyText,
                  file_name: "",
                  timestamp: new Date().toISOString()
                }));
              }
            }
          }
        }

        if (data.type === "call-signal") {
          for (const session of this.sessions) {
            if (session.username === data.recipient) {
              session.send(JSON.stringify({
                type: "call-signal",
                sender: data.sender,
                signal: data.signal,
                callType: data.callType
              }));
            }
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
    "Permissions-Policy": "accelerometer=(), camera=(self), geolocation=(), microphone=(self), payment=(), usb=()",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Server": "Echo"
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
    <title>Echo - Messenger</title>
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

        body::before {
            content: "";
            position: absolute;
            top: 0; left: 0; width: 100%; height: 127px;
            background-color: var(--wa-bg-header);
            z-index: 0;
        }

        .auth-wrapper {
            position: relative; z-index: 1; width: 100%; height: 100%;
            display: flex; justify-content: center; align-items: center;
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

        .app-container {
            position: relative; z-index: 1; width: 100vw; height: 100vh; max-width: 1600px; max-height: calc(100vh - 38px);
            background: var(--wa-bg-sidebar); display: flex; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.6); border: 1px solid var(--wa-border);
        }

        @media (min-width: 1400px) { .app-container { border-radius: 6px; height: 95vh; } }

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
            flex: 1; padding: 20px 7%; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
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
        
        .call-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b141a; z-index: 200; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 40px; }
        .video-grid { display: flex; gap: 20px; width: 100%; height: 75%; justify-content: center; align-items: center; }
        .video-box { width: 45%; height: 100%; background: #202c33; border-radius: 12px; overflow: hidden; position: relative; display: flex; align-items: center; justify-content: center; }
        .video-box video { width: 100%; height: 100%; object-fit: cover; }

        .hidden { display: none !important; }
        .error-msg { color: #f87171; font-size: 0.82rem; text-align: center; }
    </style>
</head>
<body>
    <div id="auth-card" class="auth-wrapper">
        <div class="auth-container">
            <h2 id="form-title">Echo Messenger</h2>
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
                <div class="user-profile" id="open-profile-modal" title="Configurar Perfil">
                    <div class="avatar" id="my-avatar-container">
                        <span id="avatar-initial">U</span>
                    </div>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="icon-btn" id="open-contact-modal" title="Novo Contato">💬</button>
                </div>
            </div>
            <div id="contact-list" class="contact-list"></div>
        </aside>
        
        <main class="chat-area" id="main-chat-pane">
            <div class="chat-header">
                <div class="avatar" id="active-chat-avatar" style="background: var(--wa-accent);">?</div>
                <div style="flex:1;">
                    <b id="active-chat-name" style="font-size: 0.98rem; display:block;">Selecione um contato</b>
                    <p style="font-size: 0.73rem; color: var(--wa-text-secondary);">Online</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="icon-btn" id="audio-call-btn" title="Ligação de Áudio">📞</button>
                    <button class="icon-btn" id="video-call-btn" title="Ligação de Vídeo">📹</button>
                </div>
            </div>
            
            <div id="messages" class="messages-container"></div>
            
            <form id="chat-form" class="chat-input-area hidden">
                <input type="file" id="file-attachment-input" style="display: none;" />
                <button type="button" class="icon-btn" id="attach-file-btn" title="Enviar Arquivo">📎</button>
                <input type="text" id="message-input" placeholder="Digite uma mensagem" autocomplete="off" />
                <button type="button" class="icon-btn" id="record-audio-btn" title="Gravar Áudio">🎤</button>
                <button type="submit" class="icon-btn" style="color: var(--wa-accent);" title="Enviar">➤</button>
            </form>
        </main>
    </div>

    <div id="call-screen" class="call-screen hidden">
        <h2 id="call-status-text" style="color: #fff;">Chamada em andamento...</h2>
        <div class="video-grid">
            <div class="video-box"><video id="local-video" autoplay muted playsinline></video></div>
            <div class="video-box"><video id="remote-video" autoplay playsinline></video></div>
        </div>
        <button id="end-call-btn" style="padding: 12px 24px; background: #ef4444; color: #fff; border: none; border-radius: 30px; font-weight: bold; cursor: pointer;">Encerrar Chamada</button>
    </div>

    <div id="contact-modal" class="modal hidden">
        <div class="modal-content">
            <h3>Novo Contato</h3>
            <input type="text" id="new-contact-name" placeholder="Nome de usuário exato" />
            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="add-contact-confirm" style="flex: 1; padding: 10px; background: var(--wa-accent); border: none; border-radius: 4px; color: #fff; font-weight: 600; cursor: pointer;">Adicionar</button>
                <button id="close-contact-modal" style="flex: 1; padding: 10px; background: var(--wa-border); border: none; border-radius: 4px; color: #fff; cursor: pointer;">Cancelar</button>
            </div>
        </div>
    </div>

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
        let activeRecipient = "";
        let socket;
        let contacts = ["EchoAI"];
        let messagesStore = {};
        let pc;
        let localStream;
        const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

        const requestDB = indexedDB.open("EchoMessengerDB", 3);
        requestDB.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("messages")) db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
            if (!db.objectStoreNames.contains("auth")) db.createObjectStore("auth", { keyPath: "username" });
            if (!db.objectStoreNames.contains("contacts")) db.createObjectStore("contacts", { keyPath: "username" });
        };
        requestDB.onsuccess = (e) => {
            db = e.target.result;
            checkAutoLogin();
        };

        async function hashPassword(password) {
            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
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
            formTitle.textContent = isSignup ? "Echo Cadastro" : "Echo Messenger";
            authBtn.textContent = isSignup ? "Cadastrar" : "Entrar";
            switchBtn.innerHTML = isSignup ? "Já tem uma conta? <span>Entrar</span>" : "Não tem uma conta? <span>Cadastre-se</span>";
            authError.textContent = "";
        });

        authBtn.addEventListener("click", async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            if (!username || !password) { authError.textContent = "Preencha todos os campos."; return; }

            const password_hash = await hashPassword(password);
            try {
                const res = await fetch(isSignup ? "/api/signup" : "/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password_hash })
                });
                const data = await res.json();
                if (!res.ok) { authError.textContent = data.error || "Erro na autenticação."; return; }

                if (isSignup) {
                    alert("Cadastro realizado! Faça login.");
                    isSignup = false;
                    formTitle.textContent = "Echo Messenger";
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
            } catch (err) { authError.textContent = "Erro de conexão com o servidor."; }
        });

        function startApp() {
            authCard.classList.add("hidden");
            appContainer.classList.remove("hidden");
            updateAvatarUI();
            ensureEchoAiContact();
            loadContacts();
            initWebSocket();
        }

        function ensureEchoAiContact() {
            const tx = db.transaction("contacts", "readwrite");
            const store = tx.objectStore("contacts");
            store.get("EchoAI").onsuccess = (e) => {
                if (!e.target.result) {
                    store.put({ username: "EchoAI" });
                }
            };
        }

        function updateAvatarUI() {
            const containers = [document.getElementById("my-avatar-container"), document.getElementById("modal-avatar-preview")];
            containers.forEach(cont => {
                if (!cont) return;
                if (currentProfilePic) cont.innerHTML = '<img src="' + currentProfilePic + '" />';
                else cont.innerHTML = '<span>' + currentUser.charAt(0).toUpperCase() + '</span>';
            });
        }

        function initWebSocket() {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

            socket.addEventListener("open", () => {
                socket.send(JSON.stringify({ type: "auth", username: currentUser }));
            });

            socket.addEventListener("message", async (event) => {
                const data = JSON.parse(event.data);
                if (data.type === "history") {
                    messagesStore = {};
                    data.messages.forEach(msg => {
                        const peer = msg.sender === currentUser ? msg.recipient : msg.sender;
                        if (!messagesStore[peer]) messagesStore[peer] = [];
                        messagesStore[peer].push(msg);
                    });
                    if (activeRecipient) renderMessages(activeRecipient);
                } else if (data.type === "message") {
                    const peer = data.sender === currentUser ? data.recipient : data.sender;
                    if (!messagesStore[peer]) messagesStore[peer] = [];
                    messagesStore[peer].push(data);
                    if (activeRecipient === peer) renderMessages(activeRecipient);
                } else if (data.type === "call-signal") {
                    handleSignalingData(data);
                }
            });
        }

        function loadContacts() {
            const tx = db.transaction("contacts", "readonly");
            const req = tx.objectStore("contacts").getAll();
            req.onsuccess = () => {
                const list = req.result.map(c => c.username);
                if (!list.includes("EchoAI")) list.unshift("EchoAI");
                contacts = list;
                renderContactsList();
            };
        }

        function renderContactsList() {
            const list = document.getElementById("contact-list");
            list.innerHTML = "";
            contacts.forEach(contact => {
                const item = document.createElement("div");
                item.className = `contact-item ${activeRecipient === contact ? "active" : ""}`;
                const subtitle = contact === "EchoAI" ? "Assistente Virtual" : "Conversa";
                item.innerHTML = `<div class="avatar">${contact.charAt(0).toUpperCase()}</div><div style="flex:1;"><b>${contact}</b><p style="font-size:0.8rem; color:var(--wa-text-secondary);">${subtitle}</p></div>`;
                item.onclick = () => selectContact(contact);
                list.appendChild(item);
            });
        }

        function selectContact(contact) {
            activeRecipient = contact;
            document.getElementById("active-chat-name").textContent = contact;
            document.getElementById("active-chat-avatar").textContent = contact.charAt(0).toUpperCase();
            document.getElementById("chat-form").classList.remove("hidden");
            renderContactsList();
            renderMessages(contact);
        }

        function renderMessages(contact) {
            const container = document.getElementById("messages");
            container.innerHTML = "";
            const history = messagesStore[contact] || [];
            history.forEach(msg => appendMessageUI(msg.sender, msg.content, msg.msgType, msg.file_name, msg.sender === currentUser));
        }

        document.getElementById("chat-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("message-input");
            const text = input.value.trim();
            if (!text || !activeRecipient) return;

            const payload = { type: "message", sender: currentUser, recipient: activeRecipient, msgType: "text", content: text };
            socket.send(JSON.stringify(payload));
            if (!messagesStore[activeRecipient]) messagesStore[activeRecipient] = [];
            messagesStore[activeRecipient].push({ sender: currentUser, recipient: activeRecipient, msgType: "text", content: text });
            renderMessages(activeRecipient);
            input.value = "";
        });

        const fileInput = document.getElementById("file-attachment-input");
        document.getElementById("attach-file-btn").addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file || !activeRecipient) return;
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = () => {
                const payload = { type: "file", sender: currentUser, recipient: activeRecipient, msgType: "file", content: reader.result, file_name: file.name };
                socket.send(JSON.stringify(payload));
                if (!messagesStore[activeRecipient]) messagesStore[activeRecipient] = [];
                messagesStore[activeRecipient].push(payload);
                renderMessages(activeRecipient);
            };
        });

        const recordBtn = document.getElementById("record-audio-btn");
        let isRecording = false;
        let mediaRecorder;
        let audioChunks = [];

        recordBtn.addEventListener("click", async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = ev => audioChunks.push(ev.data);
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => {
                            const payload = { type: "audio", sender: currentUser, recipient: activeRecipient, msgType: "audio", content: reader.result };
                            socket.send(JSON.stringify(payload));
                            if (!messagesStore[activeRecipient]) messagesStore[activeRecipient] = [];
                            messagesStore[activeRecipient].push(payload);
                            renderMessages(activeRecipient);
                        };
                    };
                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.classList.add("recording");
                } catch(e) { alert("Microfone indisponível."); }
            } else {
                mediaRecorder.stop();
                isRecording = false;
                recordBtn.classList.remove("recording");
            }
        });

        function appendMessageUI(sender, content, msgType, fileName, isOutgoing) {
            const container = document.getElementById("messages");
            const div = document.createElement("div");
            div.className = `message ${isOutgoing ? "outgoing" : "incoming"}`;
            let inner = `<b style="color: #53bdeb; display: block; font-size: 0.75rem; margin-bottom: 2px;">${sender}</b>`;
            if (msgType === "text") inner += `<span>${content}</span>`;
            else if (msgType === "audio") inner += `<audio controls src="${content}" style="width: 220px; height: 35px;"></audio>`;
            else if (msgType === "file") inner += `<a href="${content}" download="${fileName || 'arquivo'}" style="color: #53bdeb; display: flex; align-items: center; gap: 6px; text-decoration: none;">📎 ${fileName || 'Baixar Arquivo'}</a>`;
            div.innerHTML = inner;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }

        document.getElementById("audio-call-btn").onclick = () => startCall(false);
        document.getElementById("video-call-btn").onclick = () => startCall(true);
        document.getElementById("end-call-btn").onclick = endCall;

        async function startCall(videoEnabled) {
            if (!activeRecipient || activeRecipient === "EchoAI") return alert("Chamadas não estão disponíveis com EchoAI.");
            document.getElementById("call-screen").classList.remove("hidden");
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
                document.getElementById("local-video").srcObject = localStream;
                createPeerConnection();
                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.send(JSON.stringify({ type: "call-signal", sender: currentUser, recipient: activeRecipient, callType: videoEnabled ? "video" : "audio", signal: { type: "offer", sdp: offer.sdp } }));
            } catch(e) { alert("Erro ao iniciar mídia para chamada."); endCall(); }
        }

        function createPeerConnection() {
            pc = new RTCPeerConnection(rtcConfig);
            pc.ontrack = e => { document.getElementById("remote-video").srcObject = e.streams[0]; };
            pc.onicecandidate = e => {
                if (e.candidate) socket.send(JSON.stringify({ type: "call-signal", sender: currentUser, recipient: activeRecipient, signal: { candidate: e.candidate } }));
            };
        }

        async function handleSignalingData(data) {
            const sig = data.signal;
            if (!pc) {
                document.getElementById("call-screen").classList.remove("hidden");
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: data.callType === "video" });
                document.getElementById("local-video").srcObject = localStream;
                createPeerConnection();
                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            }
            if (sig.type === "offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(sig));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.send(JSON.stringify({ type: "call-signal", sender: data.sender, recipient: currentUser, signal: { type: "answer", sdp: answer.sdp } }));
            } else if (sig.type === "answer") {
                await pc.setRemoteDescription(new RTCSessionDescription(sig));
            } else if (sig.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
            }
        }

        function endCall() {
            if (localStream) localStream.getTracks().forEach(t => t.stop());
            if (pc) pc.close();
            pc = null;
            document.getElementById("call-screen").classList.add("hidden");
        }

        const contactModal = document.getElementById("contact-modal");
        document.getElementById("open-contact-modal").onclick = () => contactModal.classList.remove("hidden");
        document.getElementById("close-contact-modal").onclick = () => contactModal.classList.add("hidden");
        document.getElementById("add-contact-confirm").onclick = () => {
            const name = document.getElementById("new-contact-name").value.trim();
            if (name && !contacts.includes(name)) {
                contacts.push(name);
                db.transaction("contacts", "readwrite").objectStore("contacts").put({ username: name });
                renderContactsList();
                contactModal.classList.add("hidden");
                document.getElementById("new-contact-name").value = "";
            }
        };

        const profileModal = document.getElementById("profile-modal");
        document.getElementById("open-profile-modal").onclick = () => profileModal.classList.remove("hidden");
        document.getElementById("close-profile-modal").onclick = () => profileModal.classList.add("hidden");
        const profileFileInput = document.getElementById("profile-file-input");
        document.getElementById("trigger-upload-btn").onclick = () => profileFileInput.click();
        
        let tempPic = "";
        profileFileInput.onchange = (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.readAsDataURL(f);
            r.onloadend = () => {
                tempPic = r.result;
                document.getElementById("modal-avatar-preview").innerHTML = '<img src="' + tempPic + '" />';
            };
        };

        document.getElementById("save-profile-confirm").onclick = async () => {
            if (tempPic) {
                await fetch("/api/profile-pic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: currentUser, uuid_filename: "avatar.jpg", file_data: tempPic })
                });
                currentProfilePic = tempPic;
                updateAvatarUI();
            }
            profileModal.classList.add("hidden");
        };
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
