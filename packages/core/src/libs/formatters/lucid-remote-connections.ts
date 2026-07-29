import type { ConnectionStatus } from "@lucidcms/types";
import z from "zod";
import constants from "../../constants/constants.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { LucidRemoteConnections, Select } from "../db/types.js";
import { getLucidRemoteConfig } from "../lucid-remote/origin.js";
import { remoteConnectionDataSchema } from "../lucid-remote/schema/connection.js";

const displaySchema = z
	.object({
		connection: remoteConnectionDataSchema.shape.connection.nullable(),
		organisation: remoteConnectionDataSchema.shape.organisation.nullable(),
		scope: remoteConnectionDataSchema.shape.scope,
		resource: remoteConnectionDataSchema.shape.resource,
	})
	.strict();

/** Formats a connection row into its public, secret-free status payload. */
const formatStatus = (
	context: ServiceContext,
	row: Select<LucidRemoteConnections> | undefined,
): ConnectionStatus => {
	let display: z.infer<typeof displaySchema> | null = null;
	if (row?.display) {
		try {
			const parsed = displaySchema.safeParse(
				typeof row.display === "string" ? JSON.parse(row.display) : row.display,
			);
			if (parsed.success) display = parsed.data;
		} catch {
			display = null;
		}
	}

	const status = row?.status ?? "disconnected";
	const errorKey = row?.error_key ?? null;

	return {
		status,
		connection: display?.connection ?? null,
		organisation: display?.organisation ?? null,
		scope: constants.connection.scope,
		resource: getLucidRemoteConfig(context).resource,
		lastAttempt: row?.last_attempt_at ?? null,
		lastVerified: row?.last_verified_at ?? null,
		errorKey,
		warning: status === "connected" && errorKey !== null,
	};
};

export default {
	formatStatus,
};
