const setCookie = (res, tokenType, token, maxAge = 5 * 60 * 1000) => {
  res.cookie(tokenType, token, {
    httpOnly: true,
    secure: false,
    maxAge,
    sameSite: "Strict",
  });
};

module.exports = setCookie;
