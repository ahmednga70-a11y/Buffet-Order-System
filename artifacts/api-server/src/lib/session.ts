import { extractToken, verifyToken } from "./jwt.js";
import { getUserById } from "./store.js";

export async function getActiveSession(req: { headers: { authorization?: string } }) {
  const token = extractToken(req.headers.authorization);
  const session = token ? verifyToken(token) : null;
  if (!session) return null;
  const stored = await getUserById(session.id);
  if (!stored?.isActive || stored.role !== session.role) return null;
  if (stored.role === "worker" && stored.projectId !== session.projectId) return null;
  return { ...session, displayName: stored.displayName, username: stored.username };
}
