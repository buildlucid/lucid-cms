import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import type { ImportItem } from "../types";
import { itemOutcome } from "../utils/import-outcome";
import { ImportRow, type ImportRowProps } from "./ImportRow";

/** One row for the media files that come with documents, listing the files that failed under it. */
export const ImportMediaGroup: Component<{
	items: ImportItem[];
	importing: boolean;
	/** Failed files can be retried once the import has finished. */
	finished: boolean;
	statusFor: (_item: ImportItem) => ImportRowProps["status"];
	onRetry: (_id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const failed = createMemo(() =>
		props.items.filter((item) => itemOutcome(item).status === "failed"),
	);
	const active = createMemo(() =>
		props.items.find(
			(item) => item.state === "uploading" || item.state === "importing",
		),
	);
	//* files are added or reused together, so the group shows the most telling outcome
	const representative = createMemo(
		() =>
			props.items.find((item) => itemOutcome(item).status === "created") ??
			props.items[0],
	);

	// ----------------------------------------
	// Functions
	const status = (item: ImportItem): ImportRowProps["status"] => {
		const current = active();
		if (current) return props.statusFor(current);
		if (failed().length > 0) {
			return {
				label: T()("transfer.import.media.failed", { count: failed().length }),
				variant: "danger-subtle",
			};
		}
		return props.statusFor(item);
	};

	// ----------------------------------------
	// Render
	return (
		<Show when={representative()}>
			{(item) => (
				<ImportRow
					icon="media"
					label={T()("transfer.import.media.title")}
					subtitle={T()("transfer.import.media.count", {
						count: props.items.length,
					})}
					status={status(item())}
					busy={active() !== undefined}
					progress={
						props.importing
							? (props.items.filter((entry) => entry.state === "done").length /
									props.items.length) *
								100
							: undefined
					}
					done={props.items.every(
						(entry) =>
							entry.state === "done" && entry.result?.status !== "failed",
					)}
					failed={failed().length > 0}
					errors={failed().map((entry) => ({
						label: entry.planned.label,
						message: itemOutcome(entry).error?.message ?? "",
						onRetry:
							props.finished && entry.valid
								? () => props.onRetry(entry.id)
								: undefined,
					}))}
				/>
			)}
		</Show>
	);
};
