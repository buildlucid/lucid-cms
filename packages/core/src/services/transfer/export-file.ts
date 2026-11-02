import type { TransferEntry, TransferRefs } from "@lucidcms/types";
import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import type { ToolkitActor } from "../../libs/permission/toolkit-actor.js";
import { getTransferRegistry } from "../../libs/transfer/registry.js";
import type { TransferExportFile } from "../../libs/transfer/types.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOrCreateConnectionInstanceId from "../connection/helpers/get-or-create-instance-id.js";

/**
 * Exports selected records and linked media. `linked` includes referenced documents one level
 * deep.
 */
const exportFile: ServiceFn<
	[
		{
			actor: ToolkitActor;

			select: Record<string, unknown>;
			/** Also export documents the selected records link to. */
			linked: boolean;
		},
	],
	TransferExportFile
> = async (context, data) => {
	const definitions = getTransferRegistry(context.config);
	const queue: Array<{ resource: string; ids: string[]; depth: number }> = [];
	for (const [resource, selection] of Object.entries(data.select)) {
		if (selection === undefined) continue;

		const definition = definitions.get(resource);
		if (!definition?.export || !definition.selection) {
			return {
				error: {
					status: 400,
					message: copy("server:core.transfer.export.unsupported", {
						data: { resource },
					}),
				},
				data: undefined,
			};
		}

		const selectionRes = definition.selection.safeParse(selection);
		if (!selectionRes.success) {
			return {
				error: {
					status: 400,
					message: copy("server:core.transfer.export.selection.invalid"),
					zod: selectionRes.error,
				},
				data: undefined,
			};
		}
		queue.push({ resource, ids: selectionRes.data, depth: 0 });
	}

	//* identities found or missing, by resource, so linked records are only looked up once
	const identities = new Map<string, Map<string, string | null>>();
	const exported = new Map<string, Set<string>>();
	const resources: Record<string, TransferEntry[]> = {};

	//* the queue grows as entries link to records that are added to the export
	for (let index = 0; index < queue.length; index++) {
		const item = queue[index];
		const definition = item ? definitions.get(item.resource) : undefined;
		if (!item || !definition?.export) continue;

		const seen = exported.get(item.resource) ?? new Set<string>();
		exported.set(item.resource, seen);
		const ids = Array.from(new Set(item.ids)).filter((id) => !seen.has(id));
		if (ids.length === 0) continue;
		for (const id of ids) seen.add(id);

		const entriesRes = await definition.export(context, {
			actor: data.actor,
			ids,
			linked: item.depth > 0,
			link: async (targets) => {
				const refs: TransferRefs = {};
				for (const [resource, targetIds] of Object.entries(targets)) {
					const target = definitions.get(resource);
					if (!target) continue;

					const known = identities.get(resource) ?? new Map();
					identities.set(resource, known);
					const unknown = Array.from(new Set(targetIds)).filter(
						(id) => !known.has(id),
					);
					if (unknown.length > 0) {
						const identifiedRes = await target.identify(context, {
							ids: unknown,
						});
						if (identifiedRes.error) return identifiedRes;

						for (const id of unknown) {
							known.set(id, identifiedRes.data.get(id) ?? null);
						}
					}

					const linked: Record<string, string> = {};
					for (const id of targetIds) {
						const uid = known.get(id);
						if (uid) linked[id] = uid;
					}
					refs[resource] = linked;

					const include =
						target.include === "always" ||
						(target.include === "linked" && data.linked && item.depth === 0);
					if (include && target.export) {
						queue.push({
							resource,
							ids: Object.keys(linked),
							depth: item.depth + 1,
						});
					}
				}
				return { error: undefined, data: refs };
			},
		});
		if (entriesRes.error) return entriesRes;

		resources[item.resource] = [
			...(resources[item.resource] ?? []),
			...entriesRes.data,
		];
	}

	const instanceIdRes = await getOrCreateConnectionInstanceId(context);
	if (instanceIdRes.error) return instanceIdRes;

	return {
		error: undefined,
		data: {
			lucid: {
				format: constants.transfer.format,
				version: packageJson.version,
			},
			source: { instanceId: instanceIdRes.data, url: getBaseUrl(context) },
			exportedAt: new Date().toISOString(),
			locales: context.config.localization.locales.map((locale) => locale.code),
			resources,
		},
	};
};

export default exportFile;
