import constants from "../../../constants/constants.js";
import type { CollectionTableNames } from "../../../exports/types.js";
import collections from "../../../libs/collection/collections.js";
import type CollectionDefinition from "../../../libs/collection/definitions/collection/index.js";
import getMigrationStatus from "../../../libs/collection/get-collection-migration-status.js";
import getCurrentCollectionMigrationId from "../../../libs/collection/migration/get-current-collection-migration-id.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { LucidVersionTable } from "../../../libs/db/tables/index.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import systemActor from "../../../libs/permission/system-actor.js";
import { DocumentVersionsRepository } from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkDocumentAccess from "../../documents/checks/check-document-access.js";
import checkRequestVersionAccess, {
	type RequestVersionOwner,
} from "../../requests/helpers/check-request-version-access.js";
import checkLatestAccess from "./check-latest-access.js";

/** What a change to latest or a proposal does, which decides the access it needs. */
export type UpdatePurpose = "content" | "align" | "workflow" | "draft";

/**
 * Checks that latest or a request proposal can be changed and reads what the change needs.
 * - `content` saves content. Latest needs update access in a collection that doesn't review
 *   updates, and only create and update request proposals take content.
 * - `align` replaces content with another version. Latest is checked as for `content`, and a
 *   publish request's copy of latest can be refreshed too.
 * - `workflow` moves the workflow stage, which collections never review.
 * - `draft` checks or previews unsaved content, which people proposing changes to latest do too.
 */
const getUpdateContext: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			/** Checks the actor's access. Omit for trusted system writes. */
			authUser?: LucidActor;
			/** What the change does. Defaults to `content`. */
			purpose?: UpdatePurpose;
		},
	],
	{
		collection: CollectionDefinition;
		tableNames: CollectionTableNames;
		migrationId: number;
		versionType: Select<LucidVersionTable>["type"];
		/** Changes with every save, so callers can tell whether the version moved on. */
		contentId: string;
		/** The request that owns the version, when it is a proposal. */
		request?: RequestVersionOwner;
	}
> = async (context, data) => {
	const purpose = data.purpose ?? "content";
	const Version = new DocumentVersionsRepository(context.db);

	const collectionRes = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const [tableNamesRes, documentAccessRes] = await Promise.all([
		getTableNames(context, data.collectionKey),
		checkDocumentAccess(context, {
			collectionKey: data.collectionKey,
			id: data.documentId,
		}),
	]);
	if (tableNamesRes.error) return tableNamesRes;
	if (documentAccessRes.error) return documentAccessRes;

	if (collectionRes.data.getData.locked) {
		return {
			error: {
				type: "basic" as const,
				name: copy("server:core.error.locked.collection.name"),
				message: copy("server:core.error.locked.collection.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	const [migrationStatusRes, migrationIdRes] = await Promise.all([
		getMigrationStatus(context, { collection: collectionRes.data }),
		getCurrentCollectionMigrationId(context, data.collectionKey),
	]);
	if (migrationStatusRes.error) return migrationStatusRes;

	if (migrationStatusRes.data.requiresMigration) {
		return {
			error: {
				type: "basic" as const,
				name: copy("server:core.error.schema.migration.required.name"),
				message: copy("server:core.error.schema.migration.required.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (migrationIdRes.error) return migrationIdRes;

	const versionExistsRes = await Version.selectSingle(
		{
			select: ["id", "type", "content_id"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.versionId,
				},
				{
					key: "collection_key",
					operator: "=",
					value: data.collectionKey,
				},
				{
					key: "document_id",
					operator: "=",
					value: data.documentId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					message: copy("server:core.documents.versions.not.found.message"),
					status: 404,
				},
			},
		},
		{
			tableName: tableNamesRes.data.version,
		},
	);
	if (versionExistsRes.error) return versionExistsRes;

	let request: RequestVersionOwner | undefined;
	if (
		versionExistsRes.data.type ===
		constants.collectionBuilder.publishing.proposalVersionType
	) {
		const accessRes = await checkRequestVersionAccess(context, {
			collectionKey: data.collectionKey,
			documentId: data.documentId,
			versionId: data.versionId,
			user: data.authUser ?? systemActor,
			edit:
				purpose === "align" || purpose === "workflow" ? "manage" : "content",
		});
		if (accessRes.error) return accessRes;

		request = accessRes.data;
	} else if (versionExistsRes.data.type === "latest") {
		const latestRes = checkLatestAccess({
			collection: collectionRes.data,
			user: data.authUser,
			purpose,
		});
		if (latestRes.error) return latestRes;
	} else {
		return {
			error: {
				type: "basic" as const,
				name: copy("server:core.error.update.non.latest.version.name"),
				message: copy("server:core.error.update.non.latest.version.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			collection: collectionRes.data,
			tableNames: tableNamesRes.data,
			migrationId: migrationIdRes.data,
			versionType: versionExistsRes.data.type,
			contentId: versionExistsRes.data.content_id,
			request,
		},
	};
};

export default getUpdateContext;
