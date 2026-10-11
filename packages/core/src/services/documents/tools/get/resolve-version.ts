import constants from "../../../../constants/constants.js";
import { getTableNames } from "../../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../../../libs/db/tables/index.js";
import { copy } from "../../../../libs/i18n/index.js";
import { DocumentVersionsRepository } from "../../../../libs/repositories/index.js";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkRequestVersionAccess from "../../../requests/helpers/check-request-version-access.js";
import loadRequest from "../../../requests/helpers/load-request.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import { parseAgentVersion } from "./schema.js";

/** Resolves `request:ID` or `version:ID` with owning-request access for proposals and snapshots, returning undefined for versions read by type, such as latest. */
const resolveVersion: ServiceFn<
	[
		{
			collectionKey: string;
			/** The collection's singular label, for errors. */
			collectionLabel: string;
			documentId: number;
			version: string;
			actor: ToolkitActor;
		},
	],
	| {
			versionType: DocumentVersionType;
			/** Null for latest and environments, which are read by type. */
			versionId: number | null;
			/** The request owning a proposal or snapshot. */
			requestId: number | null;
	  }
	| undefined
> = async (context, input) => {
	const pinned = parseAgentVersion(input.version);
	if (!pinned) return { error: undefined, data: undefined };

	const userRes = await resolveActorUser(context, { actor: input.actor });
	if (userRes.error) return userRes;

	if (pinned.kind === "request") {
		const requestRes = await loadRequest(context, {
			id: pinned.id,
			user: userRes.data,
		});
		if (requestRes.error) return requestRes;

		const versionId = requestRes.data.documents.find(
			(document) =>
				document.collection_key === input.collectionKey &&
				document.document_id === input.documentId &&
				document.source === "latest",
		)?.source_version_id;
		if (!versionId) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.tools.documents.proposal.not.found", {
						data: {
							requestId: pinned.id,
							collection: input.collectionLabel,
							id: input.documentId,
						},
					}),
					status: 404,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: {
				versionType: constants.collectionBuilder.publishing.proposalVersionType,
				versionId,
				requestId: pinned.id,
			},
		};
	}

	const tablesRes = await getTableNames(context, input.collectionKey);
	if (tablesRes.error) return tablesRes;

	const Versions = new DocumentVersionsRepository(context.db);
	const versionRes = await Versions.selectSingle(
		{
			select: ["id", "type"],
			where: [
				{ key: "id", operator: "=", value: pinned.id },
				{ key: "document_id", operator: "=", value: input.documentId },
			],
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.documents.version.not.found.message"),
					status: 404,
				},
			},
		},
		{ tableName: tablesRes.data.version },
	);
	if (versionRes.error) return versionRes;

	const versionType = versionRes.data.type;
	if (
		versionType ===
			constants.collectionBuilder.publishing.proposalVersionType ||
		versionType === constants.collectionBuilder.publishing.snapshotVersionType
	) {
		const accessRes = await checkRequestVersionAccess(context, {
			collectionKey: input.collectionKey,
			documentId: input.documentId,
			versionId: pinned.id,
			user: userRes.data,
		});
		if (accessRes.error) return accessRes;

		return {
			error: undefined,
			data: { versionType, versionId: pinned.id, requestId: accessRes.data.id },
		};
	}

	return {
		error: undefined,
		data: {
			versionType,
			versionId: versionType === "revision" ? pinned.id : null,
			requestId: null,
		},
	};
};

export default resolveVersion;
