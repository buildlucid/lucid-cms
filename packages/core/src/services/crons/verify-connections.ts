import { LucidRemoteConnectionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import verifyConnection from "../connection/verify.js";
import resolveConnectionVerificationTargets from "./helpers/resolve-connection-verification-targets.js";

/**
 * Revalidates each effective tenant connection and verifies a shared global
 * fallback only once.
 */
const verifyConnections: ServiceFn<[], undefined> = async (context) => {
	const Connections = new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	);
	const rows = await Connections.selectAll();
	if (rows.error) return rows;

	const results = await Promise.all(
		resolveConnectionVerificationTargets(context, rows.data ?? []).map(
			(connection) => verifyConnection(context, { connection }),
		),
	);
	const failed = results.find((result) => result.error);
	if (failed?.error) return failed;

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyConnections;
