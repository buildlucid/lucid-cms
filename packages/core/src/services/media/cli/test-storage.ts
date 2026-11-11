import { copy } from "../../../libs/i18n/index.js";
import { toWebReadable } from "../../../libs/media-storage/normalize-body.js";
import type { LucidErrorData } from "../../../types/errors.js";
import { generateKey } from "../../../utils/media/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

export type StorageTestStep = {
	name: "write" | "read" | "delete";
	/** Why the step failed, or null when it passed. */
	error: string | null;
};

const CONTENT = "Lucid CMS storage test";

/**
 * Tests storage with a temporary file. After a successful write, attempts cleanup even if reading
 * fails.
 */
const testStorage: ServiceFn<
	[],
	{ adapter: string; key: string; steps: StorageTestStep[] }
> = async (context) => {
	const storage = context.mediaStorage;
	if (!storage) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.media.storage.adapter.not.enabled"),
			},
			data: undefined,
		};
	}

	const key = generateKey({
		name: "storage-test",
		public: false,
	});
	if (key.error) return key;

	const steps: StorageTestStep[] = [];
	const run = async (
		name: StorageTestStep["name"],
		step: () => Promise<LucidErrorData | undefined>,
	) => {
		const error = await step().then(
			(error) =>
				error
					? (context.translate.english(error.message) ?? "Unknown error")
					: null,
			(error: unknown) =>
				error instanceof Error ? error.message : String(error),
		);
		steps.push({ name, error });
		return error === null;
	};
	const body = new TextEncoder().encode(CONTENT);

	const written = await run(
		"write",
		async () =>
			(
				await storage.upload(context, {
					key: key.data,
					body,
					size: body.byteLength,
					mimeType: "text/plain",
					extension: "txt",
					type: "document",
				})
			).error,
	);
	if (written) {
		await run("read", async () => {
			const res = await storage.stream(context, { key: key.data });
			if (res.error) return res.error;

			const text = await new Response(toWebReadable(res.data.body)).text();
			if (text === CONTENT) return undefined;
			return {
				message: copy.literal(
					"The file read back doesn't match the file written.",
				),
			};
		});
		await run(
			"delete",
			async () => (await storage.delete(context, { key: key.data })).error,
		);
	}

	return {
		error: undefined,
		data: { adapter: storage.key, key: key.data, steps },
	};
};

export default testStorage;
