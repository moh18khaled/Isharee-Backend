const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    err.statusCode = 400;
    err.message = Object.values(err.errors)
      .map((el) => el.message)
      .join(", ");
  }

  res.status(err.statusCode).json({ error: err.message });
};
module.exports = globalError;
