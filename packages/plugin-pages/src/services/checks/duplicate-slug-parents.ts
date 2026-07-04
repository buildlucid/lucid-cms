import { copy, prefixGeneratedColName } from "@lucidcms/core/plugin";
import type {
	CollectionTableNames,
	DocumentVersionType,
	FieldError,
	FieldInputSchema,
	ServiceFn,
} from "@lucidcms/core/types";
import { sql } from "kysely";
import constants from "../../constants.js";
import applyTenantScope from "../../utils/apply-tenant-scope.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import getParentPageRelationTable from "../../utils/get-parent-page-relation-table.js";
import normalizePathValue from "../../utils/normalize-path-value.js";

/**
 *  Query for documents that have the same slug and parentPage relation for each slug translation (would cause duplicate fullSlug)
 */
const checkDuplicateSlugParents: ServiceFn<
	[
		{
			documentId: number;
			versionId: number;
			versionType: Exclude<DocumentVersionType, "revision">;
			collectionKey: string;
			tenantKey: string | null;
			fields: {
				slug: FieldInputSchema;
				parentPage: FieldInputSchema;
			};
			tables: CollectionTableNames;
		},
	],
	undefined
> = async (context, data) => {
	try {
		const parentPageId = getParentPageId(data.fields.parentPage);
		const {
			document: documentTable,
			version: versionTable,
			documentFields: fieldsTable,
		} = data.tables;

		const slugConditions = Object.entries(data.fields.slug.translations || {})
			.map(([localeCode, slug]) => ({
				localeCode,
				slug: normalizePathValue(slug),
			}))
			.filter((item): item is { localeCode: string; slug: string } => {
				return typeof item.slug === "string";
			});

		if (data.fields.slug.value) {
			slugConditions.push({
				localeCode: context.config.localization.defaultLocale,
				slug: normalizePathValue(data.fields.slug.value) || "/",
			});
		}

		if (slugConditions.length === 0) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const slugColumn = prefixGeneratedColName(constants.fields.slug.key);
		const parentPageColumn = prefixGeneratedColName("document_id");
		const parentPageTableRes = getParentPageRelationTable(
			data.collectionKey,
			context.config.db.config.tableNameByteLimit,
		);
		if (parentPageTableRes.error) return parentPageTableRes;
		const parentPageTable = parentPageTableRes.data;

		const duplicatesQuery = context.db.client
			.selectFrom(documentTable)
			.leftJoin(
				versionTable,
				// @ts-expect-error
				`${versionTable}.document_id`,
				`${documentTable}.id`,
			)
			.leftJoin(
				fieldsTable,
				// @ts-expect-error
				`${fieldsTable}.document_version_id`,
				`${versionTable}.id`,
			)
			// @ts-expect-error
			.leftJoin(
				parentPageTable,
				`${parentPageTable}.parent_id`,
				`${fieldsTable}.id`,
			)
			.select([
				`${documentTable}.id`,
				`${documentTable}.collection_key`,
				`${fieldsTable}.${slugColumn}`,
				`${fieldsTable}.locale`,
				`${parentPageTable}.${parentPageColumn}`,
			])
			// @ts-expect-error
			.where(({ eb, and, or }) =>
				and([
					or(
						slugConditions.map(({ localeCode, slug }) =>
							and([
								eb(
									sql<string>`lower(${sql.ref(`${fieldsTable}.${slugColumn}`)})`,
									"=",
									slug,
								),
								localeCode
									? eb(`${fieldsTable}.locale`, "=", localeCode)
									: eb(`${fieldsTable}.locale`, "is", null),
							]),
						),
					),
					parentPageId !== null
						? eb(`${parentPageTable}.${parentPageColumn}`, "=", parentPageId)
						: eb(`${parentPageTable}.${parentPageColumn}`, "is", null),
					eb(`${versionTable}.type`, "=", data.versionType),
				]),
			)
			.where(`${documentTable}.id`, "!=", data.documentId || null)
			.where(`${documentTable}.collection_key`, "=", data.collectionKey)
			.where(
				`${documentTable}.is_deleted`,
				"=",
				context.config.db.getDefault("boolean", "false"),
			);

		const duplicates = (await applyTenantScope(duplicatesQuery, {
			tenantKey: data.tenantKey,
			column: `${documentTable}.tenant_key`,
		}).execute()) as Array<Record<string, unknown> & { locale: string | null }>;

		if (duplicates.length > 0) {
			const fieldErrors: FieldError[] = [];
			for (const duplicate of duplicates) {
				const duplicateParentPage = duplicate[parentPageColumn];
				fieldErrors.push({
					key: constants.fields.slug.key,
					localeCode: duplicate.locale ?? null,
					message:
						duplicateParentPage === null || duplicateParentPage === undefined
							? copy("server:plugin.pages.slug.duplicate")
							: copy("server:plugin.pages.slug.parent.duplicate"),
				});
			}
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:plugin.pages.slug.duplicate"),
					errors: {
						fields: fieldErrors,
					},
				},
				data: undefined,
			};
		}
		return {
			error: undefined,
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.slug.duplicate.check.failed"),
			},
			data: undefined,
		};
	}
};

export default checkDuplicateSlugParents;
