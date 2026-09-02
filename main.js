export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/websocket") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const id = env.ECHO_CHAT.idFromName("global-chat-room");
      const stub = env.ECHO_CHAT.get(id);

      return stub.fetch(request);
    }

    return new Response(JSON.stringify({ status: "Echo Server on Cloudflare Workers", engine: "Durable Objects + SQLite" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

export class EchoChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    
    // Inicializa a tabela SQLite nativa da Durable Object
    this.state.blockConcurrencyWhile(async () => {
      this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at TEXT
        );
      `);
    });
  }

  async fetch(request) {
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

      // Ação de Criar Conta
      if (data.type === 'signup') {
        const { username, password } = data;
        try {
          this.state.storage.sql.exec(
            `INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)`,
            username, password, new Date().toISOString()
          );
          ws.send(JSON.stringify({ type: 'auth_response', success: true, message: 'Conta criada com sucesso!' }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'auth_response', success: false, message: 'Usuário já existe!' }));
        }
        return;
      }

      // Ação de Login
      if (data.type === 'login') {
        const { username, password } = data;
        const cursor = this.state.storage.sql.exec(
          `SELECT * FROM users WHERE username = ? AND password = ?`,
          username, password
        );
        const users = cursor.toArray();

        if (users.length > 0) {
          ws.serializeAttachment({ userId: username });
          ws.send(JSON.stringify({ type: 'auth_response', success: true, message: 'Login realizado com sucesso!', username }));
        } else {
          ws.send(JSON.stringify({ type: 'auth_response', success: false, message: 'Usuário ou senha inválidos!' }));
        }
        return;
      }

      // Registro legado via ID direto (opcional)
      if (data.type === 'register') {
        const currentUserId = data.userId;
        ws.serializeAttachment({ userId: currentUserId });
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
      console.error('Erro ao processar mensagem no Worker:', error);
    }
  }

  async webSocketClose(ws, code, reason, wasClean) {
    ws.close(code, "Drained");
  }
}
