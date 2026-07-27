import constants from "../../constants/constants.js";
import { lucidRemoteConnectionsFormatter } from "../../libs/formatters/index.js";
import type { ConnectionStatus } from "../../types/response.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { resolveEffectiveConnection } from "./storage.js";
import verify from "./verify.js";

const status: ServiceFn<[], ConnectionStatus> = async (context) => {
	const resolved = await resolveEffectiveConnection(context);
	if (resolved.error) return resolved;

	const snapshot = lucidRemoteConnectionsFormatter.formatStatus(
		context,
		resolved.data,
	);
	const now = getUnixTimeSeconds();

	if (
		resolved.data &&
		resolved.data.grant_encrypted !== null &&
		(snapshot.lastVerified === null ||
			now - snapshot.lastVerified >
				constants.connection.statusRecheckIntervalSeconds)
	) {
		return verify(context, { connection: resolved.data });
	}

	return {
		error: undefined,
		data: snapshot,
	};
};

export default status;
