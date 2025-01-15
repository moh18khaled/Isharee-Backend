const verifyJWT = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET_KEY);
};
module.exports.verifyJWT;