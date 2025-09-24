import jwt, { type Secret, type SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret = (process.env.JWT_SECRET || "") as Secret;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export const ADMIN_TOKEN_COOKIE = "admin_token";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "admin" | "support";
};

export function signAdminJwt(
  payload: JwtPayload,
  expiresIn: string | number = "12h"
) {
  const options = { expiresIn } as SignOptions as any;
  return (jwt.sign as any)(payload as object, JWT_SECRET, options);
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
