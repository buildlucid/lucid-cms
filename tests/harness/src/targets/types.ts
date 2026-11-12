import type { createLucidHost } from "@lucidcms/core/runtime";
import type { KyselyDB } from "@lucidcms/core/types";
import type { Variant } from "../../../shared/variants.ts";
import type { Transport } from "../client/types.ts";
import type { CliRun } from "../migrations/types.ts";

/** A CMS that tests can send requests to. */
export type Target = {
	/** The address its requests are made against. */
	url: string;
	transport: Transport;
	/** The folder holding the emails this CMS sent. */
	outbox: string;
	/** The folder holding what this CMS's probe jobs did. Host mode gives each CMS its own. */
	ledger: string;
	/** The folder Node setups store this CMS's uploads in. Host mode gives each CMS its own. */
	uploads: string;
	/** Runs a CLI command against the live CMS database, e.g. `lucid.cli("seed", "starter")`. */
	cli(...args: string[]): Promise<CliRun>;
	/** Runs queries on the CMS's database. Only an in-process CMS has one to hand. */
	query?: <Result>(
		use: (kysely: KyselyDB) => Promise<Result>,
	) => Promise<Result>;
	close(): Promise<void>;
};

/** Adapters an in-process CMS uses instead of its configured ones. */
export type AdapterOverrides = Parameters<
	typeof createLucidHost
>[0]["adapterOverrides"];

export type HostTargetOptions = {
	/**
	 * Replaces adapters on an in-process CMS, such as a queue that fails on purpose. A function is
	 * given the folder the CMS stores uploads in, for storage that wraps the real one.
	 */
	adapterOverrides?:
		| AdapterOverrides
		| ((cms: {
				uploads: string;
		  }) => AdapterOverrides | Promise<AdapterOverrides>);
	/** Runs the CMS with a variant of the setup's config. See `shared/variants.ts`. */
	variant?: Variant;
};
