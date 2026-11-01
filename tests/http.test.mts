import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";

await test(
  "production HTTP: login, authorization, CRUD, cache, persistence, expiry and logout",
  { timeout: 60_000 },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "chiara-http-"));
    const databaseUrl = `file:${path.join(directory, "test.db")}`;
    const client = createClient({ url: databaseUrl });
    const port = 3400 + Math.floor(Math.random() * 1000);
    const origin = `http://localhost:${port}`;
    const credentials = await readFile(".admin-credentials.local", "utf8");
    const username = /Username: (.+)/.exec(credentials)![1];
    const password = /Password: (.+)/.exec(credentials)![1];
    let cookie = "";
    const secret = randomBytes(32).toString("hex");
    let server: ChildProcess | undefined;
    let output = "";
    async function start() {
      server = spawn(
        process.execPath,
        ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
        {
          env: {
            ...process.env,
            NODE_ENV: "production",
            STORAGE_TURSO_DATABASE_URL: databaseUrl,
            STORAGE_TURSO_AUTH_TOKEN: "",
            ADMIN_SESSION_SECRET: secret,
            CLOUDINARY_CLOUD_NAME: "test-cloud",
            CLOUDINARY_API_KEY: "test-key",
            CLOUDINARY_API_SECRET: "test-secret",
            VERCEL: "",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      server.stdout?.on("data", (data) => {
        output += data.toString();
      });
      server.stderr?.on("data", (data) => {
        output += data.toString();
      });
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(origin + "/admin")).status === 200) return;
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Server did not start: ${output}`);
    }
    async function stop() {
      if (!server || server.exitCode !== null) return;
      const child = server;
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
        child.kill("SIGTERM");
      });
    }
    async function request(
      endpoint: string,
      body?: unknown,
      options: { origin?: string; authenticated?: boolean } = {},
    ) {
      const response = await fetch(origin + "/api/admin/" + endpoint, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: options.origin ?? origin,
          Cookie: options.authenticated === false ? "" : cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { response, body: await response.json() };
    }
    try {
      await start();
      assert.equal((await request("state")).response.status, 401);
      assert.equal(
        (await request("mutate", { action: "deleteCategory", id: "x" }))
          .response.status,
        401,
      );
      assert.equal(
        (await request("uploads/sign", { categoryId: "x" })).response.status,
        401,
      );
      assert.equal(
        (
          await request(
            "login",
            { username, password },
            { origin: "https://evil.example" },
          )
        ).response.status,
        403,
      );
      assert.equal(
        (await request("login", { username, password: "wrong" })).response
          .status,
        401,
      );
      const loggedIn = await request("login", { username, password });
      assert.equal(loggedIn.response.status, 200);
      const setCookie = loggedIn.response.headers.get("set-cookie")!;
      for (const flag of [
        "HttpOnly",
        "Secure",
        "SameSite=lax",
        "Max-Age=86400",
      ])
        assert.ok(setCookie.toLowerCase().includes(flag.toLowerCase()));
      cookie = setCookie.split(";")[0];
      assert.equal((await request("state")).response.status, 200);
      assert.equal(
        (
          await request("mutate", {
            action: "createCategory",
            slug: "admin",
            name: "Invalid",
            title: "Invalid",
            intro: "",
            masonry: false,
          })
        ).response.status,
        400,
      );
      assert.equal(
        (
          await request("mutate", {
            action: "createCategory",
            slug: "http-gallery",
            name: "HTTP Gallery",
            title: "HTTP Gallery",
            intro: "Intro",
            masonry: true,
          })
        ).response.status,
        200,
      );
      let state = (await request("state")).body;
      const id = state.categories[0].id;
      assert.ok(
        !(await (await fetch(origin)).text()).includes("HTTP Gallery"),
        "empty categories hidden",
      );
      assert.equal(
        (await request("uploads/sign", { categoryId: id })).response.status,
        200,
      );
      await client.execute({
        sql: "INSERT INTO photos VALUES ('http-photo', ?, '/images/Portrait/eli%201.jpg', 'test/http-photo', 'HTTP Test Photo', 2848, 4272, 0)",
        args: [id],
      });
      assert.equal(
        (
          await request("mutate", {
            action: "setCover",
            id,
            photoId: "http-photo",
          })
        ).response.status,
        200,
      );
      assert.ok((await (await fetch(origin)).text()).includes("HTTP Gallery"));
      assert.ok(
        (await (await fetch(origin + "/http-gallery")).text()).includes(
          "HTTP Test Photo",
        ),
      );
      assert.ok(
        (await (await fetch(origin + "/sitemap.xml")).text()).includes(
          "/http-gallery",
        ),
      );
      const redirect = await fetch(origin + "/ritratti.html", {
        redirect: "manual",
      });
      assert.equal(redirect.status, 308);
      assert.ok(redirect.headers.get("location")?.endsWith("/ritratti"));
      assert.equal(
        (await request("mutate", { action: "deleteCategory", id })).response
          .status,
        409,
      );
      assert.equal(
        (
          await request("mutate", {
            action: "updatePhoto",
            id: "http-photo",
            alt: "Updated photo",
          })
        ).response.status,
        200,
      );
      assert.ok(
        (await (await fetch(origin + "/http-gallery")).text()).includes(
          "Updated photo",
        ),
      );
      await stop();
      await start();
      state = (await request("state")).body;
      assert.equal(state.categories[0].images[0].alt, "Updated photo");
      assert.equal((await request("logout", {})).response.status, 200);
      assert.equal((await request("state")).response.status, 401);
      const secondLogin = await request("login", { username, password });
      cookie = secondLogin.response.headers.get("set-cookie")!.split(";")[0];
      await client.execute("UPDATE sessions SET expires_at = 0");
      assert.equal((await request("state")).response.status, 401);
      for (let i = 0; i < 5; i++)
        assert.equal(
          (await request("login", { username, password: "wrong" })).response
            .status,
          401,
        );
      assert.equal(
        (await request("login", { username, password })).response.status,
        429,
      );
      const robots = await (await fetch(origin + "/robots.txt")).text();
      assert.ok(robots.includes("Disallow: /admin"));
      const admin = await fetch(origin + "/admin");
      assert.ok(admin.headers.get("x-robots-tag")?.includes("noindex"));
    } finally {
      await stop();
      client.close();
      await rm(directory, { recursive: true, force: true });
    }
  },
);
