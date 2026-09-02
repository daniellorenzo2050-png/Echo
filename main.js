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

    return new Response(JSON.stringify({ status: "Echo Server on Cloudflare Workers", engine: "Durable Objects" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

export class EchoChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
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
