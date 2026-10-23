import type { DatabaseConnection } from "../../db/types.js";
import type { LucidHost } from "../create-lucid-host.js";
import type { EnvironmentVariables, LucidDevBuild } from "../types.js";

/** What a runtime task runs with inside the server environment. */
export type RuntimeTaskContext = {
	host: LucidHost;
	/** The invocation's environment, for runtimes that pass bindings per request. */
	env: EnvironmentVariables | undefined;
	dev: LucidDevBuild;
	/** Opens the task's database connection lazily, with task-route cleanup when execution finishes. */
	connect: () => Promise<DatabaseConnection>;
};
