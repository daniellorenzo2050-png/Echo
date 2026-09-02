export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
    
    // Inicializa a tabela SQLite nativa da Durable Object
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

    // Gerenciamento padrão de WebSocket
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
