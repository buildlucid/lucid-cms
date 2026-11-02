import type { TransferRefs } from "@lucidcms/types";
import collections from "../../../libs/collection/collections.js";
import filterReadableData from "../../../libs/collection/field-access/filter-readable-data.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import { copy } from "../../../libs/i18n/index.js";
import type { TransferExportProps } from "../../../libs/transfer/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import readDocumentContent from "../helpers/read-document-content.js";
import resolveDocumentActor from "../helpers/resolve-document-actor.js";
import getLocalizedKeys from "./helpers/get-localized-keys.js";
import getTransferLabel from "./helpers/get-transfer-label.js";
import parseDocumentId from "./helpers/parse-document-id.js";
import prepareTransferData from "./helpers/prepare-transfer-data.js";
import identifyDocuments from "./identify.js";
import type { DocumentEntry } from "./schema.js";

/**
 * Exports the latest content of documents the actor can read, with every locale and the uids of what they link to.
 * @remarks Hidden fields are left out, so importing the file keeps their stored values.
 */
const exportDocuments: ServiceFn<
	[TransferExportProps],
	DocumentEntry[]
> = async (context, props) => {
	const uidsRes = await identifyDocuments(context, { ids: props.ids });
	if (uidsRes.error) return uidsRes;

	const byCollection = Map.groupBy(
		props.ids.flatMap((id) => parseDocumentId(id) ?? []),
		(ref) => ref.collectionKey,
	);

	const exported: Array<{
		entry: Omit<DocumentEntry, "refs">;
		targets: Record<string, Set<string>>;
	}> = [];
	for (const [collectionKey, refs] of byCollection) {
		const collectionRes = await collections.getSingle(context, {
			key: collectionKey,
		});
		if (collectionRes.error) {
			if (props.linked) continue;
			return collectionRes;
		}
		if (!collectionRes.data.getData.transfer.export) {
			if (props.linked) continue;
			return {
				error: {
					status: 403,
					message: copy("server:core.transfer.documents.export.disabled"),
				},
				data: undefined,
			};
		}

		const actorRes = await resolveDocumentActor(context, {
			actor: props.actor,
			collectionKey,
			action: "read",
		});
		if (actorRes.error) {
			if (props.linked) continue;
			return actorRes;
		}

		const access = getContentAccess(collectionRes.data, actorRes.data.authUser);
		const structure = {
			collection: collectionRes.data,
			localization: context.config.localization,
		};
		const localized = getLocalizedKeys(structure);
		for (const ref of refs) {
			const id = `${collectionKey}:${ref.id}`;
			const uid = uidsRes.data.get(id);
			if (!uid) {
				if (props.linked) continue;
				return {
					error: {
						status: 404,
						message: copy("server:core.documents.authoring.content.not.found"),
					},
					data: undefined,
				};
			}

			const contentRes = await readDocumentContent(context, {
				collectionKey,
				id: ref.id,
			});
			if (contentRes.error) {
				if (props.linked) continue;
				return contentRes;
			}

			const data = filterReadableData(
				collectionRes.data,
				access,
				contentRes.data.data,
				contentRes.data.stored,
			);
			const targets: Record<string, Set<string>> = {};
			//* walks the values the way imports do, only to collect what they link to
			prepareTransferData({
				context: structure,
				data,
				map: (target) => {
					const value =
						target.resource === "documents"
							? `${target.collectionKey}:${target.id}`
							: String(target.id);
					targets[target.resource] ??= new Set();
					targets[target.resource]?.add(value);
					return target.id;
				},
			});

			exported.push({
				entry: {
					uid,
					collectionKey,
					label: getTransferLabel(context, {
						collection: collectionRes.data,
						data,
						documentId: ref.id,
					}),
					localized,
					data,
				},
				targets,
			});
		}
	}

	const linkedTargets: Record<string, string[]> = {};
	for (const { targets } of exported) {
		for (const [resource, values] of Object.entries(targets)) {
			linkedTargets[resource] = [...(linkedTargets[resource] ?? []), ...values];
		}
	}
	const linkRes = await props.link(linkedTargets);
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: exported.map(({ entry, targets }) => {
			const refs: TransferRefs = {};
			for (const [resource, values] of Object.entries(targets)) {
				const uids = linkRes.data[resource] ?? {};
				for (const value of values) {
					const uid = uids[value];
					if (uid === undefined) continue;
					refs[resource] ??= {};
					refs[resource][value] = uid;
				}
			}
			return Object.keys(refs).length > 0 ? { ...entry, refs } : entry;
		}),
	};
};

export default exportDocuments;
