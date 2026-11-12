import { randomUUID } from "node:crypto";
import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	createDocument,
	createStoryTargets,
	fullStory,
	listDocumentIds,
	readDocument,
	saveDocument,
	valuesOf,
} from "#shared/helpers/documents";

describe("document content", () => {
	requires(`collection:${STORY_KEY}`);

	test("reads back every field type, nested repeaters and bricks as they were saved", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = fullStory({
			title: "Round trip",
			...(await createStoryTargets(admin)),
		});

		const id = await createDocument(admin, STORY_KEY, story);

		expect(await readDocument(admin, STORY_KEY, id)).toMatchObject(
			valuesOf(story),
		);
	});

	test("fills fields that were not sent with their defaults", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const id = await createDocument(admin, STORY_KEY, {
			fields: [{ key: "title", type: "text", value: "Defaults" }],
		});

		expect(await readDocument(admin, STORY_KEY, id)).toMatchObject({
			fields: {
				text: "Hello",
				number: 7,
				range: [25, 75],
				checkbox: true,
				select: "first",
				relation: [],
				items: [],
			},
			bricks: [],
		});
	});

	test("reads back reordered, removed and added repeater items and bricks", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = fullStory({
			title: "Edited",
			...(await createStoryTargets(admin)),
		});
		const id = await createDocument(admin, STORY_KEY, story);

		const [hero, list, seo] = story.bricks;
		const items = story.fields.find((field) => field.key === "items");
		const [one, two, three] = items?.groups ?? [];
		if (!hero || !list || !seo || !one || !two || !three) {
			throw new Error("The full story lost a brick or an item.");
		}

		const edited = {
			fields: [
				...story.fields.filter((field) => field.key !== "items"),
				{
					key: "items",
					type: "repeater",
					groups: [
						//* three moves first, two is removed, and one loses its nested items
						{ ...three, order: 0 },
						{
							...one,
							order: 1,
							fields: one.fields.map((field) =>
								field.key === "nested_items" ? { ...field, groups: [] } : field,
							),
						},
						{
							ref: "item-new",
							order: 2,
							fields: [
								{ key: "item_title", type: "text", value: "Four" },
								{ key: "item_number", type: "number", value: 4 },
								{ key: "nested_items", type: "repeater", groups: [] },
							],
						},
					],
				},
			],
			bricks: [
				//* the list moves above a new hero, and the first hero is removed
				{ ...list, order: 0 },
				{
					...hero,
					ref: "hero-new",
					order: 1,
					fields: [
						{ key: "heading", type: "text", value: "A second hero" },
						{
							key: "body",
							type: "rich-text",
							value: { type: "doc", content: [{ type: "paragraph" }] },
						},
					],
				},
				seo,
			],
		};
		await saveDocument(admin, STORY_KEY, id, edited);

		const read = await readDocument(admin, STORY_KEY, id);
		expect(read).toMatchObject(valuesOf(edited));
		expect(read.bricks).toHaveLength(2);
	});

	test("names the field that failed validation and saves nothing", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const marker = randomUUID();

		const refused = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}`,
			body: {
				fields: [
					{ key: "title", type: "text", value: "" },
					{ key: "text", type: "text", value: marker },
					{ key: "number", type: "number", value: "not a number" },
				],
			},
		});

		expect(refused.status).toBe(400);
		expect(refused.body).toMatchObject({
			errors: {
				fields: expect.arrayContaining([
					expect.objectContaining({ key: "title" }),
					expect.objectContaining({ key: "number" }),
				]),
			},
		});
		expect(
			await listDocumentIds(admin, STORY_KEY, {
				"filter[fields.text]": marker,
			}),
		).toEqual([]);
	});

	test("keeps the stored content when a save fails validation", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = fullStory({
			title: "Kept",
			...(await createStoryTargets(admin)),
		});
		const id = await createDocument(admin, STORY_KEY, story);
		const before = await readDocument(admin, STORY_KEY, id);

		const refused = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
			body: {
				...story,
				fields: [{ key: "title", type: "text", value: "x".repeat(200) }],
			},
		});

		expect(refused.status).toBe(400);
		expect(await readDocument(admin, STORY_KEY, id)).toEqual(before);
	});
});
