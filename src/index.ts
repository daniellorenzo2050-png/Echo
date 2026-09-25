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
    throw new Error("JWK_SERCET inválido.");
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
      return Response.json({ error: "Token inválido" }, { status: 403 });
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
      .setExpirationTime("30d")
      .sign(key);

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, avatar TEXT);
      CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT, sender TEXT, content TEXT, type TEXT, timestamp INTEGER);
    `).run();

    return Response.json({ token: jwt, username });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
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
    if (upgradeHeader !== "websocket") return new Response("Esperando WebSocket", { status: 400 });

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
    } catch (e) {}
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    ws.close(code, "Encerrado");
  }
}

// --- UI COMPLETA (SEM LOCALSTORAGE: TUDO NO INDEXEDDB + TAILWIND + FONT AWESOME) ---
function getEchoHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Echo - Plataforma de Mensagens</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Font Awesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <!-- Google Fonts Inter -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-[#0078d7] h-screen w-screen overflow-hidden flex flex-col">

  <!-- Ícone SVG Customizado do Echo (Rede/Internet + Mensagem) -->
  <svg style="display:none">
    <symbol id="echo-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      <path d="M8 12h8M12 8v8" stroke-linecap="round"/>
    </symbol>
  </svg>

  <!-- TELA DE CARREGAMENTO REAL COM PORCENTAGEM (%) -->
  <div id="loading-screen" class="fixed inset-0 bg-[#002050] z-50 flex flex-col items-center justify-center text-white">
    <div class="flex items-center gap-3 mb-6">
      <svg class="w-12 h-12 text-[#0078d7] animate-spin"><use href="#echo-logo"/></svg>
      <h1 class="text-3xl font-bold tracking-tight">Echo</h1>
    </div>
    <div class="w-72 bg-gray-700 h-3 rounded-full overflow-hidden shadow-inner mb-3">
      <div id="progress-bar" class="bg-[#0078d7] h-full w-0 transition-all duration-300"></div>
    </div>
    <p id="loading-text" class="text-sm text-gray-300 font-medium">Inicializando IndexedDB... (0%)</p>
  </div>

  <!-- TELA DE LOGIN -->
  <div id="login-screen" class="fixed inset-0 bg-gradient-to-br from-[#0078d7] to-[#002050] z-40 flex flex-col items-center justify-center text-white p-4 hidden">
    <div class="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md flex flex-col items-center">
      <div class="flex items-center gap-3 mb-6">
        <svg class="w-10 h-10 text-white"><use href="#echo-logo"/></svg>
        <h2 class="text-2xl font-bold">Entrar no Echo</h2>
      </div>
      <input type="text" id="username-input" placeholder="Seu nome de usuário..." class="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 placeholder-gray-200 text-white focus:outline-none focus:ring-2 focus:ring-white mb-4">
      <button onclick="login()" class="w-full py-3 bg-[#107c41] hover:bg-[#0b5a30] text-white font-semibold rounded-xl shadow-lg transition duration-200 flex items-center justify-center gap-2">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> Conectar
      </button>
    </div>
  </div>

  <!-- APLICAÇÃO PRINCIPAL (Adaptada para tamanhos reais de tela) -->
  <div id="app" class="flex flex-col md:flex-row w-full h-full bg-white hidden">
    
    <!-- Sidebar -->
    <div id="sidebar" class="w-full md:w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div class="p-4 bg-[#0078d7] text-white font-semibold flex justify-between items-center shadow-md">
        <div class="flex items-center gap-2">
          <svg class="w-6 h-6"><use href="#echo-logo"/></svg>
          <span id="current-user-label" class="truncate max-w-[150px]">Echo User</span>
        </div>
        <div class="flex items-center gap-2">
          <input type="file" id="avatar-file" class="hidden" onchange="uploadAvatar(this)">
          <button onclick="document.getElementById('avatar-file').click()" class="p-2 hover:bg-white/10 rounded-full transition" title="Foto de Perfil"><i class="fa-solid fa-camera"></i></button>
          <button onclick="logout()" class="p-2 hover:bg-white/10 rounded-full transition" title="Sair"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </div>
      <div class="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wider bg-gray-100 border-b">Conversas Recentes</div>
      <div class="flex-1 overflow-y-auto p-2">
        <div class="flex items-center gap-3 p-3 bg-blue-50 border-l-4 border-[#0078d7] rounded-r-lg cursor-pointer">
          <div class="w-10 h-10 rounded-full bg-[#0078d7] text-white flex items-center justify-center font-bold"><i class="fa-solid fa-globe"></i></div>
          <div>
            <div class="font-semibold text-gray-800 text-sm"># Sala Geral</div>
            <div class="text-xs text-gray-500">Conectado via Echo</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Área de Chat -->
    <div class="flex-1 flex flex-col h-full bg-white">
      <div class="p-4 border-b border-gray-200 font-semibold bg-white flex justify-between items-center shadow-sm">
        <div class="flex items-center gap-3">
          <span class="text-gray-800 font-bold text-base md:text-lg flex items-center gap-2"><i class="fa-solid fa-comments text-[#0078d7]"></i> Sala Geral - Echo</span>
        </div>
        <div class="flex gap-2">
          <button onclick="startAudioCall()" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fa-solid fa-phone text-[#0078d7]"></i> <span class="hidden sm:inline">Áudio</span></button>
          <button onclick="startVideoCall()" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition flex items-center gap-1.5"><i class="fa-solid fa-video text-[#0078d7]"></i> <span class="hidden sm:inline">Vídeo</span></button>
        </div>
      </div>

      <div id="messages" class="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3 bg-[#f8fafc]"></div>

      <div class="p-3 md:p-4 border-t border-gray-200 bg-white flex gap-2 items-center">
        <input type="text" id="message-input" placeholder="Escreva uma mensagem..." class="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0078d7] text-sm" onkeypress="if(event.key==='Enter') sendMessage()">
        <div class="flex gap-1">
          <button onclick="sendSticker()" class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition" title="Figurinha"><i class="fa-solid fa-star"></i></button>
          <button onclick="sendFile()" class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition" title="Arquivo"><i class="fa-solid fa-paperclip"></i></button>
          <button onclick="sendAudioRecord()" class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition" title="Áudio"><i class="fa-solid fa-microphone"></i></button>
          <button onclick="sendMessage()" class="px-4 py-2.5 bg-[#0078d7] hover:bg-[#005a9e] text-white font-semibold rounded-xl transition shadow-sm"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  </div>

  <audio id="remote-audio" autoplay></audio>
  <video id="remote-video" autoplay playsinline class="hidden fixed bottom-5 right-5 w-48 md:w-64 border-4 border-[#0078d7] rounded-2xl shadow-2xl z-50 bg-black"></video>

  <script>
    let token = null;
    let username = null;
    let ws;
    let db;

    function updateLoading(percent, text) {
      document.getElementById("progress-bar").style.width = percent + "%";
      document.getElementById("loading-text").innerText = text + " (" + percent + "%)";
    }

    // Inicialização exclusiva via IndexedDB (Sem LocalStorage)
    window.addEventListener("DOMContentLoaded", () => {
      updateLoading(15, "Abrindo IndexedDB...");
      const requestDB = indexedDB.open("EchoDatabase_Secure", 1);

      requestDB.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("session")) {
          db.createObjectStore("session", { keyPath: "key" });
        }
      };

      requestDB.onsuccess = async function(e) {
        db = e.target.result;
        updateLoading(40, "Verificando sessão no IndexedDB...");
        loadSessionFromIndexedDB();
      };
    });

    function loadSessionFromIndexedDB() {
      const tx = db.transaction(["session"], "readonly");
      const store = tx.objectStore("session");
      
      const reqToken = store.get("token");
      const reqUser = store.get("username");

      tx.oncomplete = async function() {
        token = reqToken.result ? reqToken.result.value : null;
        username = reqUser.result ? reqUser.result.value : null;

        if (token && username) {
          updateLoading(70, "Carregando histórico local...");
          loadLocalHistory();
          updateLoading(90, "Sincronizando com o servidor...");
          await syncServerHistory();
          updateLoading(100, "Concluído!");
          setTimeout(() => {
            document.getElementById("loading-screen").classList.add("hidden");
            startApp();
          }, 400);
        } else {
          updateLoading(100, "Pronto!");
          setTimeout(() => {
            document.getElementById("loading-screen").classList.add("hidden");
            document.getElementById("login-screen").classList.remove("hidden");
          }, 300);
        }
      };
    }

    function saveSessionToIndexedDB(newToken, newUser) {
      token = newToken;
      username = newUser;
      const tx = db.transaction(["session"], "readwrite");
      const store = tx.objectStore("session");
      store.put({ key: "token", value: token });
      store.put({ key: "username", value: username });
    }

    function clearSessionFromIndexedDB() {
      const tx = db.transaction(["session"], "readwrite");
      const store = tx.objectStore("session");
      store.delete("token");
      store.delete("username");
    }

    function startApp() {
      document.getElementById("login-screen").classList.add("hidden");
      document.getElementById("app").classList.remove("hidden");
      document.getElementById("current-user-label").innerText = username;
      initWebSocket();
    }

    async function login() {
      const inputVal = document.getElementById("username-input").value;
      if (!inputVal) return alert("Digite o usuário");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inputVal })
      });
      const data = await res.json();
      if (data.token) {
        saveSessionToIndexedDB(data.token, data.username);
        document.getElementById("login-screen").classList.add("hidden");
        document.getElementById("loading-screen").classList.remove("hidden");
        updateLoading(50, "Baixando histórico...");
        await syncServerHistory();
        updateLoading(100, "Pronto!");
        setTimeout(() => {
          document.getElementById("loading-screen").classList.add("hidden");
          startApp();
        }, 300);
      } else {
        alert("Erro no login");
      }
    }

    function logout() {
      clearSessionFromIndexedDB();
      location.reload();
    }

    function loadLocalHistory() {
      const tx = db.transaction(["messages"], "readonly");
      const store = tx.objectStore("messages");
      store.getAll().onsuccess = function(e) {
        renderMessages(e.target.result);
      };
    }

    async function syncServerHistory() {
      try {
        const res = await fetch("/api/messages?room=general", {
          headers: { "Authorization": "Bearer " + token }
        });
        if (res.ok) {
          const serverMessages = await res.json();
          const tx = db.transaction(["messages"], "readwrite");
          const store = tx.objectStore("messages");
          serverMessages.forEach(m => store.put(m));
          renderMessages(serverMessages);
        }
      } catch(e) {}
    }

    function saveMessageToIndexedDB(msg) {
      if (!db) return;
      const tx = db.transaction(["messages"], "readwrite");
      tx.objectStore("messages").add(msg);
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
            document.getElementById("remote-audio").src = URL.createObjectURL(blob);
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
        alert("Foto de perfil atualizada!");
      };
      reader.readAsDataURL(file);
    }

    function sendMessage() {
      const input = document.getElementById("message-input");
      const text = input.value;
      if (!text) return;

      ws.send(JSON.stringify({ type: "text", content: text }));
      const msg = { sender: username, content: text, type: "text", timestamp: Date.now() };
      appendMessage(username, text, "text", true);
      saveMessageToIndexedDB(msg);
      input.value = "";
    }

    function sendSticker() {
      const sticker = "🌟 [Figurinha Echo]";
      ws.send(JSON.stringify({ type: "sticker", content: sticker }));
      const msg = { sender: username, content: sticker, type: "sticker", timestamp: Date.now() };
      appendMessage(username, sticker, "sticker", true);
      saveMessageToIndexedDB(msg);
    }

    function sendFile() {
      const fileContent = "documento_compartilhado.pdf";
      ws.send(JSON.stringify({ type: "file", content: fileContent }));
      const msg = { sender: username, content: "Arquivo: " + fileContent, type: "file", timestamp: Date.now() };
      appendMessage(username, msg.content, "file", true);
      saveMessageToIndexedDB(msg);
    }

    async function sendAudioRecord() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      let chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const buffer = await new Blob(chunks, { type: 'audio/wav' }).arrayBuffer();
        ws.send(buffer);
        appendMessage(username, "🎤 [Áudio de Voz]", "audio", true);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
      alert("Gravando áudio por 3 segundos...");
    }

    function startAudioCall() { alert("Chamada de Áudio iniciada."); }
    function startVideoCall() {
      const videoEl = document.getElementById("remote-video");
      videoEl.classList.remove("hidden");
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        videoEl.srcObject = stream;
        videoEl.play();
      });
      alert("Ligação de Vídeo ativa.");
    }

    function renderMessages(messages) {
      const container = document.getElementById("messages");
      container.innerHTML = "";
      messages.forEach(m => appendMessage(m.sender, m.content, m.type, m.sender === username));
    }

    function appendMessage(sender, content, type, isOutgoing) {
      const container = document.getElementById("messages");
      const div = document.createElement("div");
      div.className = "max-w-[75%] md:max-w-[60%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm " + 
        (isOutgoing ? 'bg-[#0078d7] text-white self-end ml-auto rounded-br-none' : 'bg-white text-gray-800 self-start mr-auto border border-gray-200 rounded-bl-none');
      div.innerHTML = \`<div class="font-bold text-xs opacity-80 mb-0.5">\${sender}</div><div>\${content}</div>\`;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
  </script>
</body>
</html>`;
}
