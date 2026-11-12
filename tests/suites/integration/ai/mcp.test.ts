import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument } from "#shared/documents";

type RpcResponse = {
	result?: {
		tools?: Array<{ name: string }>;
		content?: Array<{ type: string; text?: string }>;
		isError?: boolean;
	};
	error?: { code: number; message: string };
};

/** Makes a site API key with the scopes, and returns its bearer header value. */
const createKey = async (lucid: Lucid, scopes: string[]) => {
	const created = await (
		await lucid.admin()
	).request<{
		data: { apiKey: string };
	}>({
		method: "POST",
		path: "/api/v1/integrations",
		body: { name: `MCP ${crypto.randomUUID().slice(0, 8)}`, scopes },
	});
	expect(created.status).toBe(201);
	return `Bearer ${created.body.data.apiKey}`;
};

/** Sends one JSON-RPC call to the MCP endpoint, as an MCP client would. */
const rpc = async (
	lucid: Lucid,
	authorization: string | null,
	method: string,
	params: Record<string, unknown> = {},
) => {
	const response = await lucid.session().fetch("/mcp", {
		method: "POST",
		headers: {
			accept: "application/json, text/event-stream",
			"content-type": "application/json",
			"mcp-protocol-version": "2025-06-18",
			...(authorization ? { authorization } : {}),
		},
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
	});
	const text = await response.text();
	//* the server may answer with one server-sent event rather than plain JSON
	const json = response.headers.get("content-type")?.includes("event-stream")
		? text
				.split("\n")
				.find((line) => line.startsWith("data:"))
				?.slice("data:".length)
		: text;
	return {
		status: response.status,
		headers: response.headers,
		body: (json ? JSON.parse(json) : null) as RpcResponse | null,
	};
};

describe("the MCP server", () => {
	requires("feature:mcp");

	test("lists the tools the config serves that the key's scopes reach", async ({
		lucid,
	}) => {
		const names = async (scopes: string[]) =>
			(
				await rpc(lucid, await createKey(lucid, scopes), "tools/list")
			).body?.result?.tools?.map((tool) => tool.name) ?? [];

		const plain = await names(["mcp:access"]);
		expect(plain).toContain("harness_echo");
		expect(plain).not.toContain("media_get");
		expect(await names(["mcp:access", "media:read"])).toContain("media_get");
	});

	test("runs a tool and returns what it gave", async ({ lucid }) => {
		const key = await createKey(lucid, ["mcp:access"]);

		const called = await rpc(lucid, key, "tools/call", {
			name: "harness_echo",
			arguments: { message: "over MCP" },
		});
		expect(called.body?.result?.isError).not.toBe(true);
		expect(JSON.stringify(called.body?.result?.content)).toContain("over MCP");
	});

	test("reads documents only with the collection's scope", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const documentId = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "MCP story" }],
		});
		const find = (key: string) =>
			rpc(lucid, key, "tools/call", {
				name: "documents_get",
				arguments: { collectionKey: STORY_KEY, documentId },
			});

		const without = await find(await createKey(lucid, ["mcp:access"]));
		//* an API key is told the scope it lacks; OAuth clients also get a challenge header
		expect(without.status).toBe(403);
		expect(JSON.stringify(without.body)).toContain(
			`documents:${STORY_KEY}:read`,
		);

		const withScope = await find(
			await createKey(lucid, ["mcp:access", `documents:${STORY_KEY}:read`]),
		);
		expect(withScope.status).toBe(200);
		expect(withScope.body?.result?.isError).not.toBe(true);
		expect(JSON.stringify(withScope.body?.result)).toContain("MCP story");
	});

	test("refuses clients without a key, or with one that lacks MCP access", async ({
		lucid,
	}) => {
		expect((await rpc(lucid, null, "tools/list")).status).toBe(401);
		const key = await createKey(lucid, ["media:read"]);
		expect((await rpc(lucid, key, "tools/list")).status).toBe(403);
	});
});
