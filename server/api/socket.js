const { Server } = require("socket.io");

module.export = function handler(req, res) {
  // Check if the socket server already exists to avoid creating it multiple times
  if (res.socket.server.io) {
    console.log("Socket.io server is already running");
    res.end();
    return;
  }

  // Initialize Socket.io server
  const io = new Server(res.socket.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  res.socket.server.io = io; // Attach the Socket.io server to the res object

  const emailToSocketIdMap = new Map();
  const socketidToEmailMap = new Map();

  // Listen for socket connections
  io.on("connection", (socket) => {
    console.log(`Socket Connected`, socket.id);

    // Handle room joining
    socket.on("room:join", (data) => {
      const { email, room } = data;
      emailToSocketIdMap.set(email, socket.id);
      socketidToEmailMap.set(socket.id, email);
      io.to(room).emit("user:joined", { email, id: socket.id });
      socket.join(room);
      io.to(socket.id).emit("room:join", data);
    });

    // Handle user calling another user
    socket.on("user:call", ({ to, offer }) => {
      io.to(to).emit("incoming:call", { from: socket.id, offer });
    });

    // Handle call acceptance
    socket.on("call:accepted", ({ to, ans }) => {
      io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    // Handle peer negotiation needed
    socket.on("peer:nego:needed", ({ to, offer }) => {
      console.log("peer:nego:needed", offer);
      io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
    });

    // Handle peer negotiation done
    socket.on("peer:nego:done", ({ to, ans }) => {
      console.log("peer:nego:done", ans);
      io.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });
  });

  res.end();
};
