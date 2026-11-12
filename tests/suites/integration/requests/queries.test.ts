import {
	countQueries,
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { createDocument } from "#shared/helpers/documents";
import { openRequest } from "#shared/helpers/requests";

/** Opens a request to publish this many new stories to staging. */
const openRequestFor = async (admin: Session, stories: number) => {
	const ids: number[] = [];
	for (let index = 0; index < stories; index++) {
		ids.push(
			await createDocument(admin, STORY_KEY, {
				fields: [{ key: "title", type: "text", value: `Story ${index}` }],
			}),
		);
	}
	return openRequest(
		admin,
		"publish",
		ids.map((documentId) => ({
			collectionKey: STORY_KEY,
			documentId,
			targets: ["staging"],
		})),
	);
};

/** Checks that query counts do not grow per document a request holds, or per request listed. */
describe("database queries per request", () => {
	requires(`collection:${STORY_KEY}`);

	test("reading a request runs the same queries however many documents it holds", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = async (stories: number) => {
			const requestId = await openRequestFor(admin, stories);
			const response = await admin.request({
				path: `/api/v1/requests/${requestId}`,
			});
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		const one = await read(1);
		expect(one).toBeGreaterThan(0);
		expect(await read(8)).toBe(one);
	});

	test("listing requests runs the same queries however many it returns", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const list = async () => {
			const response = await admin.request<{ data: unknown[] }>({
				path: "/api/v1/requests",
				query: { "filter[collectionKey]": STORY_KEY, perPage: 50 },
			});
			expect(response.status).toBe(200);
			return countQueries(response);
		};

		await openRequestFor(admin, 2);
		const few = await list();
		for (let index = 0; index < 6; index++) {
			await openRequestFor(admin, 2);
		}
		expect(await list()).toBe(few);
	});
});
