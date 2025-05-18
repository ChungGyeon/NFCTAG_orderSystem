
let io = null;

module.exports = {
  init: (server) => {
    io = require('socket.io')(server, {
      cors: {
        origin: "https://tagorder.duckdns.org:61422",
        methods: ["GET", "POST"]
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  }
};



