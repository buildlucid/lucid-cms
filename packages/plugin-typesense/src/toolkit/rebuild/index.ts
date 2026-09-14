import { copy } from "@lucidcms/core";
import { runToolkitService } from "@lucidcms/core/toolkit";
import type { CoreToolkit, ServiceFn } from "@lucidcms/core/types";
import translations from "../../../translations/en.server.json" with {
	type: "json",
};
import { LEASE_MS } from "../../constants.js";
import type { SyncJob } from "../../jobs/types.js";
import IndexesRepository from "../../repositories/indexes.js";
import beginRebuild from "../../services/begin-rebuild.js";
import type { ResolvedOptions } from "../../types.js";
import enqueueSync from "../../utils/enqueue-sync.js";
import { inputSchema, type TypesenseRebuildInput } from "./schema.js";

export type { TypesenseRebuildInput } from "./schema.js";

const rebuild: ServiceFn<
	[
		TypesenseRebuildInput,
		{ options: ResolvedOptions; job: SyncJob; toolkit: CoreToolkit },
	],
	{
		rebuildId: string;
		jobId: string;
	}
> = (context, input, dependencies) =>
	runToolkitService({
		schema: inputSchema,
		input,
		name: {
			key: "plugin.typesense.rebuild.error.name",
			defaultMessage: translations["plugin.typesense.rebuild.error.name"],
		},
		message: {
			key: "plugin.typesense.rebuild.error.message",
			defaultMessage: translations["plugin.typesense.rebuild.error.message"],
		},
		handler: async (data) => {
			const index = dependencies.options.indexes.find(
				(index) => index.key === data.index,
			);
			if (!index)
				return {
					error: {
						status: 404,
						message: copy("server:plugin.typesense.index.missing"),
					},
					data: undefined,
				};

			const Indexes = new IndexesRepository(context.db);
			const ensured = await Indexes.ensure(index.key);
			if (ensured.error) return ensured;

			const current = await Indexes.get(index.key);
			if (current.error) return current;

			let rebuildId = current.data.building_collection
				? current.data.rebuild_id
				: null;
			if (!rebuildId) {
				const token = crypto.randomUUID();
				const claimed = await Indexes.claim({
					indexKey: index.key,
					token,
					now: new Date().toISOString(),
					until: new Date(Date.now() + LEASE_MS).toISOString(),
				});
				if (claimed.error) return claimed;
				if (!claimed.data)
					return {
						error: {
							status: 409,
							message: copy("server:plugin.typesense.index.busy"),
						},
						data: undefined,
					};

				const begun =
					claimed.data.building_collection && claimed.data.rebuild_id
						? { error: undefined, data: { rebuildId: claimed.data.rebuild_id } }
						: await beginRebuild(context, { index, token });
				const released = await Indexes.release({ indexKey: index.key, token });
				if (begun.error) return begun;
				if (released.error) return released;

				rebuildId = begun.data.rebuildId;
			}
			const queued = await enqueueSync({
				toolkit: dependencies.toolkit,
				indexKey: index.key,
				job: dependencies.job,
			});
			if (queued.error) return queued;

			return {
				error: undefined,
				data: { rebuildId, jobId: queued.data.jobId },
			};
		},
	});

export default rebuild;
