import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import fetchPublic from "./fetch-public.js";

//* a local server stands in for the internet, so the test decides which addresses count as public
const publicAddresses = new Set<string>();
vi.mock("@lucidcms/core/runtime", () => ({
	isPublicAddress: (address: string) => publicAddresses.has(address),
}));

let requests = 0;
let port: number;
const server = http.createServer((request, response) => {
	requests += 1;
	if (request.url === "/moved") {
		response.writeHead(302, { Location: "/" }).end();
		return;
	}
	response
		.writeHead(200, { "Content-Type": "application/json" })
		.end('{"ok":true}');
});

beforeAll(async () => {
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	port = (server.address() as AddressInfo).port;
});
afterAll(() => {
	server.close();
});
beforeEach(() => {
	requests = 0;
	publicAddresses.clear();
});

test("refuses hosts and addresses that aren't public before connecting", async () => {
	for (const url of [
		`http://localhost:${port}/`,
		`http://127.0.0.1:${port}/`,
		`http://[::ffff:127.0.0.1]:${port}/`,
	]) {
		await expect(fetchPublic(new URL(url))).rejects.toThrow();
	}
	expect(requests).toBe(0);
});

test("returns public responses, leaving redirects unfollowed", async () => {
	publicAddresses.add("127.0.0.1");

	const response = await fetchPublic(new URL(`http://127.0.0.1:${port}/`));
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toBe("application/json");
	expect(await response.json()).toEqual({ ok: true });

	const moved = await fetchPublic(new URL(`http://127.0.0.1:${port}/moved`));
	expect(moved.status).toBe(302);
	expect(moved.headers.get("location")).toBe("/");
	expect(requests).toBe(2);
});
