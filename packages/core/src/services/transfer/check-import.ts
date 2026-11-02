import type {
	TransferImportCheck,
	TransferImportMode,
	TransferItemResult,
} from "@lucidcms/types";
import type { ToolkitActor } from "../../libs/permission/toolkit-actor.js";
import { getTransferRegistry } from "../../libs/transfer/registry.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOrCreateConnectionInstanceId from "../connection/helpers/get-or-create-instance-id.js";
import prepareTransferImport from "./helpers/prepare-import.js";
import importEntry from "./import-entry.js";

/**
 * Plans outcomes in import order without saving.
 * @remarks Assumes bundled files exist; browsers retain them until import.
 */
const checkImport: ServiceFn<
	[{ actor: ToolkitActor; file: unknown; mode: TransferImportMode }],
	TransferImportCheck
> = async (context, data) => {
	const preparedRes = await prepareTransferImport(context, data);
	if (preparedRes.error) return preparedRes;

	const instanceIdRes = await getOrCreateConnectionInstanceId(context);
	if (instanceIdRes.error) return instanceIdRes;

	const { file, items, copies } = preparedRes.data;
	const definitions = getTransferRegistry(context.config);
	//* nothing is saved, so every entry in the file counts as still to import
	const pending = items.map(({ resource, uid }) => ({ resource, uid }));
	const results: TransferItemResult[] = [];
	for (const item of items) {
		const resultRes = await importEntry(context, {
			actor: data.actor,
			source: file.source,
			resource: item.resource,
			entry: item.entry,
			mode: data.mode,
			pending,
			dryRun: true,
		});
		if (resultRes.error) return resultRes;

		results.push(resultRes.data);
	}

	return {
		error: undefined,
		data: {
			sameSite: file.source.instanceId === instanceIdRes.data,
			resources: Object.keys(file.resources).map((key) => {
				const definition = definitions.get(key);
				const label = definition?.label;
				return {
					key,
					reuse: definition?.reuse === true,
					label: {
						singular: label ? context.translate(label.singular) : key,
						plural: label ? context.translate(label.plural) : key,
					},
				};
			}),
			items: results,
			copies,
		},
	};
};

export default checkImport;
