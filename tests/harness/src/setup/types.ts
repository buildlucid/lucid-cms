import type { CapabilityChanges } from "../capabilities/types.ts";
import type { DatabaseKey } from "../databases/types.ts";
import type { RuntimeKey } from "../servers/types.ts";

/**
 * How a lane uses a setup.
 * - `host` runs the CMS inside the test process, with a fresh database per test file.
 * - `served` builds it and talks to the real server for its runtime.
 * - `project` runs nothing. The lane works on the setup's folder, such as timing its build.
 */
export const MODES = ["host", "served", "project"] as const;
export type Mode = (typeof MODES)[number];

/** What a setup's `setup.ts` tells the harness about the `lucid.config.ts` beside it. */
export type SetupDefinition = {
	/** One line on what this setup covers, shown in listings and reports. */
	description: string;
	/** The runtime its config uses, which decides how the harness builds and starts it. */
	runtime: RuntimeKey;
	/** The database the harness provides for it. */
	database: DatabaseKey;
	/** The modes it can run in. Defaults to all of them. */
	modes?: readonly Mode[];
	/** Corrections to the capabilities the harness reads from its config. */
	capabilities?: CapabilityChanges;
};

/** A setup found in the `setups` folder. */
export type Setup = Required<SetupDefinition> & {
	/** Its folder name. */
	name: string;
	directory: string;
	configPath: string;
};
