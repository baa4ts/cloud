import { DurableObject } from "cloudflare:workers";

export class WebSocketServer extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Se requiere WebSocket", {
        status: 426,
      });
    }

    const pair = new WebSocketPair();

    this.ctx.acceptWebSocket(pair[1]);

    return new Response(null, {
      status: 101,
      webSocket: pair[0],
    });
  }
  // Establece la conexion WebSocket.

  broadcast(data: string) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    }
  }
}
