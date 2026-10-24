// Keep this entry in source control so Vercel discovers the function before
// the build. TypeScript is checked and bundled by build:vercel, not recompiled
// through Vercel's separate TypeScript/project-reference resolution.
module.exports = require("../artifacts/api-server/dist-vercel/handler.cjs").default;
