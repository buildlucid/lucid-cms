import { copy } from "@lucidcms/core";
import type {
	CoreToolkit,
	ServiceFn,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { IndexState, PendingWork } from "../repositories/types.js";
import WorkRepository from "../repositories/work.js";
import type { IndexOptions, ResolvedOptions } from "../types.js";
import { ownerId } from "../utils/identity.js";
import readRecords from "./read-records.js";
import scanSource from "./scan-source.js";
import writeBatch from "./write-batch.js";

/** Processes one bounded batch, rereading current content on every attempt. */
const processWork: ServiceFn<
	[
		{
			options: ResolvedOptions;
			toolkit: CoreToolkit;
			index: IndexOptions;
			state: IndexState;
			rows: PendingWork[];
			checkLease: () => ServiceResponse<undefined>;
		},
	],
	{ processed: number }
> = async (context, data) => {
	const first = data.rows[0];
	if (!first) return { error: undefined, data: { processed: 0 } };

	const source = data.index.sources.find(
		(source) => source.key === first.source_key,
	);
	if (!source) {
		return {
			error: { message: copy("server:plugin.typesense.source.missing") },
			data: undefined,
		};
	}
	const Work = new WorkRepository(context.db);
	const scan = first.document_id === 0;
	const rows = scan
		? [first]
		: data.rows.filter((row) => row.source_key === source.key);
	let ids = rows.map((row) => row.document_id);

	if (scan) {
		const page = await scanSource(context, {
			source,
			cursor: first.cursor,
			limit: data.options.batchSize,
		});
		if (page.error) return page;

		ids = page.data.map((row) => row.id);
	}

	if (ids.length > 0) {
		const revision = crypto.randomUUID();
		const records = await readRecords(context, {
			source,
			ids,
			toolkit: data.toolkit,
			revision,
			options: data.options,
		});
		if (records.error) return records;

		// A replacement may use a different schema. Keep writes on that generation until cutover.
		const target =
			data.state.building_collection ?? data.state.active_collection;
		if (target === null) {
			return {
				error: { message: copy("server:plugin.typesense.index.missing") },
				data: undefined,
			};
		}

		const written = await writeBatch(context, {
			client: data.options.client,
			collection: target,
			records: records.data,
			owners: ids.map((id) => ownerId(source.key, id)),
			revision,
			checkLease: data.checkLease,
		});
		if (written.error) return written;
	}

	const checked = await data.checkLease();
	if (checked.error) return checked;

	const lastId = ids.at(-1);
	const finished =
		scan && ids.length === data.options.batchSize && lastId !== undefined
			? await Work.advance(first, lastId)
			: await Work.finish(rows);
	if (finished.error) return finished;

	return { error: undefined, data: { processed: ids.length } };
};

export default processWork;
