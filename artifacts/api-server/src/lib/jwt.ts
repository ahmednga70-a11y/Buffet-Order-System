import jwt from "jsonwebtoken";

const SECRET = process.env["SESSION_SECRET"] || "buffet-secret-key-2024";

export interface JwtPayload {
  id: string;
  username: string;
  displayName: string;
  role: "customer" | "worker";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
