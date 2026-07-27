import { getUnixTimeSeconds } from "../../../utils/helpers/time.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { persistConnectionGrantState } from "../storage.js";

/** Clears a rejected grant while retaining its reusable client registration. */
const markConnectionRevoked = (context: ServiceContext, rowId: number) =>
	persistConnectionGrantState(context, rowId, null, {
		status: "revoked",
		lastAttempt: getUnixTimeSeconds(),
		errorKey: "connection_revoked",
	});

export default markConnectionRevoked;
