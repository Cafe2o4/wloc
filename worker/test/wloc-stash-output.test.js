import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function executeAsStash(script) {
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });

  const context = vm.createContext({
    $environment: { "stash-version": "3.2.5" },
    $script: { startTime: Date.now() },
    $argument: "longitude=113.7&latitude=22.7&accuracy=25&logLevel=off",
    $request: {
      url: "https://gs-loc-cn.apple.com/clls/wloc",
      method: "POST",
      headers: {},
    },
    $response: {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(),
    },
    $persistentStore: {
      read() {
        return JSON.stringify({
          longitude: 113.7,
          latitude: 22.7,
          accuracy: 25,
        });
      },
      write() {
        return true;
      },
    },
    $done(payload) {
      resolveDone(payload);
    },
    console: { log() {} },
    setTimeout,
    clearTimeout,
    Uint8Array,
    ArrayBuffer,
  });

  vm.runInContext(script, context);

  return Promise.race([
    done,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("WLOC script did not call $done")), 1000);
    }),
  ]);
}

test("Stash response scripts return top-level response fields", async () => {
  const script = await readFile(path.resolve(workerDir, "../dist/wloc.js"), "utf8");
  const payload = await executeAsStash(script);

  assert.equal(Object.hasOwn(payload, "response"), false);
  assert.equal(payload.status, 200);
  assert.equal(payload.headers["Content-Type"], "application/octet-stream");
  assert.deepEqual(Array.from(payload.body), []);
});
