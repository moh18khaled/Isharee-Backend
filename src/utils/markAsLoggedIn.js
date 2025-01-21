// Marks the user as logged in and proceeds to the next middleware.
const markAsLoggedIn = (req, next) => {
  req.loggedin = true; // Mark the user as logged in
  return next(); // Pass control to the next middleware
};
module.exports = markAsLoggedIn;
