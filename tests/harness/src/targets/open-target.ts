import createDatabaseName from "../databases/create-database-name.ts";
import { getDriver } from "../databases/get-driver.ts";
import type { HarnessContext } from "../environment/types.ts";
import bootHost from "./boot-host.ts";
import type { HostTargetOptions, Target } from "./types.ts";

/**
 * Opens the CMS a lane run should test.
 * In host mode that is a new in-process CMS on its own copy of the template database.
 * In served mode it is the server the runner already started.
 */
const openTarget = async (
	context: HarnessContext,
	options?: HostTargetOptions,
): Promise<Target> => {
	const { target } = context;

	if (target.mode === "project") {
		throw new Error("Project mode runs no CMS, so there is nothing to open.");
	}

	if (target.mode === "served") {
		if (options?.adapterOverrides) {
			throw new Error("Adapters can only be replaced in host mode.");
		}
		return {
			url: target.url,
			transport: (request) => fetch(request),
			close: async () => {},
		};
	}

	const database = await getDriver(target.template.driver).clone(
		target.template.state,
		{
			directory: context.paths.work,
			name: createDatabaseName(context.runId, "db"),
		},
	);

	try {
		const host = await bootHost({
			configPath: context.setup.configPath,
			databaseUrl: database.url,
			outbox: context.paths.outbox,
			adapterOverrides: options?.adapterOverrides,
		});

		return {
			url: host.url,
			transport: host.transport,
			close: async () => {
				await host.close();
				await database.destroy();
			},
		};
	} catch (error) {
		await database.destroy();
		throw error;
	}
};

export default openTarget;
