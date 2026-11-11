import path from "node:path";
import {
	benchmark,
	type Metric,
	measureRequests,
	runMeasured,
	runPool,
	type ServedCms,
} from "#harness/performance";
import { IMAGE_PRESET } from "#shared/fragments/media";
import {
	createMedia,
	files,
	getMedia,
	uploadFile,
	uploadMedia,
} from "#shared/media";

/** How many images the CMS holds while it is timed. */
const IMAGES = 200;
/** How many requests each sample times for every metric. */
const REQUESTS = 20;
/** How many images are uploaded at once while the CMS is filled. */
const SEED_CONCURRENCY = 4;

const preset = `?preset=${IMAGE_PRESET.name}`;

type Prepared = {
	server: ServedCms;
	/** Each image's path under `/cdn`. */
	paths: string[];
	/** Counts samples, so uploads are named apart. */
	samples: number;
	destroy(): Promise<void>;
};

/** Times `REQUESTS` requests, as every metric here does. */
const measure = (
	options: Omit<Parameters<typeof measureRequests>[0], "requests">,
) => measureRequests({ ...options, requests: REQUESTS });

/** Sends a CDN request as a new visitor, as each website visitor is, and reads the whole file. */
const fetchFile = async (server: ServedCms, pathname: string) => {
	const response = await server.session().fetch(pathname);
	await response.arrayBuffer();
	return { status: response.status, body: null, headers: response.headers };
};

/**
 * Benchmarks CDN originals and variants, library listings and uploads against the built server
 * with a few hundred images.
 */
benchmark<Prepared>({
	id: "media",
	//* filling the CMS warms its uploads, and `prepare` warms its reads, so no sample is thrown away
	warmups: 0,
	prepare: async (context) => {
		const database = await context.database();
		try {
			await runMeasured({
				command: "lucidcms",
				args: ["migrate", "--yes"],
				cwd: context.setup.directory,
				env: { ...context.env, HARNESS_DATABASE_URL: database.url },
				log: path.join(context.work, "media-migrate.log"),
			});
			const server = await context.serve(database);

			try {
				const { admin } = server;
				const ids = await runPool(
					Array.from({ length: IMAGES }, (_, index) => index),
					SEED_CONCURRENCY,
					(index) =>
						uploadMedia(admin, {
							title: `Image ${String(index).padStart(4, "0")}`,
							file: files.png({ width: 64, height: 48, shade: index % 256 }),
						}),
				);
				const paths = await runPool(
					ids,
					SEED_CONCURRENCY,
					async (id) => new URL((await getMedia(admin, id)).url).pathname,
				);
				for (const path of paths.slice(0, REQUESTS)) {
					await fetchFile(server, path);
					await fetchFile(server, `${path}${preset}`);
				}

				return { server, paths, samples: 0, destroy: database.destroy };
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
		const { server, paths } = prepared;
		const { admin } = server;
		const sample = prepared.samples++;
		const path = (request: number) => paths[request % paths.length] as string;

		const metrics: Record<string, Metric> = {
			...(await measure({
				key: "cdn.original",
				label: "Stream an original from the CDN",
				status: 200,
				send: (request) => fetchFile(server, path(request)),
			})),
			...(await measure({
				key: "cdn.variant.stored",
				label: "Stream a stored image variant",
				status: 200,
				send: (request) => fetchFile(server, `${path(request)}${preset}`),
			})),
		};

		//* variants are made again from nothing, so every sample times the same work
		const cleared = await admin.request({
			method: "DELETE",
			path: "/api/v1/media/processed",
		});
		if (cleared.status >= 300) {
			throw new Error(`Clearing image variants gave ${cleared.status}.`);
		}
		Object.assign(
			metrics,
			await measure({
				key: "cdn.variant.new",
				label: "Make and stream a new image variant",
				status: 200,
				send: (request) => fetchFile(server, `${path(request)}${preset}`),
			}),
			await measure({
				key: "list",
				label: "List 50 media items",
				status: 200,
				send: (request) =>
					admin.request({
						path: "/api/v1/media",
						query: { perPage: 50, page: (request % 4) + 1 },
					}),
			}),
			await measure({
				key: "upload",
				label: "Upload an image, from starting to saving it",
				status: 201,
				send: async (request) => {
					const file = files.png({ width: 64, height: 48, shade: request });
					const uploaded = await uploadFile(admin, file);
					return createMedia(admin, uploaded, {
						title: `Uploaded ${sample}.${request}`,
						fileName: file.name,
					});
				},
			}),
		);

		return metrics;
	},
});
