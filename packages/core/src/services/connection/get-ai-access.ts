import constants from "../../constants/constants.js";
import { lucidRemoteConnectionsFormatter } from "../../libs/formatters/index.js";
import { aiAccessFeatureSchema } from "../../libs/lucid-remote/schema/connection.js";
import type { AiAccessFeature } from "../../types/response.js";
import { getUnixTimeSeconds } from "../../utils/helpers/time.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { resolveEffectiveConnection } from "./storage.js";
import verify from "./verify.js";

/**
 * Returns organisation feature access, refreshing eligible connections when the applicable interval expires.
 * @remarks Missing access allows all known features; Lucid enforces remote access.
 * Refreshes require an encrypted grant and no transaction, using the later attempt or verification time.
 * Intervals are `statusRecheckIntervalSeconds`, or `aiAccessRefreshCooldownSeconds` for `refresh`.
 */
const getAiAccess: ServiceFn<
	[
		{
			refresh?: boolean;
		},
	],
	readonly AiAccessFeature[]
> = async (context, data) => {
	const connection = await resolveEffectiveConnection(context);
	if (connection.error) return connection;

	const row = connection.data;
	const lastChecked = Math.max(
		row?.last_attempt_at ?? 0,
		row?.last_verified_at ?? 0,
	);
	const maxAge = data.refresh
		? constants.connection.aiAccessRefreshCooldownSeconds
		: constants.connection.statusRecheckIntervalSeconds;
	const status =
		row &&
		row.grant_encrypted !== null &&
		!context.db.isTransaction &&
		getUnixTimeSeconds() - lastChecked >= maxAge
			? await verify(context, { connection: row })
			: {
					error: undefined,
					data: lucidRemoteConnectionsFormatter.formatStatus(context, row),
				};
	if (status.error) return status;

	return {
		error: undefined,
		data: status.data.ai?.features ?? aiAccessFeatureSchema.options,
	};
};

export default getAiAccess;
