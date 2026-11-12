import path from "node:path";
import {
	benchmark,
	type Metric,
	measureRequests,
	runMeasured,
	runPool,
	type ServedCms,
} from "#harness/performance";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	type ContentReader,
	createContentReader,
	createDocument,
	createStoryTargets,
	fullStory,
	publishDocument,
} from "#shared/helpers/documents";

/** How many stories the CMS holds while it is timed. */
const STORIES = 300;
/** How many of them are published, for the content API to read. */
const PUBLISHED = 50;
/** How many requests each sample times for every metric. */
const REQUESTS = 40;
/** How many stories are created at once while the CMS is filled. */
const SEED_CONCURRENCY = 4;
/** Untimed reads of each kind before the first sample, so the server's code is warm. */
const WARMUP_REQUESTS = 10;

const DOCUMENTS = `/api/v1/documents/${STORY_KEY}`;
//* reads past the response cache, so every setup is timed doing the work
const UNCACHED = { "cache-control": "no-cache" };

type Prepared = {
	server: ServedCms;
	read: ContentReader;
	/** Whether the setup caches content responses, which needs a KV store. */
	caches: boolean;
	ids: number[];
	/** Builds a story of the size every story here has. */
	story(title: string): ReturnType<typeof fullStory>;
	/** Counts samples, so each one works on stories the last one left alone. */
	samples: number;
	destroy(): Promise<void>;
};

/** Times `REQUESTS` requests, as every metric here does. */
const measure = (
	options: Omit<Parameters<typeof measureRequests>[0], "requests">,
) => measureRequests({ ...options, requests: REQUESTS });

/**
 * Times the requests an editor and a website make most: reading, listing, saving, creating and
 * publishing documents. It runs the setup's built server with a few hundred full stories in it.
 */
benchmark<Prepared>({
	id: "documents",
	//* filling the CMS warms its writes, and `prepare` warms its reads, so no sample is thrown away
	warmups: 0,
	prepare: async (context) => {
		const database = await context.database();
		try {
			await runMeasured({
				command: "lucidcms",
				args: ["migrate", "--yes"],
				cwd: context.setup.directory,
				env: { ...context.env, HARNESS_DATABASE_URL: database.url },
				log: path.join(context.work, "documents-migrate.log"),
			});
			const server = await context.serve(database);

			try {
				const { admin } = server;
				const targets = await createStoryTargets(admin);
				const story = (title: string) =>
					fullStory({ title, ...targets, items: 10, heroes: 4 });

				const ids = await runPool(
					Array.from({ length: STORIES }, (_, index) => index),
					SEED_CONCURRENCY,
					(index) =>
						createDocument(
							admin,
							STORY_KEY,
							story(`Story ${String(index).padStart(4, "0")}`),
						),
				);
				await runPool(ids.slice(0, PUBLISHED), SEED_CONCURRENCY, (id) =>
					publishDocument(admin, STORY_KEY, id, "staging"),
				);

				const read = await createContentReader(admin, server.session, [
					STORY_KEY,
					"page",
				]);
				const cached = () =>
					read(`documents/${STORY_KEY}`, { version: "staging", perPage: 1 });
				await cached();
				for (const id of ids.slice(0, WARMUP_REQUESTS)) {
					await admin.request({
						path: `${DOCUMENTS}/${id}/latest`,
						query: { include: "bricks" },
					});
					await admin.request({
						path: `${DOCUMENTS}/latest`,
						query: { perPage: 50 },
					});
					await read(
						`document/${STORY_KEY}`,
						{ version: "staging", "filter[id]": id, include: "bricks" },
						UNCACHED,
					);
				}

				return {
					server,
					read,
					caches: (await cached()).headers.get("x-cache") === "HIT",
					ids,
					story,
					samples: 0,
					destroy: database.destroy,
				};
			} catch (error) {
				await server.stop();
				throw error;
			}
		} catch (error) {
			await database.destroy();
			throw error;
		}
	},
	cleanup: async (prepared) => {
		await prepared.server.stop();
		await prepared.destroy();
	},
	sample: async (_context, prepared) => {
		const { admin } = prepared.server;
		const { ids, read } = prepared;
		const sample = prepared.samples++;
		//* saves add revisions, so each sample saves stories no earlier sample has touched
		const own = (request: number) => {
			const unpublished = ids.length - PUBLISHED;
			return ids[
				PUBLISHED + ((sample * REQUESTS + request) % unpublished)
			] as number;
		};
		const published = (request: number) => ids[request % PUBLISHED] as number;
		const content = (request: number, headers?: Record<string, string>) =>
			read(
				`document/${STORY_KEY}`,
				{
					version: "staging",
					"filter[id]": published(request),
					include: "bricks",
				},
				headers,
			);

		const metrics: Record<string, Metric> = {
			...(await measure({
				key: "read.single",
				label: "Read a document",
				status: 200,
				send: (request) =>
					admin.request({
						path: `${DOCUMENTS}/${ids[request % ids.length]}/latest`,
						query: { include: "bricks" },
					}),
			})),
			...(await measure({
				key: "read.list",
				label: "List 50 documents",
				status: 200,
				send: (request) =>
					admin.request({
						path: `${DOCUMENTS}/latest`,
						query: {
							"filter[fields.number]": 42,
							sort: "-fields.title",
							perPage: 50,
							page: (request % 5) + 1,
						},
					}),
			})),
			...(await measure({
				key: "read.content",
				label: "Read a published document from the content API",
				status: 200,
				send: (request) => content(request, UNCACHED),
			})),
			...(await measure({
				key: "save",
				label: "Save a document",
				status: 200,
				send: (request) =>
					admin.request({
						method: "POST",
						path: `${DOCUMENTS}/${own(request)}`,
						body: prepared.story(`Saved ${sample}.${request}`),
					}),
			})),
			...(await measure({
				key: "publish",
				label: "Publish a document",
				status: 204,
				send: (request) =>
					admin.request({
						method: "POST",
						path: `${DOCUMENTS}/${own(request)}/publish`,
						body: { environment: "staging" },
					}),
			})),
			...(await measure({
				key: "create",
				label: "Create a document",
				status: 201,
				send: (request) =>
					admin.request({
						method: "POST",
						path: DOCUMENTS,
						body: prepared.story(`Created ${sample}.${request}`),
					}),
			})),
		};

		if (prepared.caches) {
			await content(0);
			Object.assign(
				metrics,
				await measure({
					key: "read.cached",
					label: "Read a published document from the content API cache",
					status: 200,
					send: () => content(0),
				}),
			);
		}

		return metrics;
	},
});
