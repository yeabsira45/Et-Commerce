/* eslint-disable no-console */
const next = require("next");
const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const { PrismaClient } = require("@prisma/client");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    out[key] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const clientsByUser = new Map();

function addClient(userId, ws) {
  const set = clientsByUser.get(userId) || new Set();
  set.add(ws);
  clientsByUser.set(userId, set);
}

function removeClient(userId, ws) {
  const set = clientsByUser.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByUser.delete(userId);
}

function sendToUser(userId, payload) {
  const set = clientsByUser.get(userId);
  if (!set) return;
  const data = JSON.stringify(payload);
  set.forEach((ws) => {
    if (ws.readyState === 1) ws.send(data);
  });
}

async function sendUnreadCount(userId) {
  const count = await prisma.notification.count({
    where: { receiverId: userId, readAt: null, type: "MESSAGE" },
  });
  sendToUser(userId, { type: "notification:count", count });
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    try {
      const cookies = parseCookies(req.headers.cookie || "");
      const token = cookies.etcom_session;
      if (!token) {
        ws.close();
        return;
      }
      const tokenHash = hashToken(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!session || session.expiresAt < new Date() || session.user.bannedAt) {
        ws.close();
        return;
      }

      ws.userId = session.userId;
      addClient(session.userId, ws);
      ws.send(JSON.stringify({ type: "socket:ready", userId: session.userId }));
      await sendUnreadCount(session.userId);

      ws.on("message", async (raw) => {
        let payload;
        try {
          payload = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (payload.type === "message:send") {
          const { conversationId, listingId, body } = payload;
          if (!body) return;

          let conversation = null;
          if (conversationId) {
            conversation = await prisma.conversation.findUnique({
              where: { id: conversationId },
            });
          }

          if (!conversation && listingId) {
            const listing = await prisma.listing.findUnique({
              where: { id: listingId },
              include: { owner: true },
            });
            if (!listing || listing.ownerId === session.userId) return;

            conversation = await prisma.conversation.upsert({
              where: {
                listingId_requesterId_ownerId: {
                  listingId,
                  requesterId: session.userId,
                  ownerId: listing.ownerId,
                },
              },
              update: {},
              create: {
                listingId,
                requesterId: session.userId,
                ownerId: listing.ownerId,
              },
            });
          }

          if (!conversation) return;

          const message = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: session.userId,
              body,
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          const recipientId =
            conversation.requesterId === session.userId ? conversation.ownerId : conversation.requesterId;

          await prisma.notification.create({
            data: {
              senderId: session.userId,
              receiverId: recipientId,
              type: "MESSAGE",
              title: "New message",
              body: "You have a new message",
              conversationId: conversation.id,
              data: { conversationId: conversation.id },
            },
          });

          const messagePayload = {
            type: "message:new",
            conversationId: conversation.id,
            message: {
              id: message.id,
              senderId: message.senderId,
              body: message.body,
              createdAt: message.createdAt,
            },
          };

          sendToUser(session.userId, messagePayload);
          sendToUser(recipientId, messagePayload);
          await sendUnreadCount(recipientId);
        }

        if (payload.type === "notification:read") {
          await prisma.notification.updateMany({
            where: { receiverId: session.userId, readAt: null },
            data: { readAt: new Date() },
          });
          await sendUnreadCount(session.userId);
        }
      });

      ws.on("close", () => {
        removeClient(session.userId, ws);
      });
    } catch (err) {
      console.error("WS error", err);
      ws.close();
    }
  });

  server.listen(process.env.PORT || process.argv[2] || 3000, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${process.env.PORT || process.argv[2] || 3000}`);
  });
});
