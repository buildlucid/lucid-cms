import type { TransferImportMode, TransferItemResult } from "@lucidcms/types";
import { copy } from "../../libs/i18n/index.js";
import type { ToolkitActor } from "../../libs/permission/toolkit-actor.js";
import createToolkit from "../../libs/toolkit/create-toolkit.js";
import { getTransferRegistry } from "../../libs/transfer/registry.js";
import type {
	TransferFileSource,
	TransferImportOutcome,
	TransferImportProps,
} from "../../libs/transfer/types.js";
import { LucidError } from "../../utils/errors/index.js";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import runHandler from "../../utils/services/run-handler.js";
import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import getOrCreateConnectionInstanceId from "../connection/helpers/get-or-create-instance-id.js";
import formatItemError from "./helpers/format-item-error.js";
import formatMissingLinks from "./helpers/format-missing-links.js";
import transferKey from "./helpers/transfer-key.js";

/**
 * Matches records by UID. Defers links to pending entries for retry and warns about missing
 * targets.
 * @remarks Returns failures as row results so other entries can continue.
 */
const importEntry: ServiceFn<
	[
		{
			actor: ToolkitActor;
			/** The site the file was exported from. */
			source: { instanceId: string };
			resource: string;
			entry: unknown;
			mode: TransferImportMode;
			/** Entries later in the same import, whose links are held back until they're imported. */
			pending: Iterable<{ resource: string; uid: string }>;
			/** Reads the entry's bundled file, if there is one. */
			file?: () => Promise<TransferFileSource | undefined>;
			/** The last attempt, so links that can't be made are reported instead of held back. */
			final?: boolean;
			dryRun: boolean;
		},
	],
	TransferItemResult
> = async (context, data) => {
	const uid =
		isPlainObject(data.entry) && typeof data.entry.uid === "string"
			? data.entry.uid
			: "";
	const row: TransferItemResult = {
		resource: data.resource,
		uid,
		label: uid,
		status: "failed",
		id: null,
		warnings: [],
		error: null,
		retry: false,
	};

	const definitions = getTransferRegistry(context.config);
	const definition = definitions.get(data.resource);
	if (!definition?.import || !definition.entry) {
		return {
			error: undefined,
			data: {
				...row,
				error: formatItemError(context, {
					status: 400,
					message: copy("server:core.transfer.import.unsupported", {
						data: { resource: data.resource },
					}),
				}),
			},
		};
	}

	const entryRes = definition.entry.safeParse(data.entry);
	if (!entryRes.success) {
		return {
			error: undefined,
			data: {
				...row,
				error: formatItemError(context, {
					status: 400,
					message: copy("server:core.transfer.import.entry.invalid"),
					zod: entryRes.error,
				}),
			},
		};
	}

	const entry = entryRes.data;
	row.label = definition.describe?.(entry) ?? entry.uid;

	const instanceIdRes = await getOrCreateConnectionInstanceId(context);
	if (instanceIdRes.error) return instanceIdRes;
	const sameSite = data.source.instanceId === instanceIdRes.data;

	const toolkit = createToolkit(context);
	const matchRes = await runHandler(() =>
		definition.match({ context, toolkit, uids: [entry.uid], sameSite }),
	);
	if (matchRes.error) {
		return {
			error: undefined,
			data: { ...row, error: formatItemError(context, matchRes.error) },
		};
	}

	const existing = matchRes.data.get(entry.uid);
	if (existing !== undefined && data.mode === "skip" && !definition.reuse) {
		return {
			error: undefined,
			data: { ...row, status: "skipped", id: existing },
		};
	}

	const linked = new Map<string, Map<string, string>>();
	for (const [resource, refs] of Object.entries(entry.refs ?? {})) {
		const target = definitions.get(resource);
		if (!target) continue;

		const linkedRes = await runHandler(() =>
			target.match({
				context,
				toolkit,
				uids: Array.from(new Set(Object.values(refs))),
				sameSite,
			}),
		);
		if (linkedRes.error) {
			return {
				error: undefined,
				data: { ...row, error: formatItemError(context, linkedRes.error) },
			};
		}
		linked.set(resource, linkedRes.data);
	}

	const pending = new Set(
		Array.from(data.pending, (item) => transferKey(item.resource, item.uid)),
	);
	//* a new entry linking to itself can only link once it exists
	if (existing === undefined && !data.final) {
		pending.add(transferKey(data.resource, entry.uid));
	}

	const missing = new Map<string, Set<string>>();
	let heldBack = false;
	const importProps: TransferImportProps<typeof entry> = {
		actor: data.actor,
		entry,
		existing,
		mode: data.mode,
		resolve: (resource, id) => {
			const target = entry.refs?.[resource]?.[id];
			const local =
				target === undefined ? undefined : linked.get(resource)?.get(target);
			if (local !== undefined) return local;

			if (target !== undefined && pending.has(transferKey(resource, target))) {
				heldBack = true;
			} else {
				const uids = missing.get(resource) ?? new Set<string>();
				uids.add(target ?? id);
				missing.set(resource, uids);
			}
			return null;
		},
		heldBack: () => heldBack,
		file: data.file ?? (async () => undefined),
		dryRun: data.dryRun,
	};
	let outcomeRes: Awaited<ServiceResponse<TransferImportOutcome>>;
	try {
		outcomeRes = {
			error: undefined,
			data: await definition.import({ context, toolkit, ...importProps }),
		};
	} catch (error) {
		//* a malformed value shouldn't stop the rest of an import
		outcomeRes = {
			error:
				error instanceof LucidError
					? { ...error.error }
					: {
							status: 400,
							message:
								error instanceof Error
									? copy.literal(error.message)
									: copy("server:core.transfer.import.entry.invalid"),
						},
			data: undefined,
		};
	}
	if (outcomeRes.error) {
		return {
			error: undefined,
			data: {
				...row,
				error: formatItemError(context, outcomeRes.error),
				retry: heldBack,
			},
		};
	}

	return {
		error: undefined,
		data: {
			...row,
			status: outcomeRes.data.status,
			id: outcomeRes.data.id,
			warnings: [
				...outcomeRes.data.warnings,
				...formatMissingLinks(context, definitions, missing),
			],
			retry: heldBack,
		},
	};
};

export default importEntry;
