import type { ServiceFn } from "../../../utils/services/types.js";
import runStep from "../helpers/run-step.js";
import type { DiagnosticCheckOutcome } from "./types.js";

/** Runs a trivial query against the database. */
const databaseCheck: ServiceFn<[], DiagnosticCheckOutcome> = async (
	context,
) => ({
	error: undefined,
	data: {
		adapter: context.config.db.adapter,
		steps: [
			await runStep("query", () =>
				context.db.kysely
					.selectNoFrom((eb) => eb.val(1).as("diagnostics"))
					.executeTakeFirstOrThrow(),
			),
		],
	},
});

export default databaseCheck;
