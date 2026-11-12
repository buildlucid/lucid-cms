import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { OAUTH_PATHS } from "#shared/helpers/oauth";

type ServerMetadata = {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	revocation_endpoint: string;
	scopes_supported: string[];
	code_challenge_methods_supported: string[];
	client_id_metadata_document_supported: boolean;
};

type ResourceMetadata = {
	resource: string;
	authorization_servers: string[];
	scopes_supported: string[];
};

describe("OAuth discovery", () => {
	requires(`collection:${STORY_KEY}`);

	test("points clients at endpoints the CMS serves", async ({ lucid }) => {
		const visitor = lucid.session();
		const metadata = (await (
			await visitor.fetch(OAUTH_PATHS.serverMetadata)
		).json()) as ServerMetadata;
		const origin = new URL(lucid.url).origin;

		expect(metadata).toMatchObject({
			issuer: origin,
			authorization_endpoint: `${origin}${OAUTH_PATHS.authorize}`,
			token_endpoint: `${origin}${OAUTH_PATHS.token}`,
			revocation_endpoint: `${origin}${OAUTH_PATHS.revoke}`,
			code_challenge_methods_supported: ["S256"],
			client_id_metadata_document_supported: true,
		});
		expect(metadata.scopes_supported).toContain(`documents:${STORY_KEY}:read`);
		//* an empty token request is refused as a bad request, which only the real endpoint does
		const token = await visitor.fetch(
			new URL(metadata.token_endpoint).pathname,
			{
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
			},
		);
		expect(token.status).toBe(400);
		expect(await token.json()).toMatchObject({ error: "invalid_request" });
	});

	test("describes the content API at both well-known addresses", async ({
		lucid,
	}) => {
		const visitor = lucid.session();
		const read = async (path: string) =>
			(await (await visitor.fetch(path)).json()) as ResourceMetadata;

		const atRoot = await read(OAUTH_PATHS.contentMetadata);
		const beneath = await read(
			"/api/v1/content/.well-known/oauth-protected-resource",
		);

		expect(atRoot).toEqual(beneath);
		expect(atRoot).toMatchObject({
			resource: `${new URL(lucid.url).origin}/api/v1/content`,
			authorization_servers: [new URL(lucid.url).origin],
		});
		expect(atRoot.scopes_supported).not.toContain("mcp:access");
	});

	describe("for the MCP server", () => {
		requires("feature:mcp");

		test("lists only the scopes MCP tools can use", async ({ lucid }) => {
			const visitor = lucid.session();
			const metadata = (await (
				await visitor.fetch(OAUTH_PATHS.mcpMetadata)
			).json()) as ResourceMetadata;
			const beneath = (await (
				await visitor.fetch("/mcp/.well-known/oauth-protected-resource")
			).json()) as ResourceMetadata;

			expect(metadata).toEqual(beneath);
			expect(metadata.resource).toBe(`${new URL(lucid.url).origin}/mcp`);
			const server = (await (
				await visitor.fetch(OAUTH_PATHS.serverMetadata)
			).json()) as ServerMetadata;
			expect(metadata.scopes_supported).toContain("mcp:access");
			expect(
				metadata.scopes_supported.filter(
					(scope) => !server.scopes_supported.includes(scope),
				),
			).toEqual([]);
		});
	});
});
