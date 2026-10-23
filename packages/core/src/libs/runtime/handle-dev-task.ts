import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import collectExternalMigrations from "../db/collect-external-migrations.js";
import type { DatabaseConnection } from "../db/types.js";
import type { LucidHost } from "./create-lucid-host.js";
import isDevTaskRequest from "./is-dev-task-request.js";
import runtimeTasks, { type RuntimeTaskName } from "./tasks/index.js";
import loadDevModules from "./tasks/load-dev-modules.js";
import type { EnvironmentVariables, LucidDevBuild } from "./types.js";

const isRuntimeTaskName = (name: string): name is RuntimeTaskName =>
	Object.hasOwn(runtimeTasks, name);

/** Runs authenticated runtime tasks, returning undefined for other requests, optional JSON `result` on success and HTTP 500 errors with stacks omitted for `LucidError`. */
const handleDevTask = async (props: {
	request: Request;
	host: LucidHost;
	dev: LucidDevBuild;
	/** The invocation's environment, for runtimes that pass bindings per request. */
	env?: EnvironmentVariables;
}): Promise<Response | undefined> => {
	if (!isDevTaskRequest(props.request, props.dev)) return undefined;

	const name = new URL(props.request.url).pathname.slice(
		constants.dev.taskPath.length,
	);
	if (!isRuntimeTaskName(name)) {
		return Response.json(
			{ message: `Lucid has no "${name}" task.` },
			{ status: 404 },
		);
	}

	const { config } = props.host;
	const env = props.env ?? props.host.env;
	let database: Promise<DatabaseConnection> | undefined;

	try {
		config.db.registerExternalMigrations(
			collectExternalMigrations({
				definitions: config.migrations.definitions,
				modules: await loadDevModules(props.dev.migrations),
			}),
		);

		const result = await runtimeTasks[name].execute(
			{
				host: props.host,
				env,
				dev: props.dev,
				connect: () => {
					database ??= Promise.resolve(config.db.connect(env));
					return database;
				},
			},
			await props.request.json(),
		);

		return Response.json({ result });
	} catch (error) {
		return Response.json(
			error instanceof Error
				? {
						message: error.message,
						stack: error instanceof LucidError ? undefined : error.stack,
					}
				: { message: String(error) },
			{ status: 500 },
		);
	} finally {
		await database?.then(
			(connection) => connection.destroy(),
			() => undefined,
		);
	}
};

export default handleDevTask;
