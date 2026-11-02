import type { TransferImportMode, TransferItemResult } from "@lucidcms/types";
import type { ToolkitActor } from "../../libs/permission/toolkit-actor.js";
import type { TransferFileReader } from "../../libs/transfer/types.js";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkImport from "./check-import.js";
import prepareTransferImport from "./helpers/prepare-import.js";
import importEntry from "./import-entry.js";

/**
 * Imports every entry in an export file, keeping the ones that succeed when others fail.
 * Entries whose links were held back for later entries are imported again once those exist.
 */
const importFile: ServiceFn<
	[
		{
			actor: ToolkitActor;
			file: unknown;
			mode: TransferImportMode;
			/** Reads bundled files by their path in the export, eg. from a seed's folder. */
			files?: TransferFileReader;
			/** Plans each entry's outcome without saving anything. */
			dryRun?: boolean;
		},
	],
	{ items: TransferItemResult[] }
> = async (context, data) => {
	if (data.dryRun) {
		const checkRes = await checkImport(context, data);
		if (checkRes.error) return checkRes;

		return { error: undefined, data: { items: checkRes.data.items } };
	}

	const preparedRes = await prepareTransferImport(context, data);
	if (preparedRes.error) return preparedRes;

	const { file, items } = preparedRes.data;
	const pending = new Set(items);
	const importItem = (
		item: (typeof items)[number],
		mode: TransferImportMode,
		final = false,
	) => {
		const path =
			isPlainObject(item.entry) && typeof item.entry.file === "string"
				? item.entry.file
				: undefined;
		const files = data.files;
		return importEntry(context, {
			actor: data.actor,
			source: file.source,
			resource: item.resource,
			entry: item.entry,
			mode,
			pending: Array.from(pending, ({ resource, uid }) => ({ resource, uid })),
			file:
				path && files
					? async () => {
							const body = await files(path);
							return body ? { type: "body", file: body } : undefined;
						}
					: undefined,
			final,
			dryRun: false,
		});
	};

	const results: TransferItemResult[] = [];
	for (const item of items) {
		pending.delete(item);
		const resultRes = await importItem(item, data.mode);
		if (resultRes.error) return resultRes;

		//* an entry that failed on links held back is tried again, so links to it are held back too
		if (resultRes.data.status === "failed" && resultRes.data.retry) {
			pending.add(item);
		}
		results.push(resultRes.data);
	}

	//* held back links are made once what they point to exists. Passes repeat while they
	//* unlock more entries, then a last pass makes what it can and reports the rest missing.
	//* how each entry was first created in this import, by any pass
	const created = results.map((result) =>
		result.status === "created" || result.status === "requested"
			? result.status
			: undefined,
	);
	const retrying = () =>
		items.flatMap((item, index) =>
			results[index]?.retry ? [{ item, index }] : [],
		);
	let last = false;
	for (let pass = 0; pass <= items.length; pass++) {
		const batch = retrying();
		if (batch.length === 0) break;

		let progressed = false;
		for (const { item, index } of batch) {
			const previous = results[index];
			if (!previous) continue;

			pending.delete(item);
			//* entries created in this import are completed even when skipping what was already here
			const createdAs = created[index];
			const resultRes = await importItem(
				item,
				createdAs ? "upsert" : data.mode,
				last,
			);
			if (resultRes.error) return resultRes;

			const next = resultRes.data;
			if (next.status === "failed" && next.retry) pending.add(item);
			if (
				(previous.status === "failed" && next.status !== "failed") ||
				!next.retry
			) {
				progressed = true;
			}
			if (
				!createdAs &&
				(next.status === "created" || next.status === "requested")
			) {
				created[index] = next.status;
			}
			//* an entry created in this import stays created when a later pass adds its links
			results[index] =
				next.status !== "failed" && createdAs
					? { ...next, status: createdAs }
					: next;
		}

		if (last) break;
		if (!progressed) {
			pending.clear();
			last = true;
		}
	}

	//* every pass has run, so nothing is left to retry
	return {
		error: undefined,
		data: { items: results.map((result) => ({ ...result, retry: false })) },
	};
};

export default importFile;
