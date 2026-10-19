import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/[...path]/route";
import { db } from "../src/lib/db";
test("public keep-awake requests never wake the database or drain jobs", async () => {
  const original = db.$queryRaw;
  let calls = 0;
  db.$queryRaw = () => {
    calls++;
    throw new Error("The sleeping database must not be touched");
  };
  try {
    const response = await GET(
      new NextRequest("https://trove.test/api/health"),
      { params: Promise.resolve({ path: ["health"] }) },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      environment: "sandbox",
    });
    assert.equal(calls, 0);
  } finally {
    db.$queryRaw = original;
    await db.$disconnect();
  }
});
