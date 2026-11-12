import { defineSeed, LucidError } from "@lucidcms/core";
import type { SeedDefinition, Toolkit } from "@lucidcms/core/types";
import { STORY_KEY } from "../collections/story.ts";
import { files } from "../media.ts";
import { PLUGIN_SEED, recordJob } from "./plugin.ts";
import { recordRun } from "./records.ts";
import { STARTER, starterFile } from "./starter.ts";

/** Every harness seed's name, as `seed:list` prints them and `lucidcms seed` takes them. */
export const SEEDS = {
	file: "harness-file",
	plugin: PLUGIN_SEED,
	inline: "harness:inline",
	stories: "harness:stories",
	media: "harness:media",
	starter: "harness:starter",
	job: "harness:job",
	fails: "harness:fails",
	ignoresErrors: "harness:ignores-errors",
} as const;

/** What the seeds make, for tests to look for. */
export const SEEDED = {
	stories: ["Seeded story one", "Seeded story two"],
	mediaStory: "Seeded with media",
	mediaTitle: "Seeded image",
	image: files.png({ width: 6, height: 4, shade: 140 }),
	failedStory: "Never kept",
	/** The name the job `harness:job` queues records its run under. */
	jobRecord: "harness:job/queued",
	failedJobRecord: "harness:fails/queued",
} as const;

const system = { type: "system" } as const;

/** The latest version of the story with this title, if there is one. */
const findStory = async (toolkit: Toolkit, title: string) => {
	const found = await toolkit.documents.getMultiple({
		collectionKey: STORY_KEY,
		version: "latest",
		filter: { "fields.title": title },
		perPage: 1,
	});
	if (found.error) throw new LucidError(found.error);
	return found.data.items[0];
};

const createStory = async (
	toolkit: Toolkit,
	fields: { title: string; media?: number[] },
) => {
	const created = await toolkit.documents.createSingle({
		collectionKey: STORY_KEY,
		actor: system,
		data: { fields },
	});
	if (created.error) throw new LucidError(created.error);
	return created.data.id;
};

const uploadImage = async (
	toolkit: Toolkit,
	options: { title: string; public: boolean },
) => {
	const uploaded = await toolkit.media.uploadFile({
		file: {
			fileName: SEEDED.image.name,
			mimeType: SEEDED.image.mimeType,
			body: SEEDED.image.bytes,
		},
		public: options.public,
		title: [{ localeCode: null, value: options.title }],
	});
	if (uploaded.error) throw new LucidError(uploaded.error);
	return uploaded.data.id;
};

const inline: SeedDefinition = {
	name: SEEDS.inline,
	seed: defineSeed({ run: ({ context }) => recordRun(context, SEEDS.inline) }),
};

/** Seeds that succeed, and can run again without making anything twice. */
export const workingSeeds: SeedDefinition[] = [
	inline,
	{
		name: SEEDS.stories,
		seed: defineSeed({
			run: async ({ context, toolkit }) => {
				for (const title of SEEDED.stories) {
					if (!(await findStory(toolkit, title))) {
						await createStory(toolkit, { title });
					}
				}
				await recordRun(context, SEEDS.stories);
			},
		}),
	},
	{
		name: SEEDS.media,
		seed: defineSeed({
			run: async ({ context, toolkit }) => {
				if (!(await findStory(toolkit, SEEDED.mediaStory))) {
					const image = await uploadImage(toolkit, {
						title: SEEDED.mediaTitle,
						public: true,
					});
					await createStory(toolkit, {
						title: SEEDED.mediaStory,
						media: [image],
					});
				}
				await recordRun(context, SEEDS.media);
			},
		}),
	},
	{
		name: SEEDS.starter,
		seed: defineSeed({
			//* the import matches what it made before by uid, so it needs no check of its own
			run: async ({ context, toolkit }) => {
				const imported = await toolkit.transfer.import({
					actor: system,
					file: starterFile,
					files: async (path) =>
						path === STARTER.imagePath
							? {
									fileName: "starter.png",
									mimeType: STARTER.image.mimeType,
									body: STARTER.image.bytes,
								}
							: undefined,
				});
				if (imported.error) throw new LucidError(imported.error);
				const failed = imported.data.items.filter(
					(item) => item.status === "failed",
				);
				if (failed.length > 0) {
					throw new LucidError({
						message: `The starter content did not import: ${JSON.stringify(failed)}`,
					});
				}
				await recordRun(context, SEEDS.starter);
			},
		}),
	},
	{
		name: SEEDS.job,
		seed: defineSeed({
			run: async ({ context, toolkit }) => {
				const queued = await toolkit.jobs.enqueueJob({
					job: recordJob,
					payload: { name: SEEDED.jobRecord },
				});
				if (queued.error) throw new LucidError(queued.error);
				await recordRun(context, SEEDS.job);
			},
		}),
	},
];

/** Seeds that go wrong: one throws after writing everywhere, and one carries on past failed calls. */
export const failingSeeds: SeedDefinition[] = [
	{
		name: SEEDS.fails,
		seed: defineSeed({
			run: async ({ context, toolkit }) => {
				await recordRun(context, SEEDS.fails);
				const image = await uploadImage(toolkit, {
					title: SEEDED.failedStory,
					public: false,
				});
				//* making it public moves its file, which a rollback has to move back before deleting it
				const moved = await toolkit.media.updateSingle({
					id: image,
					public: true,
				});
				if (moved.error) throw new LucidError(moved.error);
				await createStory(toolkit, {
					title: SEEDED.failedStory,
					media: [image],
				});
				const queued = await toolkit.jobs.enqueueJob({
					job: recordJob,
					payload: { name: SEEDED.failedJobRecord },
				});
				if (queued.error) throw new LucidError(queued.error);

				throw new LucidError({ message: "This seed fails on purpose." });
			},
		}),
	},
	{
		name: SEEDS.ignoresErrors,
		seed: defineSeed({
			//* both calls fail validation, and the seed carries on as if they hadn't
			run: async ({ context, toolkit }) => {
				await toolkit.documents.createSingle({
					collectionKey: STORY_KEY,
					actor: system,
					data: { fields: { title: "" } },
				});
				await toolkit.media.uploadFile({
					file: {
						fileName: SEEDED.image.name,
						mimeType: SEEDED.image.mimeType,
						body: SEEDED.image.bytes,
					},
					title: [{ localeCode: null, value: SEEDED.failedStory }],
					validation: { mimeTypes: ["application/pdf"] },
				});
				await recordRun(context, SEEDS.ignoresErrors);
			},
		}),
	},
];

/** A seed that takes the plugin seed's name. */
export const duplicateSeed: SeedDefinition = { ...inline, name: PLUGIN_SEED };

/** A seed whose name `lucidcms seed` could not take. */
export const badlyNamedSeed: SeedDefinition = {
	...inline,
	name: "Not A Seed Name",
};
