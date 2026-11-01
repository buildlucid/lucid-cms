import { Hono } from "hono";
import { expect, test } from "vitest";
import type { HttpProxyConfig } from "../../../types/config.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import getClientAddress from "./get-client-address.js";

/** Resolves the address for a request that reached Lucid's server from `10.0.0.1`. */
const addressFor = async (
	proxy: HttpProxyConfig | undefined,
	headers: Record<string, string>,
) => {
	const app = new Hono();
	app.get("/", (c) => {
		c.set("config", { http: { security: { proxy } } });
		c.set("runtimeContext", {
			getConnectionInfo: () => ({ address: "10.0.0.1" }),
		});
		return c.text(getClientAddress(c as unknown as LucidHonoContext) ?? "");
	});
	return (await app.request("http://localhost/", { headers })).text();
};

test.each([
	{
		name: "forwarding headers are ignored without a proxy setting",
		proxy: undefined,
		headers: { "x-forwarded-for": "203.0.113.5" },
		expected: "10.0.0.1",
	},
	{
		name: "one hop reads the entry the proxy added, not the visitor's own",
		proxy: { hops: 1 },
		headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.5" },
		expected: "203.0.113.5",
	},
	{
		name: "two hops skip the second proxy's entry",
		proxy: { hops: 2 },
		headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.5, 10.0.0.2" },
		expected: "203.0.113.5",
	},
	{
		name: "too few entries fall back to the connection",
		proxy: { hops: 2 },
		headers: { "x-forwarded-for": "203.0.113.5" },
		expected: "10.0.0.1",
	},
	{
		name: "a platform header is read as set",
		proxy: { header: "fly-client-ip" },
		headers: { "fly-client-ip": "203.0.113.5" },
		expected: "203.0.113.5",
	},
	{
		name: "a value that isn't an address falls back to the connection",
		proxy: { header: "fly-client-ip" },
		headers: { "fly-client-ip": "unknown" },
		expected: "10.0.0.1",
	},
] satisfies Array<{
	name: string;
	proxy: HttpProxyConfig | undefined;
	headers: Record<string, string>;
	expected: string;
}>)("$name", async ({ proxy, headers, expected }) => {
	expect(await addressFor(proxy, headers)).toBe(expected);
});
