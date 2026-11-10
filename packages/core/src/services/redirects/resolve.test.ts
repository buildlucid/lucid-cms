import { describe, expect, test } from "vitest";
import type {
	RedirectResolver,
	ResolvedRedirect,
} from "../../libs/redirects/types.js";
import type { ServiceContext } from "../../utils/services/types.js";
import resolve from "./resolve.js";

/** A resolver answering from a fixed path map. */
const resolverFrom =
	(redirects: Record<string, ResolvedRedirect>): RedirectResolver =>
	async (_context, lookup) => ({
		error: undefined,
		data: redirects[lookup.path] ?? null,
	});

const contextWith = (redirects: RedirectResolver[]) =>
	({ config: { redirects } }) as unknown as ServiceContext;

describe("redirect resolution", () => {
	test("uses the first resolver with an answer", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({}),
				resolverFrom({ "/old": { location: "/new", status: 301 } }),
				resolverFrom({ "/old": { location: "/other", status: 302 } }),
			]),
			{ path: "/old", environment: "latest" },
		);

		expect(result.data).toEqual({ location: "/new", status: 301 });
	});

	test("follows paths on the site to the final address with the first status", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({
					"/a": { location: "/b", status: 302 },
					"/b": { location: "/c", status: 301 },
				}),
			]),
			{ path: "/a", environment: "latest" },
		);

		expect(result.data).toEqual({ location: "/c", status: 302 });
	});

	test("stops at full addresses and query strings", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({
					"/a": { location: "/b?ref=old", status: 301 },
					"/b": { location: "/c", status: 301 },
				}),
			]),
			{ path: "/a", environment: "latest" },
		);

		expect(result.data).toEqual({ location: "/b?ref=old", status: 301 });
	});

	test("returns null for a redirect back to its own path with a query string", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({ "/a": { location: "/a?ref=1", status: 301 } }),
			]),
			{ path: "/a", environment: "latest" },
		);

		expect(result).toEqual({ error: undefined, data: null });
	});

	test("returns null for a redirect back to its own path through dot segments", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({
					"/a": { location: "/x/../a?ref=1", status: 301 },
				}),
			]),
			{ path: "/a", environment: "latest" },
		);

		expect(result).toEqual({ error: undefined, data: null });
	});

	test("returns null for a loop", async () => {
		const result = await resolve(
			contextWith([
				resolverFrom({
					"/a": { location: "/b", status: 301 },
					"/b": { location: "/a", status: 301 },
				}),
			]),
			{ path: "/a", environment: "latest" },
		);

		expect(result).toEqual({ error: undefined, data: null });
	});
});
