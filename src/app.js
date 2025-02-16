const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const businessOwnerRoutes = require("./routes/businessOwnerRoutes");
const postRoutes = require("./routes/postRoutes");
const paymentsRouter =require("./routes/paymentsRouter");
const dashboardRoutes =require("./routes/dashboardRoutes"); 
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const path = require("path");
const rateLimit = require("express-rate-limit");
const globalError = require("./middlewares/globalError");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { initializeSocket } = require("./utils/socket");
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
  limit: 10000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
app.use(limiter);

// Security Enhancements
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "default-src": ["'self'"],
      "img-src": ["*"], // Allows images from any source
      "connect-src": ["'self'", "https://isharee-backend-production.up.railway.app"], // Allow backend API requests
    },
  })
);
// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err.message));

// For static uploads (images, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Use API routes BEFORE serving frontend
app.use("/user", userRoutes);
app.use("/businessOwner", businessOwnerRoutes);
app.use("/posts", postRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/payments", paymentsRouter);

// Default API Home Route
app.get("/", (req, res) => {
  res.send("Welcome to the iSharee Backend!");
});


// Global Error Handling
app.use(globalError);

app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// Handle Invalid API Routes
app.all("*", (req, res, next) => {
  next(new AppError("Cannot find this route", 404));
});


module.exports = app;
