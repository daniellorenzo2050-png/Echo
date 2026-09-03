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
        password_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender TEXT NOT NULL,
        recipient TEXT,
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
      return new Response(JSON.stringify({ status: "Echo API online", storage: "Durable Objects SQLite + IndexedDB Sync" }), {
        headers: { "Content-Type": "application/json;charset=UTF-8" }
      });
    }

    if (method === "POST" && path === "/api/signup") {
      try {
        const { username, password_hash } = await request.json();
        if (!username || !password_hash) {
          return new Response(JSON.stringify({ error: "Dados incompletos" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const existing = this.sql.exec("SELECT * FROM users WHERE username = ?", username).toArray();
        if (existing.length > 0) {
          return new Response(JSON.stringify({ error: "Usuário já existe" }), { status: 409, headers: { "Content-Type": "application/json" } });
        }

        this.sql.exec("INSERT INTO users (username, password_hash) VALUES (?, ?)", username, password_hash);
        return new Response(JSON.stringify({ message: "Cadastro realizado com sucesso!" }), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (method === "POST" && path === "/api/login") {
      try {
        const { username, password_hash } = await request.json();
        const user = this.sql.exec("SELECT * FROM users WHERE username = ? AND password_hash = ?", username, password_hash).toArray();

        if (user.length === 0) {
          return new Response(JSON.stringify({ error: "Credenciais inválidas" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({ message: "Login bem-sucedido", username }), { status: 200, headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (path === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not Found", { status: 404 });
  }

  handleSession(websocket) {
    websocket.accept();
    this.sessions.add(websocket);

    // Envia o histórico completo salvo no DO para sincronizar com o IndexedDB do cliente
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Echo - WhatsApp Style</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background-color: #0f172a; height: 100vh; display: flex; justify-content: center; align-items: center; color: #f8fafc; }
        .auth-card { width: 400px; background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 15px; }
        h2 { color: #38bdf8; text-align: center; }
        input { padding: 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; outline: none; }
        input:focus { border-color: #0284c7; }
        button { padding: 12px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        button:hover { background: #0369a1; }
        .switch-auth { text-align: center; font-size: 0.85rem; color: #94a3b8; cursor: pointer; }
        .switch-auth span { color: #38bdf8; text-decoration: underline; }
        .hidden { display: none !important; }
        
        .app-container { width: 1000px; height: 85vh; background: #1e293b; border-radius: 12px; display: flex; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        .sidebar { width: 320px; background: #0f172a; border-right: 1px solid #334155; display: flex; flex-direction: column; }
        .sidebar-header { padding: 15px 20px; background: #1e293b; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
        .contact-list { flex: 1; overflow-y: auto; }
        .contact-item { padding: 15px 20px; cursor: pointer; border-bottom: 1px solid #1e293b; background: #1e293b; }
        .contact-item:hover, .contact-item.active { background: #334155; }
        
        .chat-area { flex: 1; display: flex; flex-direction: column; background: #0b132b; }
        .chat-header { padding: 15px 20px; background: #1e293b; border-bottom: 1px solid #334155; font-weight: bold; }
        .messages-container { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .message { max-width: 65%; padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; background: #1e293b; }
        .message.outgoing { background: #0284c7; align-self: flex-end; }
        .message.incoming { align-self: flex-start; }
        
        .chat-input-area { padding: 15px; background: #1e293b; display: flex; gap: 10px; align-items: center; border-top: 1px solid #334155; }
        .chat-input-area input { flex: 1; }
        
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; }
        .modal-content { background: #1e293b; padding: 25px; border-radius: 10px; width: 350px; display: flex; flex-direction: column; gap: 15px; }
    </style>
</head>
<body>
    <!-- Tela de Autenticação -->
    <div id="auth-card" class="auth-card">
        <h2 id="form-title">Echo - Entrar</h2>
        <input type="text" id="username" placeholder="Nome de usuário" required />
        <input type="password" id="password" placeholder="Senha" required />
        <button id="auth-btn">Entrar</button>
        <div class="switch-auth" id="switch-btn">Não tem uma conta? <span>Cadastre-se</span></div>
        <p id="auth-error" style="color: #f87171; font-size: 0.8rem; text-align: center;"></p>
    </div>

    <!-- Interface Principal do App -->
    <div id="app-container" class="app-container hidden">
        <aside class="sidebar">
            <div class="sidebar-header">
                <span id="logged-user" style="font-weight: bold; color: #38bdf8;"></span>
                <button id="open-contact-modal" style="padding: 6px 12px; font-size: 0.8rem;">+ Contato</button>
            </div>
            <div id="contact-list" class="contact-list">
                <div class="contact-item active">
                    <b>Geral</b>
                    <p style="font-size: 0.75rem; color: #94a3b8;">Chat público da comunidade</p>
                </div>
            </div>
        </aside>
        
        <main class="chat-area">
            <div class="chat-header">Conversa Global</div>
            <div id="messages" class="messages-container"></div>
            
            <form id="chat-form" class="chat-input-area">
                <input type="text" id="message-input" placeholder="Digite sua mensagem..." autocomplete="off" />
                <button type="button" id="record-audio-btn" style="background: #334155;" title="Gravar Áudio">🎤 Gravar</button>
                <button type="submit">Enviar</button>
            </form>
        </main>
    </div>

    <!-- Modal Adicionar Contato -->
    <div id="contact-modal" class="modal hidden">
        <div class="modal-content">
            <h3>Adicionar Novo Contato</h3>
            <input type="text" id="new-contact-name" placeholder="Nome de usuário" />
            <div style="display: flex; gap: 10px;">
                <button id="add-contact-confirm" style="flex: 1;">Adicionar</button>
                <button id="close-contact-modal" style="flex: 1; background: #334155;">Cancelar</button>
            </div>
        </div>
    </div>

    <script>
        let db;
        let currentUser = "";
        let socket;
        let mediaRecorder;
        let audioChunks = [];

        // Inicializa o IndexedDB para cache offline de mensagens e credenciais
        const requestDB = indexedDB.open("EchoOfflineDB", 1);
        requestDB.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains("messages")) {
                db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains("auth")) {
                db.createObjectStore("auth", { keyPath: "username" });
            }
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

        // Relogin automático via IndexedDB
        function checkAutoLogin() {
            const tx = db.transaction("auth", "readonly");
            const store = tx.objectStore("auth");
            const req = store.getAll();
            req.onsuccess = () => {
                if (req.result.length > 0) {
                    currentUser = req.result[0].username;
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
            formTitle.textContent = isSignup ? "Echo - Cadastro" : "Echo - Entrar";
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
                    formTitle.textContent = "Echo - Entrar";
                    authBtn.textContent = "Entrar";
                    switchBtn.innerHTML = "Não tem uma conta? <span>Cadastre-se</span>";
                    authError.textContent = "";
                } else {
                    currentUser = username;
                    // Salva hash e user no IndexedDB para relogin automático
                    const tx = db.transaction("auth", "readwrite");
                    tx.objectStore("auth").put({ username, password_hash });
                    startApp();
                }
            } catch (err) {
                authError.textContent = "Erro de conexão com o servidor.";
            }
        });

        function startApp() {
            authCard.classList.add("hidden");
            appContainer.classList.remove("hidden");
            document.getElementById("logged-user").textContent = \`Logado: \${currentUser}\`;
            loadOfflineMessages();
            initWebSocket();
        }

        // Carregar mensagens do IndexedDB (Permite ver mensagens off-line)
        function loadOfflineMessages() {
            const tx = db.transaction("messages", "readonly");
            const store = tx.objectStore("messages");
            const req = store.getAll();
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
                    store.clear(); // Atualiza cache local com o servidor
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

        // Envio de Mensagem de Texto
        document.getElementById("chat-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("message-input");
            const text = input.value.trim();
            if (!text) return;

            socket.send(JSON.stringify({ sender: currentUser, msgType: "text", content: text }));
            input.value = "";
        });

        // Gravação de Áudio Real com MediaRecorder
        const recordBtn = document.getElementById("record-audio-btn");
        let isRecording = false;

        recordBtn.addEventListener("click", async () => {
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];

                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            const base64Audio = reader.result;
                            socket.send(JSON.stringify({ sender: currentUser, msgType: "audio", content: base64Audio }));
                        };
                    };

                    mediaRecorder.start();
                    isRecording = true;
                    recordBtn.style.background = "#ef4444";
                    recordBtn.textContent = "⏹ Parar";
                } catch (err) {
                    alert("Permissão de microfone negada ou indisponível.");
                }
            } else {
                mediaRecorder.stop();
                isRecording = false;
                recordBtn.style.background = "#334155";
                recordBtn.textContent = "🎤 Gravar";
            }
        });

        function appendMessageUI(sender, content, msgType, isOutgoing) {
            const messagesContainer = document.getElementById("messages");
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message", isOutgoing ? "outgoing" : "incoming");

            let innerHTML = \`<b style="color: #38bdf8; display: block; font-size: 0.75rem;">\${sender}</b>\`;
            
            if (msgType === "text") {
                innerHTML += \`<span>\${content}</span>\`;
            } else if (msgType === "audio") {
                innerHTML += \`<audio controls src="\${content}" style="width: 200px; margin-top: 5px;"></audio>\`;
            }

            messageDiv.innerHTML = innerHTML;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Modal Contato
        const modal = document.getElementById("contact-modal");
        document.getElementById("open-contact-modal").addEventListener("click", () => modal.classList.remove("hidden"));
        document.getElementById("close-contact-modal").addEventListener("click", () => modal.classList.add("hidden"));
        document.getElementById("add-contact-confirm").addEventListener("click", () => {
            const contactName = document.getElementById("new-contact-name").value.trim();
            if (contactName) {
                const list = document.getElementById("contact-list");
                const item = document.createElement("div");
                item.className = "contact-item";
                item.innerHTML = \`<b>\${contactName}</b><p style="font-size: 0.75rem; color: #94a3b8;">Conversa privada</p>\`;
                list.appendChild(item);
                document.getElementById("new-contact-name").value = "";
                modal.classList.add("hidden");
            }
        });
    </script>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
