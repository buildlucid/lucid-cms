import { diagnosticsFormatter } from "../../libs/formatters/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type {
	DiagnosticCheckKey,
	DiagnosticCheckResult,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import databaseCheck from "./checks/database.js";
import emailCheck from "./checks/email.js";
import kvCheck from "./checks/kv.js";
import mediaStorageCheck from "./checks/media-storage.js";
import type { DiagnosticCheckOutcome } from "./checks/types.js";

const checks = {
	database: databaseCheck,
	kv: kvCheck,
	mediaStorage: mediaStorageCheck,
	email: emailCheck,
} satisfies Record<
	DiagnosticCheckKey,
	ServiceFn<[{ authUser: LucidAuth }], DiagnosticCheckOutcome>
>;

/**
 * Runs the requested adapter checks one after another and returns their results in the requested order.
 * @remarks Failing adapters are reported as failed results rather than errors. Repeated keys run once.
 */
const runChecks: ServiceFn<
	[{ checks: DiagnosticCheckKey[]; authUser: LucidAuth }],
	DiagnosticCheckResult[]
> = async (context, data) => {
	const results: DiagnosticCheckResult[] = [];

	for (const key of new Set(data.checks)) {
		const start = performance.now();
		const duration = () => Math.round(performance.now() - start);

		try {
			const outcome = await checks[key](context, { authUser: data.authUser });
			results.push(
				diagnosticsFormatter.formatCheckResult(
					outcome.error
						? {
								key,
								adapter: null,
								steps: [],
								duration: duration(),
								message:
									context.translate(outcome.error.message) ??
									context.translate("server:core.errors.default.message"),
							}
						: { key, duration: duration(), ...outcome.data },
				),
			);
		} catch (error) {
			results.push(
				diagnosticsFormatter.formatCheckResult({
					key,
					adapter: null,
					steps: [],
					duration: duration(),
					message: error instanceof Error ? error.message : String(error),
				}),
			);
		}
	}

	return { error: undefined, data: results };
};

export default runChecks;
