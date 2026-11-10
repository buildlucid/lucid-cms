import type { Setup } from "../setup/types.ts";
import type { RunningCommand } from "../utils/run-command.ts";

/** The runtimes the harness knows how to build and start. */
export type RuntimeKey = "node" | "cloudflare";

export type ServerOptions = {
	setup: Setup;
	/** The environment the setup's config reads, including its database. */
	env: Record<string, string>;
	/** The file that collects build and server output. */
	log: string;
};

/** Builds and starts a setup's real server for one runtime. */
export type ServerLauncher = {
	/** Where a build puts its files, relative to the setup's folder. */
	output: {
		/** Everything the build writes. */
		root: string;
		/** The admin and public files inside `root`. The rest is the server. */
		assets: string;
	};
	build(options: ServerOptions): Promise<void>;
	/** Starts the server on the given local port. The caller waits for it to answer. */
	start(options: ServerOptions & { port: number }): Promise<RunningCommand>;
};
