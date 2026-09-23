import { findSlotConflicts } from "@lucidcms/admin/config";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import logger from "../../logger/index.js";

/** Warns when equal-priority slots compete for the same exclusive placement. */
const checkAdminSlots = (admin: ResolvedLucidConfig["admin"]) => {
	for (const conflict of findSlotConflicts(admin.slots ?? [])) {
		logger.warn({
			owner: "admin",
			message: `Admin slots "${conflict.previous}" and "${conflict.winner}" overlap at the same priority; "${conflict.winner}" wins where both match.`,
			data: conflict,
		});
	}
};

export default checkAdminSlots;
