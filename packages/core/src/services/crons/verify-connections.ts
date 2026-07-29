import { LucidRemoteConnectionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import verifyConnection from "../connection/verify.js";

/** Revalidates the active connection. */
const verifyConnections: ServiceFn<[], undefined> = async (context) => {
	const Connections = new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	);
	const connection = await Connections.selectEffective();
	if (connection.error) return connection;
	if (connection.data?.grant_encrypted) {
		const result = await verifyConnection(context, {
			connection: connection.data,
		});
		if (result.error) return result;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyConnections;
