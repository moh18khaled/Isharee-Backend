const express = require("express");
const dotenv = require("dotenv");
const app = require("./src/app");
const { Server } = require("socket.io");
const {
  scheduleDashboardUpdates,
} = require("./src/utils/scheduleDashboardUpdates");
const { createServer } = require("http");
const { initializeSocket } = require('./src/utils/initializeSocket');

/*const initializeSocket = require("./src/utils/socket");  // Your socket utility file


const server = http.createServer(app);
// Initialize Socket.IO with the server
initializeSocket(server);
*/

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const httpServer = createServer(app);


// Initialize dashboard updates
scheduleDashboardUpdates();

// Start the server
httpServer.listen(PORT,HOST, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize Socket.IO
initializeSocket(httpServer);