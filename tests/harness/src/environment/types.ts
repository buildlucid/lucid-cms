import type { Capability } from "../capabilities/types.ts";
import type { DatabaseTemplate } from "../databases/types.ts";
import type { HarnessEnv } from "../setup/harness-env.ts";
import type { Mode, Setup } from "../setup/types.ts";

/**
 * Shared CMS resources beyond its database and address: outbox, job ledger, uploads, identity
 * provider and Lucid API. Host mode isolates each CMS's outbox and ledger.
 */
export type CmsEnv = Required<
	Pick<
		HarnessEnv,
		| "HARNESS_OUTBOX"
		| "HARNESS_LEDGER"
		| "HARNESS_UPLOADS"
		| "HARNESS_IDP_URL"
		| "LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE"
	>
>;

/** What a CMS is started with: its database and address, and the shared resources it uses. */
export type ServerEnv = CmsEnv &
	Required<Pick<HarnessEnv, "HARNESS_DATABASE_URL" | "HARNESS_URL">>;

/** Where tests find the CMS: a template to boot their own copy from, a running server, or nowhere. */
export type TargetDescription =
	| { mode: "host"; template: DatabaseTemplate }
	| {
			mode: "served";
			url: string;
			/** The folder holding the emails the server sent. */
			outbox: string;
			/** The folder holding what the server's probe jobs did. */
			ledger: string;
			/** What the server was started with, which commands run against it are given too. */
			env: ServerEnv;
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
		/** The folder holding what the setup's probe jobs did, one folder per ledger instance. */
		ledger: string;
	};
};
