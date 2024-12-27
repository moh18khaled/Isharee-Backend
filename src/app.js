import express, { json } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();
const app = express();

// Middleware setup
app.use(json());

 
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
});




// Routes setup
app.get('/', (req, res) => {
    res.send('Welcome to the iSharee Backend!');
});

export default app;
