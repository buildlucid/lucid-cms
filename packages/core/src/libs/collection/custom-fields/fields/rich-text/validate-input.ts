import type { ServiceContext } from "../../../../../types.js";
import type { FieldRelationValidationInput } from "../../types.js";
import validateMediaInputData from "../media/validate-input.js";
import validateRelationInputData from "../relation/validate-input.js";
import validateUserInputData from "../user/validate-input.js";
import type { RichTextValidationData } from "./types.js";

export const richTextMediaValidationGroup = "media";
export const richTextDocumentValidationGroupPrefix = "document:";
export const richTextUserValidationGroup = "user";

const validateRichTextInputData = async (
	context: ServiceContext,
	input: FieldRelationValidationInput,
): Promise<RichTextValidationData> => {
	const documentInput = Object.fromEntries(
		Object.entries(input).flatMap(([group, ids]) =>
			group.startsWith(richTextDocumentValidationGroupPrefix)
				? [[group.slice(richTextDocumentValidationGroupPrefix.length), ids]]
				: [],
		),
	);

	const [media, documents, users] = await Promise.all([
		validateMediaInputData(context, {
			default: input[richTextMediaValidationGroup] ?? [],
		}),
		validateRelationInputData(context, documentInput),
		validateUserInputData(context, {
			default: input[richTextUserValidationGroup] ?? [],
		}),
	]);

	const collectionKeys = new Set(Object.keys(documentInput));
	const collections = Object.fromEntries(
		context.config.collections.flatMap((collection) =>
			collectionKeys.has(collection.key)
				? [
						[
							collection.key,
							{
								fields: Array.from(collection.fields.values()).map((field) => ({
									key: field.key,
									type: field.type,
									treeParent: field.treeParent,
									structuralParent: field.structuralParent,
								})),
							},
						],
					]
				: [],
		),
	);

	return {
		media,
		documents,
		users,
		collections,
		embeddedBricks: {},
		cyclicEmbeddedBricks: [],
	};
};

export default validateRichTextInputData;
