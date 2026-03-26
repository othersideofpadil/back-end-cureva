const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config");

let io = null;
const userSocketMap = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.nodeEnv === "development" ? true : config.frontendUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers?.authorization;
      const token = authToken || headerToken?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, config.jwt.secret);
      socket.userId = payload.id;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.userId);

    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }

    userSocketMap.get(userId).add(socket.id);

    socket.on("disconnect", () => {
      const sockets = userSocketMap.get(userId);

      if (!sockets) {
        return;
      }

      sockets.delete(socket.id);

      if (sockets.size === 0) {
        userSocketMap.delete(userId);
      }
    });
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) {
    return;
  }

  const sockets = userSocketMap.get(String(userId));

  if (!sockets || sockets.size === 0) {
    return;
  }

  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
};

module.exports = {
  initSocket,
  emitToUser,
};
