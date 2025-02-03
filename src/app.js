const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const businessOwnerRoutes = require("./routes/businessOwnerRoutes");
const postRoutes = require("./routes/postRoutes");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/AppError");
const path = require("path");
const rateLimit = require("express-rate-limit");
const globalError = require("./middlewares/globalError");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { initializeSocket } = require('./utils/socket');
const seedCategories = require('./seedCategories');


const app = express();


// Serve React static files
app.use(express.static(path.join(__dirname, "client/dist")));

// Catch-all route to serve React app (for React Router support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});


app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local development
      "https://ishare-production-50fb.up.railway.app", // Deployed frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Headers your client sends
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);

// Use the 'dev' logging format
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));

// Configure rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

// Apply the rate limiting middleware to all requests.
app.use(limiter);

// Secure HTTP headers
app.use(helmet());

// Enable compression for all responses
app.use(compression());

// Load environment variables
dotenv.config();

// Use express.json() to parse JSON request bodies
app.use(express.json());

// For photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
  });

//  seedCategories();
// Use routes
app.use("/user", userRoutes);
app.use("/businessOwner", businessOwnerRoutes);
app.use("/posts", postRoutes);

// Routes setup
app.get("/", (req, res) => {
  res.send("Welcome to the iSharee Backend!");
});

// Handle any invalid route
app.all("*", (req, res, next) => {
  next(new AppError("Cannot find this route", 404));
});

// Error Handling Middleware
app.use(globalError);

module.exports = app;
