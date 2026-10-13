import { findSlotConflicts } from "@lucidcms/admin/config";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import logger from "../../logger/index.js";
import { requirementPermissions } from "../../permission/match-permissions.js";
import { isRegisteredPermission } from "../../permission/registry.js";

/** Warns about equal-priority exclusive slots and rejects Home widgets requiring unavailable role permissions. */
const checkAdminSlots = (config: ResolvedLucidConfig) => {
	const slots = config.admin.slots ?? [];

	for (const conflict of findSlotConflicts(slots)) {
		logger.warn({
			owner: "admin",
			message: `Admin slots "${conflict.previous}" and "${conflict.winner}" overlap at the same priority; "${conflict.winner}" wins where both match.`,
			data: conflict,
		});
	}

	for (const slot of slots) {
		if (slot.slot !== "home.widget" || slot.permission === undefined) {
			continue;
		}

		const unknown = requirementPermissions(slot.permission).filter(
			(permission) => !isRegisteredPermission(config, permission),
		);
		if (unknown.length > 0) {
			throw new Error(
				`Admin slot "${slot.key}" uses unknown permissions: ${unknown.join(", ")}.`,
			);
		}
	}
};

export default checkAdminSlots;
