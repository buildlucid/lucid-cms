import { LucidRemoteConnectionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Forgets local credentials without depending on an available authorization server. */
const reset: ServiceFn<[], undefined> = async (context) => {
	const result = await new LucidRemoteConnectionsRepository(
		context.db,
	).updateSingle({
		data: {
			status: "disconnected",
			registration_encrypted: null,
			grant_encrypted: null,
			pending_encrypted: null,
			pending_state_hash: null,
			pending_expires_at: null,
			display: null,
			last_attempt_at: null,
			last_verified_at: null,
			error_key: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: 1 }],
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};
export default reset;
