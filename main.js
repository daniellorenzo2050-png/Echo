export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Rota HTTP para servir o index.html embutido
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Echo - Web</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { background-color: #111b21; color: #e9edef; height: 100vh; display: flex; justify-content: center; align-items: center; }
        .echo-container { display: flex; width: 100vw; height: 100vh; max-width: 1600px; max-height: 95vh; background-color: #222d34; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); border-radius: 8px; overflow: hidden; position: relative; }
        .sidebar { width: 35%; border-right: 1px solid #2f3b43; display: flex; flex-direction: column; background-color: #111b21; }
        .sidebar-header { padding: 15px; background-color: #202c33; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h2 { color: #00a884; }
        .user-info { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; font-size: 12px; }
        .btn-small { background-color: #00a884; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; }
        .search-box { padding: 10px; background-color: #111b21; }
        .search-box input { width: 100%; padding: 8px 12px; background-color: #202c33; border: none; border-radius: 8px; color: #fff; outline: none; }
        .chat-list { flex: 1; overflow-y: auto; }
        .chat-area { flex: 65%; display: flex; flex-direction: column; background-color: #0b141a; }
        .chat-header { padding: 15px; background-color: #202c33; display: flex; align-items: center; }
        .messages-container { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background-image: radial-gradient(#222d34 1px, transparent 1px); background-size: 20px 20px; }
        .message { max-width: 65%; padding: 8px 12px; border-radius: 8px; position: relative; word-break: break-word; }
        .message.sent { background-color: #005c4b; align-self: flex-end; border-top-right-radius: 0; }
        .message.received { background-color: #202c33; align-self: flex-start; border-top-left-radius: 0; }
        .message img, .message video { max-width: 100%; border-radius: 6px; margin-top: 5px; }
        .chat-input-bar { padding: 10px 20px; background-color: #202c33; display: flex; align-items: center; gap: 10px; }
        .chat-input-bar input[type="text"] { flex: 1; padding: 10px 15px; background-color: #2a3942; border: none; border-radius: 8px; color: #fff; outline: none; }
        .chat-input-bar button { background: none; border: none; color: #8696a0; font-size: 20px; cursor: pointer; }
        #btn-send { color: #00a884; }
        .auth-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .auth-content { background-color: #222d34; padding: 30px; border-radius: 8px; display: flex; flex-direction: column; gap: 15px; width: 320px; position: relative; }
        .auth-content h3 { color: #00a884; text-align: center; }
        .auth-content input { padding: 10px; background-color: #111b21; border: none; border-radius: 6px; color: #fff; outline: none; }
        .auth-buttons { display: flex; justify-content: space-between; gap: 10px; }
        .auth-buttons button { flex: 1; }
        .btn-close { position: absolute; top: 10px; right: 15px; background: none; border: none; color: #8696a0; cursor: pointer; font-size: 14px; }
    </style>
</head>
<body>
    <div class="echo-container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2>Echo</h2>
                <div class="user-info">
                    <span id="current-user-display">Não autenticado</span>
                    <button id="btn-open-auth" class="btn-small">Entrar / Criar Conta</button>
                </div>
            </div>
            <div class="search-box">
                <input type="text" id="search-input" placeholder="Pesquisar ou começar uma nova conversa">
            </div>
            <div class="chat-list" id="chat-list"></div>
        </aside>
        <main class="chat-area">
            <div class="chat-header" id="chat-header">
                <div class="contact-details">
                    <h3 id="active-chat-name">Selecione uma conversa</h3>
                    <span id="active-chat-status">offline</span>
                </div>
            </div>
            <div class="messages-container" id="messages-container"></div>
            <div class="chat-input-bar">
                <input type="file" id="file-input" style="display: none;" accept="image/*,video/*,application/*">
                <button id="btn-attach" title="Enviar Arquivo/Vídeo/Figurinha">📎</button>
                <input type="text" id="message-input" placeholder="Digite uma mensagem">
                <button id="btn-send">➤</button>
            </div>
        </main>
    </div>
    <div id="auth-modal" class="auth-modal" style="display: none;">
        <div class="auth-content">
            <h3>Acessar Echo</h3>
            <input type="text" id="auth-user" placeholder="Usuário">
            <input type="password" id="auth-pass" placeholder="Senha">
            <div class="auth-buttons">
                <button id="btn-login-action" class="btn-small">Entrar</button>
                <button id="btn-register-action" class="btn-small">Criar Conta</button>
            </div>
            <button id="btn-close-auth" class="btn-close">X</button>
        </div>
    </div>
    <script>
        const DB_NAME = 'EchoDB';
        const DB_VERSION = 1;
        let db = null;
        function initIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = (event) => reject(event.target.error);
                request.onsuccess = (event) => { db = event.target.result; resolve(db); };
                request.onupgradeneeded = (event) => {
                    const database = event.target.result;
                    if (!database.objectStoreNames.contains('messages')) database.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    if (!database.objectStoreNames.contains('media')) database.createObjectStore('media', { keyPath: 'id', autoIncrement: true });
                };
            });
        }
        function saveToDB(storeName, data) {
            return new Promise((resolve, reject) => {
                if (!db) return reject("Banco não inicializado");
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            });
        }
        const btnOpenAuth = document.getElementById('btn-open-auth');
        const authModal = document.getElementById('auth-modal');
        const btnCloseAuth = document.getElementById('btn-close-auth');
        const btnLoginAction = document.getElementById('btn-login-action');
        const btnRegisterAction = document.getElementById('btn-register-action');
        const authUser = document.getElementById('auth-user');
        const authPass = document.getElementById('auth-pass');
        let myUserId = null;
        let ws = null;
        let activeReceiverId = "geral";
        let selectedFileObject = null;
        btnOpenAuth.addEventListener('click', () => authModal.style.display = 'flex');
        btnCloseAuth.addEventListener('click', () => authModal.style.display = 'none');
        btnRegisterAction.addEventListener('click', async () => {
            const username = authUser.value.trim();
            const password = authPass.value.trim();
            if (!username || !password) return alert('Preencha usuário e senha!');
            try {
                const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                const data = await res.json();
                alert(data.message);
            } catch (e) { alert('Erro ao conectar com o servidor.'); }
        });
        btnLoginAction.addEventListener('click', async () => {
            const username = authUser.value.trim();
            const password = authPass.value.trim();
            if (!username || !password) return alert('Preencha usuário e senha!');
            try {
                const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                const data = await res.json();
                if (data.success) {
                    myUserId = data.userId;
                    document.getElementById('current-user-display').innerText = \`ID: \${myUserId}\`;
                    btnOpenAuth.style.display = 'none';
                    authModal.style.display = 'none';
                    connectWebSocket();
                } else { alert(data.message); }
            } catch (e) { alert('Erro ao realizar login.'); }
        });
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}/websocket\`);
            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'register', userId: myUserId }));
                document.getElementById('active-chat-status').innerText = 'online';
            };
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'receive_message') {
                    await saveToDB('messages', { senderId: data.senderId, receiverId: myUserId, text: data.text, timestamp: data.timestamp, type: 'text' });
                    appendMessageToUI(data.text, 'received');
                }
            };
            ws.onclose = () => {
                document.getElementById('active-chat-status').innerText = 'offline';
                setTimeout(connectWebSocket, 3000);
            };
        }
        const messageInput = document.getElementById('message-input');
        const btnSend = document.getElementById('btn-send');
        const messagesContainer = document.getElementById('messages-container');
        const btnAttach = document.getElementById('btn-attach');
        const fileInput = document.getElementById('file-input');
        btnAttach.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) { selectedFileObject = file; alert(\`Arquivo selecionado: \${file.name}\`); }
        });
        btnSend.addEventListener('click', async () => {
            if (!myUserId) return alert('Faça login primeiro!');
            const text = messageInput.value.trim();
            const timestamp = new Date().toISOString();
            if (selectedFileObject) {
                await saveToDB('media', { name: selectedFileObject.name, type: selectedFileObject.type, blob: selectedFileObject, timestamp });
                const isVideo = selectedFileObject.type.startsWith('video');
                const isImage = selectedFileObject.type.startsWith('image');
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message sent';
                if (isVideo) {
                    const video = document.createElement('video'); video.src = URL.createObjectURL(selectedFileObject); video.controls = true; messageDiv.appendChild(video);
                } else if (isImage) {
                    const img = document.createElement('img'); img.src = URL.createObjectURL(selectedFileObject); messageDiv.appendChild(img);
                } else { messageDiv.innerText = \`[Arquivo: \${selectedFileObject.name}]\`; }
                messagesContainer.appendChild(messageDiv);
                selectedFileObject = null;
                fileInput.value = '';
            }
            if (text) {
                await saveToDB('messages', { senderId: myUserId, receiverId: activeReceiverId, text, timestamp, type: 'text' });
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'send_message', senderId: myUserId, receiverId: activeReceiverId, text, timestamp }));
                }
                appendMessageToUI(text, 'sent');
                messageInput.value = '';
            }
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
        function appendMessageToUI(text, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.innerText = text;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        window.addEventListener('DOMContentLoaded', async () => {
            try { await initIndexedDB(); } catch (err) { console.error("Erro IndexedDB:", err); }
        });
    </script>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // Rota HTTP para Cadastro (Sign Up)
    if (url.pathname === "/api/register" && request.method === "POST") {
      const { username, password } = await request.json();
      const id = env.ECHO_CHAT.idFromName("global-chat-room");
      const stub = env.ECHO_CHAT.get(id);
      return stub.fetch(new Request("https://internal/api/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
      }));
    }

    // Rota HTTP para Login
    if (url.pathname === "/api/login" && request.method === "POST") {
      const { username, password } = await request.json();
      const id = env.ECHO_CHAT.idFromName("global-chat-room");
      const stub = env.ECHO_CHAT.get(id);
      return stub.fetch(new Request("https://internal/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      }));
    }

    // Rota do WebSocket
    if (url.pathname === "/websocket") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const id = env.ECHO_CHAT.idFromName("global-chat-room");
      const stub = env.ECHO_CHAT.get(id);

      return stub.fetch(request);
    }

    return new Response(JSON.stringify({ status: "Echo Server active", engine: "SQLite + Durable Objects" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

export class EchoChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
      );
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/register") {
      const { username, password } = await request.json();
      try {
        this.state.storage.sql.exec(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          username, password
        );
        return new Response(JSON.stringify({ success: true, message: "Conta criada com sucesso!" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: "Usuário já existe." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/api/login") {
      const { username, password } = await request.json();
      const cursor = this.state.storage.sql.exec(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        username, password
      );
      const user = cursor.toArray()[0];

      if (user) {
        return new Response(JSON.stringify({ success: true, userId: user.username }), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: "Usuário ou senha incorretos." }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.state.acceptWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws, messageString) {
    try {
      const data = JSON.parse(messageString);

      if (data.type === 'register') {
        ws.serializeAttachment({ userId: data.userId });
        ws.send(JSON.stringify({ type: 'registered', status: 'success' }));
        return;
      }

      if (data.type === 'send_message') {
        const { senderId, receiverId, text, timestamp } = data;
        const payload = JSON.stringify({
          type: 'receive_message',
          senderId,
          text,
          timestamp: timestamp || new Date().toISOString()
        });

        const sockets = this.state.getWebSockets();
        for (const socket of sockets) {
          const attachment = socket.deserializeAttachment();
          if (attachment && attachment.userId === receiverId) {
            socket.send(payload);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Erro no WebSocket:', error);
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(code, "Drained");
  }
}
