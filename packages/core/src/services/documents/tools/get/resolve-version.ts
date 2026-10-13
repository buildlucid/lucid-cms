import constants from "../../../../constants/constants.js";
import { getTableNames } from "../../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DocumentVersionType } from "../../../../libs/db/tables/index.js";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import { DocumentVersionsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkRequestVersionAccess from "../../../requests/helpers/check-request-version-access.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import resolveProposalVersion from "../../helpers/resolve-proposal-version.js";
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
		const versionRes = await resolveProposalVersion(context, {
			requestId: pinned.id,
			collectionKey: input.collectionKey,
			documentId: input.documentId,
			user: userRes.data,
		});
		//* unreadable requests look the same as ones without this document's proposal
		if (versionRes.error?.status === 404) {
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
		if (versionRes.error) return versionRes;

		return {
			error: undefined,
			data: {
				versionType: constants.collectionBuilder.publishing.proposalVersionType,
				versionId: versionRes.data,
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
