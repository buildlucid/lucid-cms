import userStore from "@/store/userStore/userStore";
import { resolveSlots } from "./slot-policy";

/** The slots matching a target that the signed-in user may see, in render order. */
export const matchSlots: typeof resolveSlots = (entries, target) =>
	resolveSlots(
		entries.filter(
			(entry) =>
				entry.permission === undefined ||
				userStore.get.meetsRequirement(entry.permission),
		),
		target,
	);
