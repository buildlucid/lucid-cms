import {
	describe,
	expect,
	migratedTo,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { SEEDED, SEEDS } from "#shared/config/seeds/seeds";
import { STARTER } from "#shared/config/seeds/starter";
import { readSeeded } from "#shared/config/seeds/state";
import { listDocumentIds, readDocument } from "#shared/helpers/documents";
import {
	fetchCdn,
	findStorageDrift,
	getMedia,
	type MediaFile,
} from "#shared/helpers/media";

const migrated = migratedTo("seeds");

/** Checks the one story with this title shows an image the CDN serves with these bytes. */
const expectStoryImage = async (
	admin: Session,
	title: string,
	image: MediaFile,
) => {
	const ids = await listDocumentIds(admin, STORY_KEY, {
		"filter[fields.title]": title,
	});
	expect(ids, title).toHaveLength(1);
	const story = await readDocument(admin, STORY_KEY, ids[0] ?? 0);
	const [mediaId] = story.fields.media as number[];
	const media = await getMedia(admin, mediaId ?? 0);

	const served = await fetchCdn(admin, media.url);
	expect(served.status, title).toBe(200);
	expect(new Uint8Array(await served.arrayBuffer())).toEqual(
		new Uint8Array(image.bytes),
	);
};

describe("what seeds make", { concurrent: true, timeout: 120_000 }, () => {
	requires("mode:host", "plugin:filesystem");

	test("stories, an uploaded image and imported starter content, which the CMS serves", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);
		for (const name of [SEEDS.stories, SEEDS.media, SEEDS.starter]) {
			const run = await database.cli("seeds", "seed", name);
			expect(run.code, run.output).toBe(0);
		}
		expect(await findStorageDrift(database)).toEqual({
			missing: [],
			orphaned: [],
		});

		await database.cms("seeds", async (admin) => {
			for (const title of SEEDED.stories) {
				expect(
					await listDocumentIds(admin, STORY_KEY, {
						"filter[fields.title]": title,
					}),
					title,
				).toHaveLength(1);
			}
			await expectStoryImage(admin, SEEDED.mediaStory, SEEDED.image);
			await expectStoryImage(admin, STARTER.storyTitle, STARTER.image);
		});
	});

	test("jobs a seed queues have run by the time the command ends", async ({
		migrations,
	}) => {
		const database = await migrations.database(migrated);

		const run = await database.cli("seeds", "seed", SEEDS.job);
		expect(run.code, run.output).toBe(0);
		expect((await readSeeded(database)).records).toEqual({
			[SEEDS.job]: 1,
			[SEEDED.jobRecord]: 1,
		});
	});
});
