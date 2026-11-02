import type { TransferItemResult, TransferItemStatus } from "@types";
import type { PillVariant } from "@/components/Pill/Pill";
import type { ImportItem } from "../types";

export const statusVariants: Record<TransferItemStatus, PillVariant> = {
	created: "success-subtle",
	updated: "info-subtle",
	unchanged: "outline",
	requested: "purple-subtle",
	skipped: "outline",
	failed: "danger-subtle",
};

/** What happened to an item, or what the check planned before it's imported. */
export const itemOutcome = (item: ImportItem) => item.result ?? item.planned;

/** Links added by a later attempt don't change how the entry was imported, only its warnings. */
export const settleOutcome = (
	item: ImportItem,
	next: TransferItemResult,
): Pick<ImportItem, "result" | "createdAs"> => {
	const createdAs =
		item.createdAs ??
		(next.status === "created" || next.status === "requested"
			? next.status
			: undefined);
	if (next.status === "failed") return { result: next, createdAs };
	if (createdAs) return { result: { ...next, status: createdAs }, createdAs };
	if (item.result?.status === "updated" && next.status === "unchanged") {
		return { result: { ...next, status: "updated" }, createdAs };
	}
	return { result: next, createdAs };
};
