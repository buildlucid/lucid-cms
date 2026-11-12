import { randomUUID } from "node:crypto";
import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	type ContentDocument,
	createContentReader,
	createDocument,
	createStoryTargets,
	fullStory,
	publishDocument,
	readContent,
	saveDocument,
	valuesOf,
} from "#shared/helpers/documents";

const titled = (title: string, marker = "unmarked") => ({
	fields: [
		{ key: "title", type: "text", value: title },
		{ key: "text", type: "text", value: marker },
	],
});

describe("reading documents through the content API", () => {
	requires(`collection:${STORY_KEY}`);

	test("needs an API key that can read the collection", async ({ lucid }) => {
		const admin = await lucid.admin();
		const readPages = await createContentReader(admin, lucid.session, ["page"]);

		const withoutKey = await lucid.session().request({
			path: `/api/v1/content/documents/${STORY_KEY}`,
			query: { version: "staging" },
		});
		const withAdminSession = await admin.request({
			path: `/api/v1/content/documents/${STORY_KEY}`,
			query: { version: "staging" },
		});
		const withOtherScope = await readPages(`documents/${STORY_KEY}`, {
			version: "staging",
		});

		expect(withoutKey.status).toBe(401);
		expect(withAdminSession.status).toBe(401);
		expect(withOtherScope.status).toBe(403);
	});

	test("returns published content with plain values, bricks and related documents", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session, [
			STORY_KEY,
			"page",
		]);
		const targets = await createStoryTargets(admin);
		const story = fullStory({ title: "Published", ...targets });
		const id = await createDocument(admin, STORY_KEY, story);
		await publishDocument(admin, STORY_KEY, id, "staging");

		const content = await readContent(read, STORY_KEY, id, "staging");

		const sent = valuesOf(story);
		expect(content).toMatchObject({
			id,
			fields: {
				...sent.fields,
				//* references are filled in, so a website needs no second request
				user: [{ id: targets.userId }],
				relation: [{ id: targets.pageId, fields: { title: "Related page" } }],
			},
			bricks: sent.bricks,
			fixed: {
				"story-seo": { fields: sent.fixed["story-seo"] },
			},
		});
		expect(JSON.stringify(content)).not.toContain("admin@harness.test");
	});

	test("returns what an environment holds, not later drafts", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session);
		const id = await createDocument(admin, STORY_KEY, titled("Unpublished"));

		expect(await readContent(read, STORY_KEY, id, "staging")).toBeNull();

		await publishDocument(admin, STORY_KEY, id, "staging");
		await saveDocument(admin, STORY_KEY, id, titled("Draft"));

		expect(
			(await readContent(read, STORY_KEY, id, "staging"))?.fields.title,
		).toBe("Unpublished");
		expect(await readContent(read, STORY_KEY, id, "production")).toBeNull();
	});

	test("lists only the documents an environment holds", async ({ lucid }) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session);
		const marker = randomUUID();
		const published = await createDocument(
			admin,
			STORY_KEY,
			titled("Listed", marker),
		);
		await createDocument(admin, STORY_KEY, titled("Not listed", marker));
		await publishDocument(admin, STORY_KEY, published, "staging");

		const listed = await read<{
			data: ContentDocument[];
			pagination: { total: number };
		}>(`documents/${STORY_KEY}`, {
			version: "staging",
			"filter[fields.text]": marker,
		});

		expect(listed.status).toBe(200);
		expect(listed.body.pagination.total).toBe(1);
		expect(listed.body.data.map((document) => document.id)).toEqual([
			published,
		]);
	});

	test("leaves out related documents the API key cannot read", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const readStories = await createContentReader(admin, lucid.session);
		const targets = await createStoryTargets(admin);
		const id = await createDocument(
			admin,
			STORY_KEY,
			fullStory({ title: "Relates to a page", ...targets }),
		);
		await publishDocument(admin, STORY_KEY, id, "staging");

		const content = await readContent(readStories, STORY_KEY, id, "staging");

		expect(content?.fields).toMatchObject({
			title: "Relates to a page",
			relation: [],
		});
	});

	test("refuses to filter through a relation into a collection the API key cannot read", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const readStories = await createContentReader(admin, lucid.session);

		const filtered = await readStories(`documents/${STORY_KEY}`, {
			version: "staging",
			"filter[fields.relation.page.fields.title]": "Related page",
		});

		expect(filtered.status).toBe(403);
	});

	test("never returns a revision", async ({ lucid }) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session);

		const revisions = await read(`documents/${STORY_KEY}`, {
			version: "revision",
		});

		expect(revisions.status).toBe(400);
	});
});

describe("cached content API responses", () => {
	//* responses are only cached when the setup has a KV store
	requires(`collection:${STORY_KEY}`, "plugin:sqlite-kv");

	describe("on a CMS of its own", () => {
		//* on a shared server, other files' publishes clear the collection's cache between reads
		requires("mode:host");

		test("serves a repeated read from the cache until the document is published again", async ({
			lucid,
		}) => {
			const admin = await lucid.admin();
			const read = await createContentReader(admin, lucid.session);
			const id = await createDocument(admin, STORY_KEY, titled("First"));
			await publishDocument(admin, STORY_KEY, id, "staging");
			const readStaging = () =>
				read<{ data: ContentDocument }>(`document/${STORY_KEY}`, {
					version: "staging",
					"filter[id]": id,
				});

			expect((await readStaging()).headers.get("x-cache")).toBe("MISS");
			expect((await readStaging()).headers.get("x-cache")).toBe("HIT");

			await saveDocument(admin, STORY_KEY, id, titled("Second"));
			await publishDocument(admin, STORY_KEY, id, "staging");

			expect((await readStaging()).body.data.fields.title).toBe("Second");
		});
	});

	test("drops a document from cached reads when it is unpublished or binned", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session);
		const marker = randomUUID();
		const [unpublished, binned] = await Promise.all(
			["Unpublished", "Binned"].map(async (title) => {
				const id = await createDocument(
					admin,
					STORY_KEY,
					titled(title, marker),
				);
				await publishDocument(admin, STORY_KEY, id, "staging");
				return id;
			}),
		);
		const listed = async () => {
			const response = await read<{ data: ContentDocument[] }>(
				`documents/${STORY_KEY}`,
				{ version: "staging", "filter[fields.text]": marker },
			);
			return response.body.data.map((document) => document.id);
		};
		expect((await listed()).toSorted()).toEqual(
			[unpublished, binned].toSorted(),
		);
		expect(
			await readContent(read, STORY_KEY, binned as number, "staging"),
		).not.toBeNull();

		await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${unpublished}/unpublish`,
			body: { environment: "staging" },
		});
		expect(await listed()).toEqual([binned]);

		await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${STORY_KEY}/${binned}`,
		});
		expect(await listed()).toEqual([]);
		expect(
			await readContent(read, STORY_KEY, binned as number, "staging"),
		).toBeNull();
	});
});
