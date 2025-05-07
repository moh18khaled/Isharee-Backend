const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const businessOwnerRoutes = require("./routes/businessOwnerRoutes");
const postRoutes = require("./routes/postRoutes");
const paymentsRouter = require("./routes/paymentsRouter");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const path = require("path");
const rateLimit = require("express-rate-limit");
const globalError = require("./middlewares/globalError");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const passport = require('passport');
require('./config/passport'); 
const { initializeSocket } = require("./utils/initializeSocket");
const seedCategories = require("./seedCategories");
dotenv.config();

const app = express();

// Serve frontend only AFTER API routes
app.use(express.static(path.join(__dirname, "client", "dist")));

app.use(express.json());
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:5173", // Local development
  "https://isharee-backend-production.up.railway.app", // Deployed frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


// Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use(limiter);

// Security Enhancements
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "https://accounts.google.com",
        "https://cdn.jsdelivr.net", // If you're using any other CDN
      ],
      "frame-src": ["https://accounts.google.com"],
      "img-src": ["*"],
      "connect-src": [
        "'self'",
        "https://isharee-backend-production.up.railway.app",
        "https://api.cloudinary.com",
      ],
    },
  })
);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err.message));



// Initialize Passport
app.use(passport.initialize());

// Use API routes BEFORE serving frontend
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/businessOwner", businessOwnerRoutes);
app.use("/postss", postRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/payments", paymentsRouter);

// Default API Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the iSharee Backend!");
});

// Global Error Handling
app.use(globalError);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// Handle Invalid API Routes
app.all("*", (req, res, next) => {
  next(new AppError("Cannot find this route", 404));
});

module.exports = app;
