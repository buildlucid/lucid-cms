import { randomUUID } from "node:crypto";
import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	createDocument,
	listDocumentIds,
	readDocument,
} from "#shared/documents";

const marked = (title: string, marker: string) => ({
	fields: [
		{ key: "title", type: "text", value: title },
		{ key: "text", type: "text", value: marker },
	],
});

describe("deleting documents", () => {
	requires(`collection:${STORY_KEY}`);

	test("moves a document to the bin and restores it with its content", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const marker = randomUUID();
		const mine = { "filter[fields.text]": marker };
		const id = await createDocument(admin, STORY_KEY, marked("Binned", marker));

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
		});

		expect(deleted.status).toBe(204);
		expect((await readDocument(admin, STORY_KEY, id)).isDeleted).toBe(true);
		expect(
			await listDocumentIds(admin, STORY_KEY, {
				...mine,
				"filter[isDeleted]": 0,
			}),
		).toEqual([]);
		expect(
			await listDocumentIds(admin, STORY_KEY, {
				...mine,
				"filter[isDeleted]": 1,
			}),
		).toEqual([id]);

		const restored = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/restore`,
			body: { ids: [id] },
		});

		expect(restored.status).toBe(204);
		const read = await readDocument(admin, STORY_KEY, id);
		expect(read.isDeleted).toBe(false);
		expect(read.fields.title).toBe("Binned");
	});

	test("deletes a binned document for good", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, marked("Gone", "gone"));
		const permanently = () =>
			admin.request({
				method: "DELETE",
				path: `/api/v1/documents/${STORY_KEY}/${id}/permanent`,
			});

		await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
		});
		expect((await permanently()).status).toBe(204);

		const read = await admin.request({
			path: `/api/v1/documents/${STORY_KEY}/${id}/latest`,
		});
		expect(read.status).toBe(404);
	});

	test("bins, restores and deletes several documents at once", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const marker = randomUUID();
		const mine = { "filter[fields.text]": marker };
		const ids = await Promise.all(
			["A", "B", "C"].map((title) =>
				createDocument(admin, STORY_KEY, marked(title, marker)),
			),
		);
		const [kept, ...binned] = ids.toSorted((a, b) => a - b);
		const bulk = (method: "DELETE" | "POST", path: string) =>
			admin.request({
				method,
				path: `/api/v1/documents/${STORY_KEY}${path}`,
				body: { ids: binned },
			});

		expect((await bulk("DELETE", "")).status).toBe(204);
		expect(
			await listDocumentIds(admin, STORY_KEY, {
				...mine,
				"filter[isDeleted]": 0,
			}),
		).toEqual([kept]);

		expect((await bulk("POST", "/restore")).status).toBe(204);
		expect(
			(
				await listDocumentIds(admin, STORY_KEY, {
					...mine,
					"filter[isDeleted]": 0,
				})
			).toSorted((a, b) => a - b),
		).toEqual([kept, ...binned]);

		await bulk("DELETE", "");
		expect((await bulk("DELETE", "/permanent")).status).toBe(204);
		expect(await listDocumentIds(admin, STORY_KEY, mine)).toEqual([kept]);
	});

	test("clears relations to a document that is moved to the bin", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pageId = await createDocument(admin, "page", {
			fields: [{ key: "title", type: "text", value: "Related" }],
		});
		const relation = [{ id: pageId, collectionKey: "page" }];
		const id = await createDocument(admin, STORY_KEY, {
			fields: [
				{ key: "title", type: "text", value: "Relates" },
				{ key: "relation", type: "relation", value: relation },
				{ key: "relation_many", type: "relation", value: relation },
				{
					key: "items",
					type: "repeater",
					groups: [
						{
							ref: "item",
							order: 0,
							fields: [{ key: "item_title", type: "text", value: "Stays" }],
						},
					],
				},
			],
		});
		expect((await readDocument(admin, STORY_KEY, id)).fields).toMatchObject({
			relation,
			relation_many: relation,
		});

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/page/${pageId}`,
		});

		expect(deleted.status).toBe(204);
		expect((await readDocument(admin, STORY_KEY, id)).fields).toMatchObject({
			title: "Relates",
			relation: [],
			relation_many: [],
			items: [{ item_title: "Stays" }],
		});
	});
});

describe("single-document collections", () => {
	requires("collection:settings");

	test("never holds a second document", async ({ lucid }) => {
		const admin = await lucid.admin();
		const create = () =>
			admin.request({
				method: "POST",
				path: "/api/v1/documents/settings",
				body: { fields: [{ key: "siteName", type: "text", value: "Site" }] },
			});

		//* another test file may have made the one document on a shared database
		const first = await create();
		expect([201, 400]).toContain(first.status);
		expect((await create()).status).toBe(400);
		expect(await listDocumentIds(admin, "settings")).toHaveLength(1);
	});
});
