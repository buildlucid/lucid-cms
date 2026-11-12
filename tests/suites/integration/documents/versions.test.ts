import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	createDocument,
	readDocument,
	saveDocument,
	titled,
} from "#shared/helpers/documents";

/** Lists a story's revisions, newest first. */
const listRevisions = async (admin: Session, id: number) => {
	const revisions = await admin.request<{
		data: Array<{ id: number; contentId: string }>;
	}>({
		path: `/api/v1/documents/${STORY_KEY}/${id}/revisions`,
		query: { sort: "-createdAt", perPage: 50 },
	});
	expect(revisions.status).toBe(200);
	return revisions.body.data;
};

describe("document versions", () => {
	requires(`collection:${STORY_KEY}`);

	test("keeps the content each save replaces as a revision", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("First"));
		const first = await readDocument(admin, STORY_KEY, id);

		await saveDocument(admin, STORY_KEY, id, titled("Second"));
		await saveDocument(admin, STORY_KEY, id, titled("Third"));

		const revisions = await listRevisions(admin, id);
		expect(revisions).toHaveLength(2);
		expect(revisions.map((revision) => revision.contentId)).toContain(
			first.contentId,
		);

		const titles = await Promise.all(
			revisions.map(
				async (revision) =>
					(await readDocument(admin, STORY_KEY, id, revision.id)).fields.title,
			),
		);
		expect(titles.toSorted()).toEqual(["First", "Second"]);
		expect((await readDocument(admin, STORY_KEY, id)).fields.title).toBe(
			"Third",
		);
	});

	test("restores a revision and keeps what it replaced", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Original"));
		await saveDocument(admin, STORY_KEY, id, titled("Rewritten"));
		const [original] = await listRevisions(admin, id);

		const restored = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}/${original?.id}/restore-revision`,
		});

		expect(restored.status).toBe(204);
		expect((await readDocument(admin, STORY_KEY, id)).fields.title).toBe(
			"Original",
		);

		const titles = await Promise.all(
			(await listRevisions(admin, id)).map(
				async (revision) =>
					(await readDocument(admin, STORY_KEY, id, revision.id)).fields.title,
			),
		);
		expect(titles).toContain("Rewritten");
	});

	test("refuses a save based on content that has changed since", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Opened"));
		const opened = await readDocument(admin, STORY_KEY, id);
		await saveDocument(admin, STORY_KEY, id, titled("Saved by someone else"));

		const stale = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
			body: { ...titled("Stale"), baseContentId: opened.contentId },
		});

		expect(stale.status).toBe(409);
		expect((await readDocument(admin, STORY_KEY, id)).fields.title).toBe(
			"Saved by someone else",
		);
	});

	test("accepts a save based on the current content", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Opened"));
		const opened = await readDocument(admin, STORY_KEY, id);

		const saved = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
			body: { ...titled("Current"), baseContentId: opened.contentId },
		});

		expect(saved.status).toBe(200);
		const latest = await readDocument(admin, STORY_KEY, id);
		expect(latest.fields.title).toBe("Current");
		expect(latest.contentId).not.toBe(opened.contentId);
	});

	test("updates a version in place without adding a revision, as auto save does", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Typed"));
		const opened = await readDocument(admin, STORY_KEY, id);

		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/documents/${STORY_KEY}/${id}/${opened.versionId}`,
			body: { ...titled("Typed more"), baseContentId: opened.contentId },
		});
		const stale = await admin.request({
			method: "PATCH",
			path: `/api/v1/documents/${STORY_KEY}/${id}/${opened.versionId}`,
			body: { ...titled("Stale"), baseContentId: opened.contentId },
		});

		expect(updated.status).toBe(200);
		expect(stale.status).toBe(409);
		const latest = await readDocument(admin, STORY_KEY, id);
		expect(latest.fields.title).toBe("Typed more");
		expect(latest.versionId).toBe(opened.versionId);
		expect(await listRevisions(admin, id)).toEqual([]);
	});
});
