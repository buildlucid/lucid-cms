import { randomUUID } from "node:crypto";
import type { TransferImportMode, TransferRefs } from "@lucidcms/types";
import z from "zod";
import { copy } from "../../../libs/i18n/index.js";
import { getTransferRegistry } from "../../../libs/transfer/registry.js";
import {
	transferFileSchema,
	transferRefsSchema,
} from "../../../libs/transfer/schema.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import orderTransferEntries from "./order-entries.js";

//* entries are checked by their resource later, so anything unreadable here is passed on as it is
const uidSchema = z.object({ uid: z.string() });
const refsSchema = z.object({ refs: transferRefsSchema });

/**
 * Reads an export file into entries in the order to import them. For copies, entries that
 * aren't reused get new uids, and links between them follow.
 */
const prepareTransferImport: ServiceFn<
	[{ file: unknown; mode: TransferImportMode }],
	{
		file: z.infer<typeof transferFileSchema>;
		items: Array<{
			resource: string;
			uid: string;
			refs?: TransferRefs;
			entry: unknown;
		}>;
		/** New uids by resource, then by the uid in the file. */
		copies: Record<string, Record<string, string>>;
	}
> = async (context, data) => {
	const fileRes = transferFileSchema.safeParse(data.file);
	if (!fileRes.success) {
		return {
			error: {
				status: 400,
				message: copy("server:core.transfer.import.file.invalid"),
				zod: fileRes.error,
			},
			data: undefined,
		};
	}

	const readKeys = (entry: unknown) => {
		const uid = uidSchema.safeParse(entry);
		const refs = refsSchema.safeParse(entry);
		return {
			uid: uid.success ? uid.data.uid : "",
			refs: refs.success ? refs.data.refs : undefined,
		};
	};

	const definitions = getTransferRegistry(context.config);
	const copies: Record<string, Record<string, string>> = {};
	if (data.mode === "copy") {
		for (const [resource, entries] of Object.entries(fileRes.data.resources)) {
			const definition = definitions.get(resource);
			if (!definition?.import || definition.reuse) continue;

			const resourceCopies: Record<string, string> = {};
			for (const entry of entries) {
				const { uid } = readKeys(entry);
				if (uid) resourceCopies[uid] ??= randomUUID();
			}
			copies[resource] = resourceCopies;
		}
	}

	const items = Object.entries(fileRes.data.resources).flatMap(
		([resource, entries]) =>
			entries.map((entry) => {
				const keys = readKeys(entry);
				const refs = keys.refs
					? Object.fromEntries(
							Object.entries(keys.refs).map(([target, ids]) => [
								target,
								Object.fromEntries(
									Object.entries(ids).map(([id, uid]) => [
										id,
										copies[target]?.[uid] ?? uid,
									]),
								),
							]),
						)
					: undefined;
				const uid = copies[resource]?.[keys.uid] ?? keys.uid;

				return {
					resource,
					uid,
					refs,
					entry: isPlainObject(entry)
						? { ...entry, uid, ...(refs ? { refs } : {}) }
						: entry,
				};
			}),
	);

	return {
		error: undefined,
		data: { file: fileRes.data, items: orderTransferEntries(items), copies },
	};
};

export default prepareTransferImport;
