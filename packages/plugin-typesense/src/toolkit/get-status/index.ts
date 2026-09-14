import { copy } from "@lucidcms/core";
import { runToolkitService } from "@lucidcms/core/toolkit";
import type { ServiceFn } from "@lucidcms/core/types";
import translations from "../../../translations/en.server.json" with {
	type: "json",
};
import IndexesRepository from "../../repositories/indexes.js";
import WorkRepository from "../../repositories/work.js";
import type { ResolvedOptions } from "../../types.js";
import { inputSchema, type TypesenseGetStatusInput } from "./schema.js";

export type { TypesenseGetStatusInput } from "./schema.js";

export type TypesenseStatus = {
	index: string;
	alias: string;
	activeCollection: string | null;
	pending: number;
	sources: { key: string; pending: number }[];
	rebuild: {
		id: string;
		status: "pending" | "complete";
		processed: number;
		requestedAt: string | null;
		completedAt: string | null;
	} | null;
	worker: "idle" | "running" | "expired";
	lastError: string | null;
	lastSuccessAt: string | null;
};

const getStatus: ServiceFn<
	[TypesenseGetStatusInput, Pick<ResolvedOptions, "indexes">],
	TypesenseStatus
> = (context, input, options) =>
	runToolkitService({
		schema: inputSchema,
		input,
		name: {
			key: "plugin.typesense.status.error.name",
			defaultMessage: translations["plugin.typesense.status.error.name"],
		},
		message: {
			key: "plugin.typesense.status.error.message",
			defaultMessage: translations["plugin.typesense.status.error.message"],
		},
		handler: async (data) => {
			const index = options.indexes.find((index) => index.key === data.index);
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

			const Work = new WorkRepository(context.db);
			const [state, counts] = await Promise.all([
				Indexes.get(index.key),
				Work.counts(index.key),
			]);
			if (state.error) return state;
			if (counts.error) return counts;

			const sources = counts.data.map((row) => ({
				key: row.source_key,
				pending: Number(row.pending),
			}));

			return {
				error: undefined,
				data: {
					index: index.key,
					alias: index.alias,
					activeCollection: state.data.active_collection,
					pending: sources.reduce((total, source) => total + source.pending, 0),
					sources,
					rebuild: state.data.rebuild_id
						? {
								id: state.data.rebuild_id,
								status: state.data.building_collection ? "pending" : "complete",
								processed: state.data.rebuild_processed,
								requestedAt: state.data.rebuild_requested,
								completedAt: state.data.rebuild_completed,
							}
						: null,
					worker:
						state.data.lock_token === null
							? "idle"
							: state.data.lock_until !== null &&
									state.data.lock_until > new Date().toISOString()
								? "running"
								: "expired",
					lastError: state.data.last_error,
					lastSuccessAt: state.data.last_success,
				},
			};
		},
	});

export default getStatus;
