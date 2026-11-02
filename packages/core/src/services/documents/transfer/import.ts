import collections from "../../../libs/collection/collections.js";
import filterReadableData from "../../../libs/collection/field-access/filter-readable-data.js";
import getContentAccess from "../../../libs/collection/field-access/get-content-access.js";
import getEmbeddedBrickAccess from "../../../libs/collection/field-access/get-embedded-brick-access.js";
import { copy } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import systemActor from "../../../libs/permission/system-actor.js";
import { DocumentIdentitiesRepository } from "../../../libs/repositories/index.js";
import { documentDataSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type {
	TransferImportOutcome,
	TransferImportProps,
} from "../../../libs/transfer/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkRequestVersionAccess from "../../requests/helpers/check-request-version-access.js";
import readDocumentContent from "../helpers/read-document-content.js";
import requiresReview from "../helpers/requires-review.js";
import resolveDocumentActor from "../helpers/resolve-document-actor.js";
import resolveProposalVersion from "../helpers/resolve-proposal-version.js";
import writeSingle from "../write-single.js";
import checkTransferData from "./helpers/check-transfer-data.js";
import findImportTarget from "./helpers/find-import-target.js";
import formatLeftOut from "./helpers/format-left-out.js";
import parseDocumentId from "./helpers/parse-document-id.js";
import prepareTransferData from "./helpers/prepare-transfer-data.js";
import type { DocumentEntry } from "./schema.js";

/**
 * Imports to latest or a create request when review is required. Remaps links and warns about
 * unsupported content.
 */
const importDocument: ServiceFn<
	[TransferImportProps<DocumentEntry>],
	TransferImportOutcome
> = async (context, props) => {
	const { entry } = props;
	const collectionRes = await collections.getSingle(context, {
		key: entry.collectionKey,
	});
	if (collectionRes.error) {
		return {
			error: {
				status: 404,
				message: copy("server:core.transfer.documents.collection.missing", {
					data: { key: entry.collectionKey },
				}),
			},
			data: undefined,
		};
	}

	const collection = collectionRes.data;
	if (!collection.getData.transfer.import) {
		return {
			error: {
				status: 403,
				message: copy("server:core.transfer.documents.import.disabled"),
			},
			data: undefined,
		};
	}

	const targetRes = await findImportTarget(context, {
		collection,
		uid: entry.uid,
		existing: props.existing,
	});
	if (targetRes.error) return targetRes;

	const target = targetRes.data;
	if (target.kind !== "create" && props.mode === "skip") {
		return {
			error: undefined,
			data: {
				status: "skipped",
				id: `${collection.key}:${target.id}`,
				warnings: [],
			},
		};
	}

	const requested =
		target.kind === "proposal" ||
		(target.kind === "create" &&
			requiresReview(collection, { type: "create" }));
	//* requests check create or create-request access, and proposal edits check request access
	const actorRes = await resolveDocumentActor(context, {
		actor: props.actor,
		collectionKey: collection.key,
		action: requested ? "read" : target.kind === "create" ? "create" : "update",
	});
	if (actorRes.error) return actorRes;

	//* checks report what saving would, so the request checks run here too
	const user = actorRes.data.authUser ?? systemActor;
	if (
		target.kind === "create" &&
		requested &&
		!hasAccess({
			user,
			optionalPermissions: [
				getCollectionPermission(collection.key, "create"),
				getCollectionPermission(collection.key, "create-request"),
			],
		})
	) {
		return {
			error: {
				status: 403,
				message: copy("server:core.requests.create.permission"),
			},
			data: undefined,
		};
	}

	let versionId: number | undefined;
	if (target.kind === "proposal") {
		const versionRes = await resolveProposalVersion(context, {
			requestId: target.requestId,
			collectionKey: collection.key,
			documentId: target.id,
			user,
		});
		if (versionRes.error) return versionRes;

		const editRes = await checkRequestVersionAccess(context, {
			collectionKey: collection.key,
			documentId: target.id,
			versionId: versionRes.data,
			user,
			edit: true,
		});
		if (editRes.error) return editRes;

		versionId = versionRes.data;
	}

	const access = getContentAccess(collection, actorRes.data.authUser);
	//* restricted actors keep builder bricks they can't change, so the stored ones are needed
	const currentRes =
		target.kind !== "create" && access.restricted
			? await readDocumentContent(context, {
					collectionKey: collection.key,
					id: target.id,
					versionId,
					allowWriteLock: true,
				})
			: undefined;
	if (currentRes?.error) return currentRes;

	const prepared = prepareTransferData({
		context: {
			collection,
			localization: context.config.localization,
			access,
		},
		data: entry.data,
		localized: entry.localized,
		current: currentRes?.data
			? filterReadableData(
					collection,
					access,
					currentRes.data.data,
					currentRes.data.stored,
				)
			: undefined,
		embeddedAccess: currentRes?.data
			? getEmbeddedBrickAccess(access, currentRes.data.stored)
			: undefined,
		map: (ref) => {
			if (ref.resource === "documents") {
				const id = props.resolve("documents", `${ref.collectionKey}:${ref.id}`);
				const local = id === null ? null : parseDocumentId(id);
				return local?.collectionKey === ref.collectionKey ? local.id : null;
			}

			const id = props.resolve(ref.resource, String(ref.id));
			return id === null ? null : Number(id);
		},
	});
	const dataRes = documentDataSchema.safeParse(prepared.data);
	if (!dataRes.success) {
		return {
			error: {
				status: 400,
				message: copy("server:core.documents.authoring.structure.invalid"),
				zod: dataRes.error,
			},
			data: undefined,
		};
	}

	const warnings = formatLeftOut(context, prepared.leftOut);
	if (props.dryRun) {
		let changed = true;
		//* links held back for entries in the same import would fail validation until those entries exist
		if (!props.heldBack()) {
			const checkRes = await checkTransferData(context, {
				collection,
				data: dataRes.data,
				authUser: actorRes.data.authUser,
				current:
					target.kind === "create" ? undefined : { id: target.id, versionId },
			});
			if (checkRes.error) return checkRes;
			changed = checkRes.data.changed;
		}

		return {
			error: undefined,
			data: {
				status: requested
					? "requested"
					: target.kind === "create"
						? "created"
						: changed
							? "updated"
							: "unchanged",
				id: target.kind === "create" ? null : `${collection.key}:${target.id}`,
				warnings,
			},
		};
	}

	const write = {
		collectionKey: collection.key,
		userId: actorRes.data.userId,
		authUser: actorRes.data.authUser,
		agentRunId: actorRes.data.agentRunId,
		origin: { type: "import" },
		data: dataRes.data,
	} as const;
	const savedRes =
		target.kind === "create"
			? await writeSingle(context, {
					...write,
					kind: "create",
					uid: entry.uid,
					request: requested
						? {
								title: context.translate(
									copy("server:core.transfer.documents.request.title", {
										data: { label: entry.label },
									}),
								),
							}
						: undefined,
				})
			: await writeSingle(context, {
					...write,
					kind: "update",
					id: target.id,
					versionId,
				});
	if (savedRes.error) return savedRes;

	if (target.kind === "update" && target.adopt) {
		const DocumentIdentities = new DocumentIdentitiesRepository(context.db);
		const adoptedRes = await DocumentIdentities.updateSingle({
			data: { uid: entry.uid },
			where: [
				{ key: "collection_key", operator: "=", value: collection.key },
				{ key: "document_id", operator: "=", value: target.id },
			],
		});
		if (adoptedRes.error) return adoptedRes;
	}

	return {
		error: undefined,
		data: {
			status: requested
				? "requested"
				: target.kind === "create"
					? "created"
					: savedRes.data.changed
						? "updated"
						: "unchanged",
			id: `${collection.key}:${savedRes.data.id}`,
			warnings,
		},
	};
};

export default importDocument;
