import type CollectionDefinition from "../../libs/collection/definitions/collection/index.js";
import resolveCollectionLocalization from "../../libs/collection/helpers/resolve-collection-localization.js";
import getChangedLocales from "../../libs/translations/get-changed-locales.js";
import type { ContentInput } from "../../libs/translations/list-content-fields.js";
import stampTranslationSources from "../../libs/translations/stamp-translation-sources.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkDuplicateOrder from "./checks/check-duplicate-order.js";
import checkValidateBricksFields from "./checks/check-validate-bricks-fields.js";
import aggregateBrickTables from "./helpers/aggregate-brick-tables.js";
import prepareBricksAndFields from "./helpers/prepare-bricks-and-fields.js";
import insertBrickTables from "./insert-brick-tables.js";

/**
 * Saves a version's content, recording what its translations were made from.
 * @returns The locales whose values changed from `previous`, with null for shared content, or null for new content.
 */
const createMultiple: ServiceFn<
	[
		{
			versionId: number;
			previousVersionId?: number;
			documentId: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			/** The content this save replaces, so unchanged translations keep their sources. Null for new content. */
			previous: ContentInput | null;
			collection: CollectionDefinition;
			authUser?: LucidActor;
			skipValidation?: boolean;
		},
	],
	{ changedLocales: Array<string | null> | null }
> = async (context, data) => {
	// -------------------------------------------------------------------------------
	// prepare data
	const { preparedBricks, preparedFields } = prepareBricksAndFields({
		collection: data.collection,
		bricks: data.bricks,
		fields: data.fields,
		localization: context.config.localization,
	});
	const previous = data.previous
		? prepareBricksAndFields({
				collection: data.collection,
				bricks: data.previous.bricks,
				fields: data.previous.fields,
				localization: context.config.localization,
			})
		: null;
	const localization = resolveCollectionLocalization({
		localization: context.config.localization,
		collection: data.collection,
	});
	const next = { bricks: preparedBricks, fields: preparedFields };
	const previousContent = previous
		? { bricks: previous.preparedBricks, fields: previous.preparedFields }
		: null;

	stampTranslationSources({
		collection: data.collection,
		localization,
		previous: previousContent,
		next,
	});

	// -------------------------------------------------------------------------------
	// validate bricks
	if (data.skipValidation !== true) {
		const checkBrickOrderRes = checkDuplicateOrder(data.bricks || []);
		if (checkBrickOrderRes.error) return checkBrickOrderRes;

		const checkValidateRes = await checkValidateBricksFields(context, {
			collection: data.collection,
			bricks: data.bricks || [],
			fields: data.fields || [],
			authUser: data.authUser,
			existingVersion:
				data.previousVersionId === undefined
					? undefined
					: {
							id: data.previousVersionId,
							documentId: data.documentId,
						},
		});
		if (checkValidateRes.error) return checkValidateRes;
	}

	// -------------------------------------------------------------------------------
	// construct all required tables and rows grouped by prio
	const brickTables = aggregateBrickTables({
		collection: data.collection,
		documentId: data.documentId,
		versionId: data.versionId,
		localization: context.config.localization,
		bricks: preparedBricks,
		fields: preparedFields,
		tableNameByteLimit: context.config.db.config.tableNameByteLimit,
	});
	const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

	// -------------------------------------------------------------------------------
	// insert rows
	const insertRes = await insertBrickTables(context, {
		tables: sortedTables,
		collection: data.collection,
	});
	if (insertRes.error) return insertRes;

	return {
		error: undefined,
		data: {
			changedLocales: previousContent
				? [
						...getChangedLocales({
							collection: data.collection,
							localization,
							previous: previousContent,
							next,
						}),
					]
				: null,
		},
	};
};

export default createMultiple;
