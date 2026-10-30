import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import filterReadableContent from "../../../libs/collection/field-access/filter-readable-content.js";
import type { ContentAccess } from "../../../libs/collection/field-access/types.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import { documentBricksFormatter } from "../../../libs/formatters/index.js";
import type { RefTarget } from "../../../libs/refs/types.js";
import type { BrickQueryResponse } from "../../../libs/repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import type { Refs } from "../../../types/response.js";
import collectContentRefTargets from "./collect-content-ref-targets.js";
import prepareDuplicateContent from "./prepare-duplicate-content.js";

const targetKey = (resource: string, value: unknown, table?: string) =>
	resource === "documents"
		? `documents:${table}:${String(value)}`
		: `${resource}:${String(value)}`;

/** Filters refs to readable content, excluding hidden fields, bricks and their embedded bricks, while formatting hydrates with all refs and omits hidden values. */
const filterReadableRefs = (props: {
	access: ContentAccess;
	collection: CollectionBuilder;
	brickSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	responses: Array<BrickQueryResponse | DocumentQueryResponse>;
	config: ResolvedLucidConfig;
	host: string;
	/** Built-in refs contributed outside custom field storage, which are always kept. */
	refTargets: RefTarget[];
	refs: Refs;
}): Refs => {
	const readable = new Set(
		[
			...props.responses.flatMap((response) => {
				const format = {
					bricksQuery: response,
					bricksSchema: props.brickSchema,
					collection: props.collection,
					config: props.config,
					host: props.host,
					editable: true,
				};
				const content = filterReadableContent(
					props.access,
					prepareDuplicateContent({
						fields: documentBricksFormatter.formatDocumentFields(format),
						bricks: documentBricksFormatter.formatMultiple(format),
					}),
				);
				return collectContentRefTargets(props.collection, {
					fields: content.fields ?? [],
					bricks: content.bricks ?? [],
				});
			}),
			...props.refTargets,
		].map((target) => targetKey(target.resource, target.value, target.table)),
	);

	const { documents, media, users, emails } = props.refs;
	return {
		...props.refs,
		...(documents && {
			documents: documents.filter((document) => {
				const table = buildTableName(
					"document",
					{ collection: document.collectionKey },
					null,
				);
				return (
					!table.error &&
					readable.has(targetKey("documents", document.id, table.data.name))
				);
			}),
		}),
		...(media && {
			media: media.filter((item) => readable.has(targetKey("media", item.id))),
		}),
		...(users && {
			users: users.filter((user) => readable.has(targetKey("users", user.id))),
		}),
		...(emails && {
			emails: emails.filter((email) =>
				readable.has(targetKey("emails", email.id)),
			),
		}),
	};
};

export default filterReadableRefs;
