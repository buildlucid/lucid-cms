import type { Refs } from "../../exports/types.js";
import collections from "../../libs/collection/collections.js";
import buildTableName from "../../libs/collection/helpers/build-table-name.js";
import { getBricksTableSchema } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	emailsTable,
	mediaTable,
	usersTable,
} from "../../libs/db/tables/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { Permissions } from "../../libs/permission/definitions.js";
import hasAccess from "../../libs/permission/has-access.js";
import type { RefTarget } from "../../libs/refs/types.js";
import type { LucidUser } from "../../types/hono.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveDocumentRefs from "./helpers/resolve-document-refs.js";

/**
 * Loads missing editor references, returning only items visible to the user in the matching
 * picker.
 */
const getEditorRefs: ServiceFn<
	[
		{
			/** The collection of the document being edited. */
			collectionKey: string;
			user: LucidUser;
			documents: Array<{ collectionKey: string; id: number }>;
			media: number[];
			users: number[];
			emails: number[];
		},
	],
	Refs
> = async (context, data) => {
	const [collectionRes, collectionsRes, schemaRes] = await Promise.all([
		collections.getSingle(context, { key: data.collectionKey }),
		collections.getAll(context, {}),
		getBricksTableSchema(context, data.collectionKey),
	]);
	if (collectionRes.error) return collectionRes;
	if (collectionsRes.error) return collectionsRes;
	if (schemaRes.error) return schemaRes;

	const targets: RefTarget[] = [];

	for (const document of data.documents) {
		const collection = collectionsRes.data.find(
			(item) => item.key === document.collectionKey,
		);
		if (!collection) continue;

		const readable = hasAccess({
			user: data.user,
			requiredPermissions: [
				resolveCollectionPermission({ collection, action: "read" }),
			],
		});
		if (!readable) continue;

		const tableRes = buildTableName(
			"document",
			{ collection: collection.key },
			context.config.db.config.tableNameByteLimit,
		);
		if (tableRes.error) return tableRes;

		targets.push({
			resource: "documents",
			table: tableRes.data.name,
			value: document.id,
		});
	}
	for (const id of data.media) {
		targets.push({ resource: "media", table: mediaTable.name, value: id });
	}
	for (const id of data.users) {
		targets.push({ resource: "users", table: usersTable.name, value: id });
	}
	//* the email picker needs email:read, so without it nothing is returned
	if (
		hasAccess({ user: data.user, requiredPermissions: [Permissions.EmailRead] })
	) {
		for (const id of data.emails) {
			targets.push({ resource: "emails", table: emailsTable.name, value: id });
		}
	}

	//* passed targets are kept for restricted readers, and the reader trims related documents' hidden fields
	const refsRes = await resolveDocumentRefs(context, {
		collection: collectionRes.data,
		collections: collectionsRes.data,
		brickSchema: schemaRes.data,
		responses: [],
		versionType: "latest",
		refResources: "all",
		refTargets: targets,
		host: getBaseUrl(context),
		reader: data.user,
		//* library media with media:read, plus the user's own
		mediaActor: { type: "user", user: data.user },
	});
	if (refsRes.error) return refsRes;

	return { error: undefined, data: refsRes.data.refs ?? {} };
};

export default getEditorRefs;
