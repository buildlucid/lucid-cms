import { randomUUID } from "node:crypto";
import {
	test as base,
	describe,
	expect,
	requires,
	type Session,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument, listDocumentIds } from "#shared/documents";

/** The stories every test here lists: a title, a number, and a hero heading for some. */
const STORIES = [
	{ title: "Apple", number: 3, heading: "Fruit" },
	{ title: "Banana", number: 1, heading: "Fruit" },
	{ title: "Carrot", number: 2, heading: "Vegetable" },
	{ title: "Damson", number: 5, heading: null },
	{ title: "Endive", number: 4, heading: "Vegetable" },
] as const;

type Title = (typeof STORIES)[number]["title"];

/** The stories, created once for the file, and ways to list them alone. */
type Listed = {
	admin: Session;
	/** Lists this file's stories. A served database is shared, so every query is kept to them. */
	list(query: Parameters<typeof listDocumentIds>[2]): Promise<number[]>;
	idsOf(...titles: Title[]): number[];
	marker: string;
};

const test = base.extend<{ stories: Listed }>({
	stories: [
		async ({ lucid }, use) => {
			const admin = await lucid.admin();
			const marker = randomUUID();
			const ids = new Map<Title, number>();

			for (const story of STORIES) {
				ids.set(
					story.title,
					await createDocument(admin, STORY_KEY, {
						fields: [
							{ key: "title", type: "text", value: story.title },
							{ key: "text", type: "text", value: marker },
							{ key: "number", type: "number", value: story.number },
							{
								key: "items",
								type: "repeater",
								groups: [
									{
										ref: "item",
										order: 0,
										fields: [
											{
												key: "item_title",
												type: "text",
												value: `${story.title} item`,
											},
										],
									},
								],
							},
						],
						bricks: story.heading
							? [
									{
										ref: "hero",
										key: "story-hero",
										order: 0,
										type: "builder",
										fields: [
											{ key: "heading", type: "text", value: story.heading },
										],
									},
								]
							: [],
					}),
				);
			}

			await use({
				admin,
				marker,
				list: (query) =>
					listDocumentIds(admin, STORY_KEY, {
						"filter[fields.text]": marker,
						...query,
					}),
				idsOf: (...titles) =>
					titles.map((title) => {
						const id = ids.get(title);
						if (id === undefined) {
							throw new Error(`${title} was not created.`);
						}
						return id;
					}),
			});
		},
		{ scope: "file" },
	],
});

describe("listing documents", () => {
	requires(`collection:${STORY_KEY}`);

	test("sorts by a field in both directions", async ({ stories }) => {
		const { list, idsOf } = stories;

		expect(await list({ sort: "fields.number" })).toEqual(
			idsOf("Banana", "Carrot", "Apple", "Endive", "Damson"),
		);
		expect(await list({ sort: "-fields.title" })).toEqual(
			idsOf("Endive", "Damson", "Carrot", "Banana", "Apple"),
		);
	});

	test("filters by a field, a field in a repeater and a field in a brick", async ({
		stories,
	}) => {
		const { list, idsOf } = stories;
		const sort = "fields.title";

		expect(await list({ "filter[fields.title]": "Carrot" })).toEqual(
			idsOf("Carrot"),
		);
		expect(await list({ "filter[fields.item_title]": "Damson item" })).toEqual(
			idsOf("Damson"),
		);
		expect(
			await list({ "filter[bricks.story-hero.heading]": "Fruit", sort }),
		).toEqual(idsOf("Apple", "Banana"));
	});

	test("filters by several values and by comparison", async ({ stories }) => {
		const { list, idsOf } = stories;
		const sort = "fields.title";

		expect(
			await list({ "filter[fields.title:in]": ["Apple", "Endive"], sort }),
		).toEqual(idsOf("Apple", "Endive"));
		expect(await list({ "filter[fields.number:>=]": 4, sort })).toEqual(
			idsOf("Damson", "Endive"),
		);
		expect(
			await list({ "filter[fields.title:contains]": "nan", sort }),
		).toEqual(idsOf("Banana"));
	});

	test("pages through the list without repeating or dropping a document", async ({
		stories,
	}) => {
		const { admin, idsOf, marker } = stories;
		const page = async (number: number) => {
			const listed = await admin.request<{
				data: Array<{ id: number }>;
				pagination: { total: number; lastPage: number };
			}>({
				path: `/api/v1/documents/${STORY_KEY}/latest`,
				query: {
					"filter[fields.text]": marker,
					sort: "fields.number",
					perPage: 2,
					page: number,
				},
			});
			expect(listed.status).toBe(200);
			return listed.body;
		};

		const pages = [await page(1), await page(2), await page(3)];

		expect(pages[0]?.pagination).toMatchObject({ total: 5, lastPage: 3 });
		expect(pages.flatMap((result) => result.data.map(({ id }) => id))).toEqual(
			idsOf("Banana", "Carrot", "Apple", "Endive", "Damson"),
		);
	});

	test("lists an environment's documents and how they compare with latest", async ({
		stories,
	}) => {
		const { admin, list, idsOf, marker } = stories;
		const publish = (title: Title) =>
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${STORY_KEY}/${idsOf(title)}/publish`,
				body: { environment: "staging" },
			});
		await publish("Apple");
		await publish("Banana");
		await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${idsOf("Banana")}`,
			body: {
				fields: [
					{ key: "title", type: "text", value: "Banana" },
					{ key: "text", type: "text", value: marker },
					//* any change will do, so pick one no other test sorts or filters by
					{ key: "textarea", type: "textarea", value: "Edited" },
					{ key: "number", type: "number", value: 1 },
				],
			},
		});
		const sort = "fields.title";

		expect(
			await listDocumentIds(
				admin,
				STORY_KEY,
				{ "filter[fields.text]": marker, sort },
				"staging",
			),
		).toEqual(idsOf("Apple", "Banana"));
		expect(
			await list({ "filter[envStatus.staging]": "in-sync", sort }),
		).toEqual(idsOf("Apple"));
		expect(
			await list({ "filter[envStatus.staging]": "out-of-sync", sort }),
		).toEqual(idsOf("Banana"));
		expect(
			await list({ "filter[envStatus.staging]": "unpublished", sort }),
		).toEqual(idsOf("Carrot", "Damson", "Endive"));
	});

	test("refuses to sort by a field the collection cannot be sorted by", async ({
		stories,
	}) => {
		const { admin } = stories;
		const sortBy = (sort: string) =>
			admin.request({
				path: `/api/v1/documents/${STORY_KEY}/latest`,
				query: { sort },
			});

		expect((await sortBy("fields.missing")).status).toBe(400);
		//* a repeater holds many values, so there is nothing to sort by
		expect((await sortBy("-fields.items")).status).toBe(400);
		expect((await sortBy("-fields.number")).status).toBe(200);
	});

	test("refuses a filter key the collection does not have", async ({
		stories,
	}) => {
		const { admin } = stories;
		const listWith = (query: Record<string, string>) =>
			admin.request({ path: `/api/v1/documents/${STORY_KEY}/latest`, query });

		expect((await listWith({ "filter[fields.missing]": "x" })).status).toBe(
			400,
		);
		expect(
			(await listWith({ "filter[bricks.story-hero.missing]": "x" })).status,
		).toBe(400);
	});
});
