import jwt from "jsonwebtoken";

const secret = () => process.env.JWT_SECRET || "eeclass-dev-secret-change-in-production";
const expiresIn = () => process.env.JWT_EXPIRES_IN || "7d";

export function signAccessToken(username, role) {
  return jwt.sign({ sub: username, role }, secret(), { expiresIn: expiresIn() });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, secret());
}
