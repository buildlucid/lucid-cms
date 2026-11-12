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
	type DocumentInput,
	readDocument,
	valuesOf,
} from "#shared/helpers/documents";

/** A story whose every part names the same writer, so a mix of two saves is easy to spot. */
const writtenBy = (writer: string) =>
	({
		fields: [
			{ key: "title", type: "text", value: writer },
			{
				key: "items",
				type: "repeater",
				groups: [0, 1, 2].map((order) => ({
					ref: `item-${order}`,
					order,
					fields: [{ key: "item_title", type: "text", value: writer }],
				})),
			},
		],
		bricks: [
			{
				ref: "hero",
				key: "story-hero",
				order: 0,
				type: "builder",
				fields: [{ key: "heading", type: "text", value: writer }],
			},
		],
	}) satisfies DocumentInput;

const save = (
	admin: Session,
	id: number,
	writer: string,
	baseContentId?: string,
) =>
	admin.request({
		method: "POST",
		path: `/api/v1/documents/${STORY_KEY}/${id}`,
		body: { ...writtenBy(writer), baseContentId },
	});

const countRevisions = async (admin: Session, id: number) => {
	const revisions = await admin.request<{ pagination: { total: number } }>({
		path: `/api/v1/documents/${STORY_KEY}/${id}/revisions`,
	});
	expect(revisions.status).toBe(200);
	return revisions.body.pagination.total;
};

describe("saving a document from several places at once", () => {
	requires(`collection:${STORY_KEY}`);

	test("accepts one of two saves based on the same content, and refuses the other", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, writtenBy("first"));
		const opened = await readDocument(admin, STORY_KEY, id);

		const saves = await Promise.all(
			["left", "right"].map((writer) =>
				save(admin, id, writer, opened.contentId),
			),
		);

		expect(saves.map((saved) => saved.status).toSorted()).toEqual([200, 409]);
		const winner = saves[0]?.status === 200 ? "left" : "right";
		expect(await readDocument(admin, STORY_KEY, id)).toMatchObject(
			valuesOf(writtenBy(winner)),
		);
		expect(await countRevisions(admin, id)).toBe(1);
	});

	test("leaves the whole of one save as latest, and a revision for each of the others", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, writtenBy("first"));
		const writers = ["a", "b", "c", "d", "e", "f"];

		const saves = await Promise.all(
			writers.map((writer) => save(admin, id, writer)),
		);

		expect(saves.map((saved) => saved.status)).toEqual(writers.map(() => 200));
		const latest = await readDocument(admin, STORY_KEY, id);
		expect(writers).toContain(latest.fields.title);
		expect(latest).toMatchObject(
			valuesOf(writtenBy(String(latest.fields.title))),
		);
		expect(await countRevisions(admin, id)).toBe(writers.length);
	});

	test("publishes the whole of one save while the document is being saved", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, writtenBy("first"));
		const writers = ["a", "b", "c"];

		const [published] = await Promise.all([
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${STORY_KEY}/${id}/publish`,
				body: { environment: "staging" },
			}),
			...writers.map((writer) => save(admin, id, writer)),
		]);

		expect(published.status).toBe(204);
		const staging = await readDocument(admin, STORY_KEY, id, "staging");
		expect(["first", ...writers]).toContain(staging.fields.title);
		expect(staging).toMatchObject(
			valuesOf(writtenBy(String(staging.fields.title))),
		);
	});
});

describe("creating a single document from several places at once", () => {
	requires("collection:settings");

	test("leaves one document", async ({ lucid }) => {
		const admin = await lucid.admin();

		await Promise.all(
			[0, 1, 2, 3].map((attempt) =>
				admin.request({
					method: "POST",
					path: "/api/v1/documents/settings",
					body: {
						fields: [
							{ key: "siteName", type: "text", value: `Site ${attempt}` },
						],
					},
				}),
			),
		);

		const listed = await admin.request<{ pagination: { total: number } }>({
			path: "/api/v1/documents/settings/latest",
		});
		expect(listed.body.pagination.total).toBe(1);
	});
});
