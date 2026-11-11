import type { HarnessEnv } from "../../../shared/config.ts";
import type { Capability } from "../capabilities/types.ts";
import type { DatabaseTemplate } from "../databases/types.ts";
import type { Mode, Setup } from "../setup/types.ts";

/**
 * Shared CMS resources beyond its database and address: outbox, uploads, identity provider and
 * Lucid API. Host mode isolates each CMS's outbox.
 */
export type CmsEnv = Required<
	Pick<
		HarnessEnv,
		| "HARNESS_OUTBOX"
		| "HARNESS_UPLOADS"
		| "HARNESS_IDP_URL"
		| "LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE"
	>
>;

/** Where tests find the CMS: a template to boot their own copy from, a running server, or nowhere. */
export type TargetDescription =
	| { mode: "host"; template: DatabaseTemplate }
	| {
			mode: "served";
			url: string;
			/** The folder holding the emails the server sent. */
			outbox: string;
	  }
	| { mode: "project" };

/**
 * Everything one lane run needs to know. The runner writes it to a file and passes the path in
 * `HARNESS_CONTEXT`, so any test runner in any process can read it.
 */
export type HarnessContext = {
	runId: string;
	setup: Pick<
		Setup,
		"name" | "directory" | "configPath" | "runtime" | "database"
	>;
	lane: string;
	mode: Mode;
	capabilities: Capability[];
	target: TargetDescription;
	/** Drives every random choice in a run, so a failure can be replayed with `--seed`. */
	seed: number;
	/** How many random sequences each simulation tries. */
	simulationRuns: number;
	/** How many samples each benchmark takes. */
	performanceRuns: number;
	/** How many test workers the lane may use, so lanes running side by side share the machine. */
	workers: number;
	/** What the setup's CMSs are given. See `CmsEnv`. */
	cmsEnv: CmsEnv;
	paths: {
		/** A scratch folder for this lane's databases and files. */
		work: string;
		/** Where the lane writes its report. */
		report: string;
		/** Where the lane appends progress events while it runs. See `progress/types.ts`. */
		events: string;
		/** The folder holding the emails the setup's CMSs send, one folder per outbox instance. */
		outbox: string;
	};
};
