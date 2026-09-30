import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { build } from "vite";

test("built resources stay within the current deployment directory", async () => {
  const { output } = await build({
    logLevel: "error",
    build: { write: false },
  });
  const html = output.find((file) => file.fileName === "index.html").source;
  const resources = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1]);

  assert.ok(resources.includes("./danmaku-websocket.min.js"));
  assert.ok(resources.includes("./logo.svg"));
  assert.ok(resources.some((resource) => /^\.\/assets\/.*\.js$/.test(resource)));
  assert.ok(resources.some((resource) => /^\.\/assets\/.*\.css$/.test(resource)));

  for (const resource of resources) {
    assert.ok(resource.startsWith("./"), `resource must be relative: ${resource}`);
    const fileName = resource.slice(2);
    assert.ok(
      output.some((file) => file.fileName === fileName)
        || existsSync(new URL(`../public/${fileName}`, import.meta.url)),
      `resource must exist in the build or public directory: ${resource}`,
    );

    for (const directory of ["/", "/1_1_0/", "/12_34_56/"]) {
      const page = `https://vote.vjoi.cn${directory}?magic=true&plug_env=1`;
      assert.equal(new URL(resource, page).pathname, `${directory}${fileName}`);
    }
  }
});
