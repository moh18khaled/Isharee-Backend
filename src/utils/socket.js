const socketIo = require('socket.io');
const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // You can restrict this to your frontend domain for security
            methods: ["GET", "POST"]
        }
    });
    

    io.on("connection", (socket) => {
        console.log("A user connected");
    
        socket.on("disconnect", () => {
          console.log("A user disconnected");
        });
    });
};

const getSocketIOInstance = () => {
    if (!io) {
        throw new Error('Socket.IO is not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getSocketIOInstance };