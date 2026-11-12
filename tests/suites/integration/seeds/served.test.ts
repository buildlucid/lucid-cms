import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { SEEDED, SEEDS } from "#shared/config/seeds/seeds";
import { listDocumentIds, readDocument } from "#shared/helpers/documents";
import { fetchCdn, getMedia } from "#shared/helpers/media";

describe("seeds beside a running server", { timeout: 120_000 }, () => {
	//* only setups that register the seeds outside a schema step, as a Worker can't read one
	requires("mode:served", "plugin:harness-seeds");

	test("run in the runtime, and the server serves what they made", async ({
		lucid,
	}) => {
		for (const name of [SEEDS.file, SEEDS.stories, SEEDS.media]) {
			const run = await lucid.cli("seed", name);
			expect(run.code, run.output).toBe(0);
		}

		const admin = await lucid.admin();
		const [id] = await listDocumentIds(admin, STORY_KEY, {
			"filter[fields.title]": SEEDED.mediaStory,
		});
		const story = await readDocument(admin, STORY_KEY, id ?? 0);
		const [mediaId] = story.fields.media as number[];
		const media = await getMedia(admin, mediaId ?? 0);
		const served = await fetchCdn(lucid.session(), media.url);
		expect(served.status).toBe(200);
		expect(new Uint8Array(await served.arrayBuffer())).toEqual(
			new Uint8Array(SEEDED.image.bytes),
		);
	});
});
