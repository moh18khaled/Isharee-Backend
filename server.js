const express = require('express');
const dotenv = require('dotenv');
const app = require('./src/app');
const http = require('http'); 

/*const initializeSocket = require("./src/utils/socket");  // Your socket utility file


const server = http.createServer(app);
// Initialize Socket.IO with the server
initializeSocket(server);
*/

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
