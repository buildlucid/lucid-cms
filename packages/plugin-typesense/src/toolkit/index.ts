import { defineToolkit } from "@lucidcms/core/toolkit";
import type { CoreToolkit, ServiceContext } from "@lucidcms/core/types";
import type { SyncJob } from "../jobs/types.js";
import type { ResolvedOptions } from "../types.js";
import getStatus, { type TypesenseGetStatusInput } from "./get-status/index.js";
import rebuild, { type TypesenseRebuildInput } from "./rebuild/index.js";

const createTypesenseToolkit = (
	context: ServiceContext,
	options: ResolvedOptions,
	job: SyncJob,
	core: CoreToolkit,
) => ({
	/** The server-side SDK client used for indexing and custom search routes. */
	client: options.client,
	/** Queues a rebuild and returns its durable reference. A pending rebuild is resumed. */
	rebuild: (input: TypesenseRebuildInput) =>
		rebuild(context, input, { options, job, toolkit: core }),
	/** Reads pending work, rebuild progress and the last indexing failure from Lucid. */
	getStatus: (input: TypesenseGetStatusInput) =>
		getStatus(context, input, options),
});

export type TypesenseToolkit = ReturnType<typeof createTypesenseToolkit>;

declare module "@lucidcms/core/types" {
	interface ToolkitServices {
		typesense: TypesenseToolkit;
	}
}

const toolkit = (options: ResolvedOptions, job: SyncJob) =>
	defineToolkit({
		key: "typesense",
		create: ({ context, core }) =>
			createTypesenseToolkit(context, options, job, core),
	});

export default toolkit;
