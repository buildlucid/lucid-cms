import createServiceContext from "../../../utils/services/create-service-context.js";
import type { DatabaseConnection } from "../../db/types.js";
import inlineQueueAdapter from "../../queue/adapters/inline.js";
import type { RuntimeTaskContext } from "./types.js";

/** Creates a service context using the task's connection and host adapters, running jobs inline so queued work finishes before the command's server closes. */
const createTaskServiceContext = (
	context: RuntimeTaskContext,
	database: DatabaseConnection,
) =>
	createServiceContext({
		config: context.host.config,
		database,
		translationStore: context.host.translationStore,
		env: context.env,
		runtimeContext: context.host.runtimeContext,
		...context.host.adapters,
		queue: inlineQueueAdapter(),
	});

export default createTaskServiceContext;
