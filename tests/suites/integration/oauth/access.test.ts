import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument } from "#shared/documents";
import {
	callContent,
	connectClient,
	createOAuthClient,
	oauthResources,
} from "#shared/oauth";
import { setRolePermissions } from "#shared/permissions";

const READ_STORIES = `documents:${STORY_KEY}:read`;
const STORIES_PATH = `documents/${STORY_KEY}?version=latest`;

/** Connects a new public client for a person, with the scopes asked for. */
const connectFor = async (
	lucid: Lucid,
	person: Awaited<ReturnType<Lucid["user"]>>,
	scope: string,
	principalType: "user" | "system" = "user",
) =>
	connectClient(lucid, {
		person: person.session,
		client: await createOAuthClient(await lucid.admin()),
		scope,
		principalType,
	});

describe("calling the content API with an OAuth token", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("reads what the person can read, as long as they still can", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Over OAuth" }],
		});
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const tokens = await connectFor(lucid, person, READ_STORIES);
		const read = () =>
			callContent(
				lucid,
				tokens.access_token,
				`document/${STORY_KEY}?filter[id]=${id}&version=latest`,
			);

		expect((await read()).status).toBe(200);

		await setRolePermissions(admin, person.roleId ?? 0, []);
		expect((await read()).status).toBe(403);

		await setRolePermissions(admin, person.roleId ?? 0, [READ_STORIES]);
		expect((await read()).status).toBe(200);
	});

	test("never gains scopes the person was given after allowing it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const tokens = await connectFor(
			lucid,
			person,
			`${READ_STORIES} media:read`,
		);
		expect(tokens.scope).toBe(READ_STORIES);

		await setRolePermissions(admin, person.roleId ?? 0, [
			READ_STORIES,
			"media:read",
		]);
		const media = await callContent(lucid, tokens.access_token, "media");

		expect(media.status).toBe(403);
		expect(media.headers.get("www-authenticate")).toContain(
			'error="insufficient_scope"',
		);
		expect(media.headers.get("www-authenticate")).toContain(
			'scope="media:read"',
		);
	});

	test("stops working when the person is locked", async ({ lucid }) => {
		const admin = await lucid.admin();
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const tokens = await connectFor(lucid, person, READ_STORIES);

		const locked = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${person.id}`,
			body: { isLocked: true },
		});
		expect(locked.status).toBe(204);

		expect(
			(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
		).toBe(401);
	});

	test("answers the account route for the person, and not for site connections", async ({
		lucid,
	}) => {
		const person = await lucid.user({
			permissions: ["integrations:create", READ_STORIES],
		});
		const personal = await connectFor(lucid, person, "account:read");
		const site = await connectFor(lucid, person, READ_STORIES, "system");

		const asPerson = await callContent(lucid, personal.access_token, "account");
		const asSite = await callContent(lucid, site.access_token, "account");

		expect(asPerson.status).toBe(200);
		expect(asPerson.body).toMatchObject({ data: { id: person.id } });
		expect(asSite.status).toBe(403);
	});

	test("site connections keep their scopes when the person who made them loses theirs", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const person = await lucid.user({ permissions: ["integrations:create"] });
		const site = await connectFor(lucid, person, READ_STORIES, "system");

		await setRolePermissions(admin, person.roleId ?? 0, []);

		expect(
			(await callContent(lucid, site.access_token, STORIES_PATH)).status,
		).toBe(200);
	});

	test("refuses a missing, altered or wrongly addressed token, and says where to sign in", async ({
		lucid,
	}) => {
		const person = await lucid.user({ permissions: [READ_STORIES] });
		const tokens = await connectFor(lucid, person, READ_STORIES);
		const { content } = await oauthResources(lucid);
		const [header = "", payload = "", signature = ""] =
			tokens.access_token.split(".");
		const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
		const widened = Buffer.from(
			JSON.stringify({ ...claims, scope: `${claims.scope} media:read` }),
		).toString("base64url");

		const missing = await lucid
			.session()
			.fetch(`/api/v1/content/${STORIES_PATH}`);
		const altered = await callContent(
			lucid,
			`${header}.${widened}.${signature}`,
			"media",
		);

		expect(missing.status).toBe(401);
		expect(missing.headers.get("www-authenticate")).toBe(
			`Bearer resource_metadata="${new URL(lucid.url).origin}/.well-known/oauth-protected-resource${new URL(content).pathname}"`,
		);
		expect(altered.status).toBe(401);
		expect(altered.headers.get("www-authenticate")).toContain(
			'error="invalid_token"',
		);
	});

	describe("meant for the MCP server", () => {
		requires("feature:mcp");

		test("isn't accepted by the content API", async ({ lucid }) => {
			const person = await lucid.user({ permissions: [READ_STORIES] });
			const tokens = await connectClient(lucid, {
				person: person.session,
				client: await createOAuthClient(await lucid.admin()),
				scope: `mcp:access ${READ_STORIES}`,
				resource: (await oauthResources(lucid)).mcp,
			});

			expect(
				(await callContent(lucid, tokens.access_token, STORIES_PATH)).status,
			).toBe(401);
		});
	});
});
