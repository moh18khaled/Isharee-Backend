const clearCookies = (res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
};

module.exports = clearCookies;
