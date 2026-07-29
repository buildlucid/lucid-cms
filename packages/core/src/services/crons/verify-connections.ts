import type { ServiceFn } from "../../utils/services/types.js";
import { resolveEffectiveConnection } from "../connection/storage.js";
import verifyConnection from "../connection/verify.js";

/** Revalidates the active connection. */
const verifyConnections: ServiceFn<[], undefined> = async (context) => {
	const connection = await resolveEffectiveConnection(context);
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
