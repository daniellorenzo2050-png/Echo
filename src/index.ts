import { DurableObject } from "cloudflare:workers";
import { SignJWT, jwtVerify, importJWK } from "jose";

export interface Env {
  DB: D1Database;
  ECHO_KV: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
  JWK_SERCET: string;
}

async function getJwkKey(jwkString: string) {
  try {
    const jwk = JSON.parse(jwkString);
    return await importJWK(jwk, "HS256");
  } catch (e) {
    throw new Error("JWK_SERCET inválido ou mal formatado.");
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(getEchoHtml(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Token não fornecido" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let username = "";
    try {
      const secretKey = await getJwkKey(env.JWK_SERCET);
      const { payload } = await jwtVerify(token, secretKey);
      username = payload.sub as string;
    } catch (e) {
      return Response.json({ error: "Token inválido ou expirado" }, { status: 403 });
    }

    if (url.pathname === "/api/profile/avatar" && request.method === "POST") {
      const body: any = await request.json();
      let base64Data = body.avatarBase64 || "";
      if (base64Data.length > 500) base64Data = base64Data.substring(0, 500);

      await env.DB.prepare(
        "INSERT INTO users (username, avatar) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET avatar = ?"
      ).bind(username, base64Data, base64Data).run();

      return Response.json({ success: true });
    }

    if (url.pathname.startsWith("/api/messages") && request.method === "GET") {
      const roomId = url.searchParams.get("room") || "general";
      const { results } = await env.DB.prepare(
        "SELECT id, sender, content, type, timestamp FROM messages WHERE room_id = ? ORDER BY timestamp ASC LIMIT 200"
      ).bind(roomId).all();

      return Response.json(results);
    }

    if (url.pathname.startsWith("/api/room/")) {
      const roomId = url.pathname.split("/")[3] || "general";
      const id = env.CHAT_ROOM.idFromName(roomId);
      const stub = env.CHAT_ROOM.get(id);

      const modifiedRequest = new Headers(request.headers);
      modifiedRequest.set("x-username", username);
      
      return stub.fetch(new Request(request, { headers: modifiedRequest }));
    }

    return new Response("Rota não encontrada", { status: 404 });
  },
};

async function handleLogin(request: Request, env: Env): Promise<Response> {
  try {
    const body: any = await request.json();
    const { username } = body;
    if (!username) return Response.json({ error: "Username obrigatório" }, { status: 400 });

    const key = await getJwkKey(env.JWK_SERCET);
    const jwt = await new SignJWT({ username })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(username)
      .setIssuedAt()
      .setExpirationTime("30d") // 30 dias para prolongar a sessão automática
      .sign(key);

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, avatar TEXT);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT, sender TEXT, content TEXT, type TEXT, timestamp INTEGER);
    `).run();

    return Response.json({ token: jwt, username });
  } catch (e: any) {
    return Response.json({ error: "Erro interno: " + e.message }, { status: 500 });
  }
}

export class ChatRoom extends DurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Esperando WebSocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const username = request.headers.get("x-username") || "Anônimo";
    (server as any).username = username;

    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const sender = (ws as any).username;
    let data: any;

    try {
      if (typeof message === "string") {
        data = JSON.parse(message);
      } else {
        data = { type: "audio_raw", payload: Array.from(new Uint8Array(message)) };
      }

      if (["text", "sticker", "file"].includes(data.type)) {
        await this.env.DB.prepare(
          "INSERT INTO messages (room_id, sender, content, type, timestamp) VALUES (?, ?, ?, ?, ?)"
        ).bind("general", sender, data.content, data.type, Date.now()).run();
      }

      const sockets = this.state.getWebSockets();
      const outgoing = JSON.stringify({ sender, ...data, timestamp: Date.now() });

      for (const socket of sockets) {
        if (socket !== ws) socket.send(outgoing);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, "Encerrado");
  }
}

// --- UI DO SKYPE COM FONTES MODERNAS E INDEXEDDB ---
function getEchoHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Echo - Plataforma de Mensagens</title>
  <!-- Importação de Fonte Bonita via Google Fonts (Inter / Segoe UI feel) -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; margin: 0; background: #0078d7; display: flex; height: 100vh; color: #2c3e50; }
    
    #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(135deg, #0078d7, #002050); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; z-index: 100; }
    #login-screen h2 { margin-bottom: 20px; font-weight: 600; letter-spacing: -0.5px; }
    #login-screen input { padding: 12px 16px; font-size: 15px; border-radius: 8px; border: none; margin-bottom: 12px; width: 300px; outline: none; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    #login-screen button { padding: 12px 24px; background: #107c41; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px; transition: background 0.2s; }
    #login-screen button:hover { background: #0b5a30; }

    .app-container { display: flex; width: 100%; height: 100%; background: #fff; }
    .sidebar { width: 300px; background: #f8f9fa; border-right: 1px solid #e1e8ed; display: flex; flex-direction: column; }
    .sidebar-header { padding: 16px; background: #0078d7; color: white; font-weight: 600; display: flex; justify-content: space-between; align-items: center; font-size: 15px; }
    
    .chat-area { flex: 1; display: flex; flex-direction: column; background: #ffffff; }
    .chat-header { padding: 16px; border-bottom: 1px solid #e1e8ed; font-weight: 600; background: #ffffff; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    
    .chat-messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f4f6f9; }
    .message { padding: 10px 16px; border-radius: 12px; max-width: 65%; word-break: break-word; font-size: 14px; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .message.incoming { background: #ffffff; align-self: flex-start; border: 1px solid #e1e8ed; }
    .message.outgoing { background: #d0e8ff; align-self: flex-end; color: #003366; }
    
    .chat-input { padding: 16px; border-top: 1px solid #e1e8ed; display: flex; gap: 10px; align-items: center; background: #ffffff; }
    .chat-input input[type="text"] { flex: 1; padding: 12px 16px; border: 1px solid #ccd6dd; border-radius: 8px; outline: none; font-size: 14px; font-family: 'Inter', sans-serif; }
    .chat-input input[type="text"]:focus { border-color: #0078d7; }
    .chat-input button { padding: 10px 14px; background: #0078d7; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 13px; transition: background 0.2s; }
    .chat-input button:hover { background: #005a9e; }
    .toolbar { display: flex; gap: 8px; }
  </style>
</head>
<body>

  <div id="login-screen">
    <h2>Echo - Entrar na Conta</h2>
    <input type="text" id="username-input" placeholder="Seu nome de usuário...">
    <button onclick="login()">Conectar</button>
  </div>

  <div class="app-container" id="app" style="display:none;">
    <div class="sidebar">
      <div class="sidebar-header">
        <span id="current-user-label">Echo User</span>
        <input type="file" id="avatar-file" style="display:none" onchange="uploadAvatar(this)">
        <button onclick="document.getElementById('avatar-file').click()" style="background:none;border:none;color:white;cursor:pointer;font-size:16px;" title="Foto de Perfil">📷</button>
      </div>
      <div style="padding: 16px; font-weight: 600; color: #555; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Conversas</div>
      <div style="padding: 10px 16px; color: #0078d7; font-weight: 500; cursor: pointer; background: #edf2f7; border-radius: 6px; margin: 0 10px;"># Sala Geral</div>
    </div>
    
    <div class="chat-area">
      <div class="chat-header">
        <span>Sala Geral - Echo Chat</span>
        <div class="toolbar">
          <button onclick="startAudioCall()">📞 Áudio</button>
          <button onclick="startVideoCall()">📹 Vídeo</button>
        </div>
      </div>
      <div class="chat-messages" id="messages"></div>
      <div class="chat-input">
        <input type="text" id="message-input" placeholder="Escreva uma mensagem..." onkeypress="if(event.key==='Enter') sendMessage()">
        <button onclick="sendSticker()">⭐ Figurinha</button>
        <button onclick="sendFile()">📁 Arquivo</button>
        <button onclick="sendAudioRecord()">🎤 Voz</button>
        <button onclick="sendMessage()">Enviar</button>
      </div>
    </div>
  </div>

  <audio id="remote-audio" autoplay></audio>
  <video id="remote-video" autoplay playsinline style="display:none; width: 220px; position: fixed; bottom: 20px; right: 20px; border: 3px solid #0078d7; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2);"></video>

  <script>
    let token = localStorage.getItem("echo_token");
    let username = localStorage.getItem("echo_username");
    let ws;
    let db;

    // Inicialização do IndexedDB para salvar histórico e sessão local
    const requestDB = indexedDB.open("EchoDatabase", 1);
    requestDB.onupgradeneeded = function(event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
      }
    };
    requestDB.onsuccess = function(event) {
      db = event.target.result;
      if (token && username) {
        autoLogin();
      }
    };

    function autoLogin() {
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("app").style.display = "flex";
      document.getElementById("current-user-label").innerText = username;
      loadLocalHistoryAndSync();
      initWebSocket();
    }

    async function login() {
      username = document.getElementById("username-input").value;
      if (!username) return alert("Digite o usuário");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.token) {
        token = data.token;
        localStorage.setItem("echo_token", token);
        localStorage.setItem("echo_username", username);
        autoLogin();
      } else {
        alert("Erro no login: " + (data.error || "Desconhecido"));
      }
    }

    // Carrega do IndexedDB primeiro (cache instantâneo) e busca atualizações do Servidor (D1)
    async function loadLocalHistoryAndSync() {
      const transaction = db.transaction(["messages"], "readonly");
      const store = transaction.objectStore("messages");
      const request = store.getAll();

      request.onsuccess = function() {
        const localMessages = request.result;
        renderMessages(localMessages);
      };

      // Busca dados novos no Servidor e atualiza o IndexedDB
      try {
        const res = await fetch("/api/messages?room=general", {
          headers: { "Authorization": "Bearer " + token }
        });
        const serverMessages = await res.json();
        
        const writeTx = db.transaction(["messages"], "readwrite");
        const writeStore = writeTx.objectStore("messages");
        
        serverMessages.forEach(m => {
          writeStore.put(m); // Salva no IndexedDB
        });

        writeTx.oncomplete = function() {
          renderMessages(serverMessages);
        };
      } catch (e) {
        console.log("Modo offline: usando apenas cache local.");
      }
    }

    function saveMessageToIndexedDB(msg) {
      if (!db) return;
      const tx = db.transaction(["messages"], "readwrite");
      const store = tx.objectStore("messages");
      store.add(msg);
    }

    function initWebSocket() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(protocol + "//" + window.location.host + "/api/room/general?token=" + token);
      
      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          const audioUrl = URL.createObjectURL(event.data);
          document.getElementById("remote-audio").src = audioUrl;
          document.getElementById("remote-audio").play();
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.type === "audio_raw") {
            const blob = new Blob([new Uint8Array(data.payload)], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(blob);
            document.getElementById("remote-audio").src = audioUrl;
            document.getElementById("remote-audio").play();
          } else {
            appendMessage(data.sender, data.content, data.type, false);
            saveMessageToIndexedDB(data);
          }
        } catch(e) {}
      };
    }

    async function uploadAvatar(input) {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function(e) {
        let base64 = e.target.result;
        await fetch("/api/profile/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ avatarBase64: base64 })
        });
        alert("Foto de perfil salva!");
      };
      reader.readAsDataURL(file);
    }

    function sendMessage() {
      const input = document.getElementById("message-input");
      const text = input.value;
      if (!text) return;

      const payload = { type: "text", content: text };
      ws.send(JSON.stringify(payload));
      
      const msgObj = { sender: username, content: text, type: "text", timestamp: Date.now() };
      appendMessage(username, text, "text", true);
      saveMessageToIndexedDB(msgObj);
      input.value = "";
    }

    function sendSticker() {
      const sticker = "🌟 [Figurinha Echo]";
      ws.send(JSON.stringify({ type: "sticker", content: sticker }));
      const msgObj = { sender: username, content: sticker, type: "sticker", timestamp: Date.now() };
      appendMessage(username, sticker, "sticker", true);
      saveMessageToIndexedDB(msgObj);
    }

    function sendFile() {
      const fileContent = "documento_compartilhado.pdf";
      ws.send(JSON.stringify({ type: "file", content: fileContent }));
      const msgObj = { sender: username, content: "Arquivo: " + fileContent, type: "file", timestamp: Date.now() };
      appendMessage(username, msgObj.content, "file", true);
      saveMessageToIndexedDB(msgObj);
    }

    async function sendAudioRecord() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const buffer = await audioBlob.arrayBuffer();
        ws.send(buffer);
        appendMessage(username, "🎤 [Áudio de Voz]", "audio", true);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
      alert("Gravando áudio por 3 segundos...");
    }

    function startAudioCall() { alert("Chamada de Áudio iniciada."); }
    function startVideoCall() {
      document.getElementById("remote-video").style.display = "block";
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();
      });
      alert("Ligação de Vídeo ativa.");
    }

    function renderMessages(messages) {
      const container = document.getElementById("messages");
      container.innerHTML = "";
      messages.forEach(m => {
        appendMessage(m.sender, m.content, m.type, m.sender === username);
      });
    }

    function appendMessage(sender, content, type, isOutgoing) {
      const container = document.getElementById("messages");
      const div = document.createElement("div");
      div.className = "message " + (isOutgoing ? 'outgoing' : 'incoming');
      div.innerHTML = "<strong>" + sender + ":</strong> " + content;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
  </script>
</body>
</html>`;
}
