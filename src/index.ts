
import express from "express";
import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { getPrisma } from "./database";
import { env } from "cloudflare:workers";

export { WebSocketServer } from "./websocket";

const app = express();

app.use(express.json());

app.get("/usuarios", async (req, res) => {
  const prisma = getPrisma();
  const usuarios = await prisma.usuario.findMany();

  res.json(usuarios);
});

app.post("/usuarios", async (req, res) => {
  const prisma = getPrisma();
  const usuario = await prisma.usuario.create({
    data: req.body,
  });

  const stub = env.WEBSOCKET.getByName("general");

  await stub.broadcast(
    JSON.stringify({
      evento: "usuario_creado",
      usuario: usuario,
    }),
  );

  res.status(201).json(usuario);
});

/**
 * Esto de cloudflare no tocar
 *
 * express: app.listener
 * cloudflare: eso de abajo
 */

const server = createServer(app);

const handler = httpServerHandler(
  server as unknown as Parameters<typeof httpServerHandler>[0],
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const stub = env.WEBSOCKET.getByName("general");

      return stub.fetch(request);
    }

    return handler.fetch!(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
