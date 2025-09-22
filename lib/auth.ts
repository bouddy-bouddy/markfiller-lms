import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export const ADMIN_TOKEN_COOKIE = "admin_token";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "admin";
};

export function signAdminJwt(payload: JwtPayload, expiresIn: string = "12h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt<T = JwtPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

export function getAuthHeaderToken(
  authorizationHeader?: string | null
): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}
