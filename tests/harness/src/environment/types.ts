import type { Capability } from "../capabilities/types.ts";
import type { DatabaseTemplate } from "../databases/types.ts";
import type { Mode, Setup } from "../setup/types.ts";

/** Where tests find the CMS: a template to boot their own copy from, a running server, or nowhere. */
export type TargetDescription =
	| { mode: "host"; template: DatabaseTemplate }
	| { mode: "served"; url: string }
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
	paths: {
		/** A scratch folder for this lane's databases and files. */
		work: string;
		/** Where the lane writes its report. */
		report: string;
	};
};
