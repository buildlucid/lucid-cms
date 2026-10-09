import { Hono } from "hono";
import { describe, expect, test } from "vitest";
import noIndex from "./no-index.js";

describe("noIndex", () => {
	const app = new Hono().use(noIndex).get("*", () => new Response("ok"));

	test.each([
		["/lucid", "noindex, nofollow"],
		["/lucid/agent/chats/1", "noindex, nofollow"],
		["/lucid/api/v1/documents", "noindex, nofollow"],
		["/lucid/cdn/image.png", null],
		["/lucidity", null],
		["/about", null],
	])("%s", async (path, expected) => {
		const res = await app.request(path);
		expect(res.headers.get("X-Robots-Tag")).toBe(expected);
	});
});
