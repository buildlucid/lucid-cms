import { describe, expect, test, vi } from "vitest";
import type { PublicFetch } from "../../../libs/runtime/types.js";
import {
	fetchOAuthClientMetadata,
	matchesOAuthRedirectUri,
} from "./client-metadata.js";

test("client metadata is only fetched through the runtime's guarded fetch", async () => {
	const clientId = "https://client.example/metadata.json";
	const fetchPublic = vi.fn<PublicFetch>(async () =>
		Response.json({
			client_id: clientId,
			client_name: "Client",
			redirect_uris: ["https://client.example/callback"],
		}),
	);

	const withoutGuard = await fetchOAuthClientMetadata(clientId, {});
	expect(withoutGuard.error?.code).toBe("invalid_client");

	const res = await fetchOAuthClientMetadata(clientId, { fetchPublic });
	expect(res.data?.client_name).toBe("Client");
	expect(fetchPublic).toHaveBeenCalledOnce();
});

describe("OAuth redirect URI matching", () => {
	test("allows a native client to choose its loopback port", () => {
		expect(
			matchesOAuthRedirectUri(
				"http://127.0.0.1/callback",
				"http://127.0.0.1:52368/callback",
			),
		).toBe(true);
		expect(
			matchesOAuthRedirectUri(
				"http://localhost/callback?client=codex",
				"http://localhost:52368/callback?client=codex",
			),
		).toBe(true);
	});

	test("keeps every other callback component exact", () => {
		const registered = "http://127.0.0.1/callback?client=codex";
		for (const requested of [
			"http://localhost:52368/callback?client=codex",
			"http://127.0.0.1:52368/other?client=codex",
			"http://127.0.0.1:52368/other/../callback?client=codex",
			"http://127.0.0.1:52368/callback?client=other",
			"http://127.0.0.1:52368/callback?client=codex#fragment",
			"http://user@127.0.0.1:52368/callback?client=codex",
			"https://127.0.0.1:52368/callback?client=codex",
		]) {
			expect(matchesOAuthRedirectUri(registered, requested)).toBe(false);
		}
	});

	test("requires exact matching for non-loopback callbacks", () => {
		expect(
			matchesOAuthRedirectUri(
				"https://example.com/callback",
				"https://example.com/callback",
			),
		).toBe(true);
		expect(
			matchesOAuthRedirectUri(
				"https://example.com/callback",
				"https://example.com:8443/callback",
			),
		).toBe(false);
	});
});
