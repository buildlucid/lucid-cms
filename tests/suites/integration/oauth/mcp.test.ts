import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { createDocument } from "#shared/helpers/documents";
import {
	connectClient,
	createOAuthClient,
	OAUTH_PATHS,
	oauthResources,
} from "#shared/helpers/oauth";

const READ_STORIES = `documents:${STORY_KEY}:read`;

type RpcBody = {
	result?: {
		tools?: Array<{ name: string }>;
		content?: unknown;
		isError?: boolean;
	};
};

/** Sends one JSON-RPC call to the MCP endpoint with a bearer token, as an MCP client would. */
const rpc = async (
	lucid: Lucid,
	token: string | null,
	method: string,
	params: Record<string, unknown> = {},
) => {
	const response = await lucid.session().fetch("/mcp", {
		method: "POST",
		headers: {
			accept: "application/json, text/event-stream",
			"content-type": "application/json",
			"mcp-protocol-version": "2025-06-18",
			...(token ? { authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	const text = await response.text();
	const json = response.headers.get("content-type")?.includes("event-stream")
		? text
				.split("\n")
				.find((line) => line.startsWith("data:"))
				?.slice("data:".length)
		: text;
	return {
		status: response.status,
		challenge: response.headers.get("www-authenticate"),
		body: (json ? JSON.parse(json) : null) as RpcBody | null,
	};
};

/** Connects an MCP client for a new person who can read stories, with the scopes asked for. */
const connectMcp = async (lucid: Lucid, scope: string) => {
	const person = await lucid.user({ permissions: [READ_STORIES] });
	return connectClient(lucid, {
		person: person.session,
		client: await createOAuthClient(await lucid.admin()),
		scope,
		resource: (await oauthResources(lucid)).mcp,
	});
};

describe("the MCP server with OAuth", () => {
	requires("feature:mcp", "harness:outbox", `collection:${STORY_KEY}`);

	test("tells a client without a token where to sign in", async ({ lucid }) => {
		const answer = await rpc(lucid, null, "tools/list");

		expect(answer.status).toBe(401);
		expect(answer.challenge).toBe(
			`Bearer resource_metadata="${new URL(lucid.url).origin}${OAUTH_PATHS.mcpMetadata}", scope="mcp:access"`,
		);
	});

	test("works with a token meant for it", async ({ lucid }) => {
		const tokens = await connectMcp(lucid, "mcp:access");

		const listed = await rpc(lucid, tokens.access_token, "tools/list");
		const called = await rpc(lucid, tokens.access_token, "tools/call", {
			name: "harness_echo",
			arguments: { message: "over OAuth" },
		});

		expect(listed.body?.result?.tools?.map((tool) => tool.name)).toContain(
			"harness_echo",
		);
		expect(JSON.stringify(called.body?.result?.content)).toContain(
			"over OAuth",
		);
	});

	test("refuses a token meant for the content API", async ({ lucid }) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const tokens = await connectClient(lucid, {
			person: person.session,
			client: await createOAuthClient(await lucid.admin()),
			scope: "mcp:access",
		});

		const answer = await rpc(lucid, tokens.access_token, "tools/list");

		expect(answer.status).toBe(401);
		expect(answer.challenge).toContain('error="invalid_token"');
	});

	test("asks for the scope a client is missing", async ({ lucid }) => {
		const withoutAccess = await connectMcp(lucid, READ_STORIES);
		const withAccess = await connectMcp(lucid, "mcp:access");
		const documentId = await createDocument(await lucid.admin(), STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "MCP over OAuth" }],
		});

		const refused = await rpc(lucid, withoutAccess.access_token, "tools/list");
		const tool = await rpc(lucid, withAccess.access_token, "tools/call", {
			name: "documents_get",
			arguments: { collectionKey: STORY_KEY, documentId },
		});

		expect(refused.status).toBe(403);
		expect(refused.challenge).toContain('error="insufficient_scope"');
		expect(refused.challenge).toContain('scope="mcp:access"');
		expect(tool.status).toBe(403);
		expect(tool.challenge).toContain('error="insufficient_scope"');
		//* the challenge names every scope the call needs, not just the missing one
		expect(tool.challenge).toContain(`scope="mcp:access ${READ_STORIES}"`);
	});
});
