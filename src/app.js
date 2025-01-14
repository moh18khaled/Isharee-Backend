const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");
const bodyParser = require("body-parser");
const AppError = require("./utils/AppError");
const rateLimit = require("express-rate-limit");
const globalError = require("./middlewares/globalError");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const app = express();

app.use(bodyParser.json());

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: ["POST", "GET", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Use the 'dev' logging format
app.use(morgan("dev"));

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

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
  });

// Handle any invalid route
app.all("*", (req, res, next) => {
  next(new AppError("Cannot find this route", 404));
});

// Global error Handling middleware
app.use(globalError);

// Use routes
app.use("/user", userRoutes);

// Routes setup
app.get("/", (req, res) => {
  res.send("Welcome to the iSharee Backend!");
});

module.exports = app;
