import type {
	TransferEntry,
	TransferImportCheck,
	TransferMediaEntry,
} from "@types";
import { isObjectRecord } from "@/utils/type-guards";

const isStringRecord = (value: unknown): value is Record<string, string> =>
	isObjectRecord(value) &&
	Object.values(value).every((item) => typeof item === "string");

/** Checks for a UID and readable refs; the server reports other malformed values. */
export const isTransferEntry = (value: unknown): value is TransferEntry => {
	if (!isObjectRecord(value) || typeof value.uid !== "string") return false;
	if (value.refs === undefined) return true;

	return (
		isObjectRecord(value.refs) &&
		Object.values(value.refs).every(isStringRecord)
	);
};

export const isMediaEntry = (
	entry: TransferEntry,
): entry is TransferMediaEntry =>
	"fileName" in entry && "mimeType" in entry && "public" in entry;

/** Identifies an entry by its resource and uid, as uids only need to be unique within a resource. */
export const transferKey = (resource: string, uid: string) =>
	JSON.stringify([resource, uid]);

/** The entries an entry links to, across every resource. */
export const linkedEntries = (entry: TransferEntry) =>
	Object.entries(entry.refs ?? {}).flatMap(([resource, refs]) =>
		Object.values(refs).map((uid) => ({ resource, uid })),
	);

/** Gives an entry, and the entries it links to, the new uids a copy import assigned them. */
export const applyCopies = (
	resource: string,
	entry: TransferEntry,
	copies: TransferImportCheck["copies"],
): TransferEntry => ({
	...entry,
	uid: copies[resource]?.[entry.uid] ?? entry.uid,
	refs: entry.refs
		? Object.fromEntries(
				Object.entries(entry.refs).map(([target, refs]) => [
					target,
					Object.fromEntries(
						Object.entries(refs).map(([id, uid]) => [
							id,
							copies[target]?.[uid] ?? uid,
						]),
					),
				]),
			)
		: undefined,
});
