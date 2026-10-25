import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Test the actual export, not only the source template: Expo must use it.
// Run after `expo export -p web`.
const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");

test("export declares Arabic and UTF-8 before the application starts", () => {
  assert.match(html, /<html\b[^>]*\blang="ar"/i);
  assert.match(html, /<meta\b[^>]*\bcharset="utf-8"/i);
  assert.doesNotMatch(html, /%LANG_ISO_CODE%|%WEB_TITLE%/);
});

test("translation is disabled for names, drink labels and application controls", () => {
  assert.match(html, /<html\b[^>]*\btranslate="no"/i);
  assert.match(html, /<body\b[^>]*\btranslate="no"/i);
  assert.match(html, /<html\b[^>]*\bclass="notranslate"/i);
  assert.match(html, /<meta\b[^>]*\bname="google"[^>]*\bcontent="notranslate"/i);
});

test("custom document preserves the Expo application root and generated bundle", () => {
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /<script\b[^>]*\bsrc="[^"]+\.js"[^>]*><\/script>/i);
  assert.match(html, /id="expo-reset"/);
  assert.doesNotMatch(html, /\bdir="rtl"/); // Do not reverse existing RN flex layouts.
});
