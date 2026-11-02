import type { TransferEntry, TransferFile } from "@types";
import type { TransferUpload } from "@/utils/transfer-archive";
import type { ImportItem } from "../types";
import { linkedEntries, transferKey } from "./import-entries";

/** Builds retry exports containing failed entries and their incoming and outgoing dependencies. */
export const buildFailedExports = (
	uploads: TransferUpload[],
	items: ImportItem[],
	/** Keys of the failed entries, from `transferKey`. */
	failed: ReadonlySet<string>,
): Array<{ name: string; file: TransferFile; upload: TransferUpload }> => {
	const keyOf = (item: ImportItem) =>
		transferKey(item.resource, item.entry.uid);
	const linksTo = (item: ImportItem, keys: ReadonlySet<string>) =>
		linkedEntries(item.entry).some((linked) =>
			keys.has(transferKey(linked.resource, linked.uid)),
		);

	return uploads.flatMap((upload) => {
		const own = items.filter((item) => item.upload === upload && item.valid);
		const kept = own.filter(
			(item) => failed.has(keyOf(item)) || linksTo(item, failed),
		);
		if (!kept.some((item) => failed.has(keyOf(item)))) return [];

		const linked = new Set(
			kept.flatMap((item) =>
				linkedEntries(item.entry).map((entry) =>
					transferKey(entry.resource, entry.uid),
				),
			),
		);
		const resources: Record<string, TransferEntry[]> = {};
		for (const item of [
			...kept,
			...own.filter((item) => !kept.includes(item) && linked.has(keyOf(item))),
		]) {
			resources[item.resource] = [
				...(resources[item.resource] ?? []),
				item.entry,
			];
		}

		return [
			{
				name: `${upload.name.replace(/\.(json|zip)$/i, "")}-failed`,
				file: { ...upload.file, resources },
				upload,
			},
		];
	});
};
