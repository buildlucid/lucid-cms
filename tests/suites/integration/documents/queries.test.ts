import { randomUUID } from "node:crypto";
import {
	countQueries,
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	createContentReader,
	createDocument,
	createStoryTargets,
	fullStory,
	publishDocument,
} from "#shared/documents";

const DOCUMENTS = `/api/v1/documents/${STORY_KEY}`;

/** A small story and one with many more bricks and repeater items, in the same shape. */
const sizes = {
	small: { heroes: 1, items: 1 },
	large: { heroes: 8, items: 20 },
};

/** Makes stories of both sizes that relate to the same page and user. */
const storyMaker = async (admin: Session) => {
	const targets = await createStoryTargets(admin);
	return (size: keyof typeof sizes, marker = "unmarked") =>
		fullStory({ title: size, marker, ...targets, ...sizes[size] });
};

/** Checks that query counts do not grow per brick, item or document. */
describe("database queries per request", () => {
	requires(`collection:${STORY_KEY}`);

	test("reading a document runs the same queries however much content it has", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = await storyMaker(admin);
		const read = async (size: keyof typeof sizes) => {
			const id = await createDocument(admin, STORY_KEY, story(size));
			const response = await admin.request({
				path: `${DOCUMENTS}/${id}/latest`,
				query: { include: "bricks,refs" },
			});
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		const small = await read("small");
		expect(small).toBeGreaterThan(0);
		expect(await read("large")).toBe(small);
	});

	test("listing documents runs the same queries however many it returns", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = await storyMaker(admin);
		const list = async (count: number) => {
			const marker = randomUUID();
			for (let index = 0; index < count; index++) {
				await createDocument(admin, STORY_KEY, story("small", marker));
			}
			const response = await admin.request({
				path: `${DOCUMENTS}/latest`,
				query: { "filter[fields.text]": marker, include: "refs", perPage: 50 },
			});
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		const small = await list(2);
		expect(small).toBeGreaterThan(0);
		expect(await list(12)).toBe(small);
	});

	test("reading published content runs the same queries however much it has", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = await storyMaker(admin);
		const read = await createContentReader(admin, lucid.session, [
			STORY_KEY,
			"page",
		]);
		const readContent = async (size: keyof typeof sizes) => {
			const id = await createDocument(admin, STORY_KEY, story(size));
			await publishDocument(admin, STORY_KEY, id, "staging");
			const response = await read(
				`document/${STORY_KEY}`,
				{ version: "staging", "filter[id]": id, include: "bricks" },
				//* reads past the response cache, which would answer without the database
				{ "cache-control": "no-cache" },
			);
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		const small = await readContent("small");
		expect(small).toBeGreaterThan(0);
		expect(await readContent("large")).toBe(small);
	});

	test("saving a document runs the same queries however much content it has", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const story = await storyMaker(admin);
		const save = async (size: keyof typeof sizes) => {
			const id = await createDocument(admin, STORY_KEY, story(size));
			const response = await admin.request({
				method: "POST",
				path: `${DOCUMENTS}/${id}`,
				body: story(size),
			});
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		const small = await save("small");
		expect(small).toBeGreaterThan(0);
		expect(await save("large")).toBe(small);
	});
});
