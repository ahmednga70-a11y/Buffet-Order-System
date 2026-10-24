// Keep the function entry in source control so Vercel discovers it before
// running the frontend build. Express handles the original /api/* URL.
export { default } from "../artifacts/api-server/src/vercel-entry.js";
