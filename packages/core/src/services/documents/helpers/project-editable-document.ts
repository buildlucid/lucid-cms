import type z from "zod";
import {
	type ContentContext,
	getDocumentShape,
} from "../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../libs/i18n/index.js";
import { documentEditableDataSchema } from "../../../libs/toolkit/documents/authoring-values-schema.js";
import type { DocumentEditableData } from "../../../libs/toolkit/documents/types.js";
import {
	paginate,
	type paginationSchema,
} from "../../../libs/tools/pagination.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { selectFields } from "./project-document.js";
import projectEditableValue from "./project-editable-value.js";

type EditableBricks = DocumentEditableData["bricks"];

/** A brick as agents read it, tagged with where it sits in the document. */
type ProjectedBrick =
	| { key: string; type: "fixed"; fields: EditableBricks["fixed"][string] }
	| (EditableBricks["builder"][number] & { type: "builder" })
	| (EditableBricks["embedded"][number] & { type: "embedded" });

/** Projects one language's selected fields and paginated bricks, with fixed bricks first, builder bricks in page order next, and embedded bricks last. */
const projectEditableDocument = (
	context: ContentContext,
	props: {
		data: DocumentEditableData;
		contentLocale: string | null;
		fieldKeys?: readonly string[];
		includeBricks: boolean;
		bricksPage: number;
		bricksPerPage: number;
	},
): Awaited<
	ServiceResponse<{
		fields: Record<string, unknown>;
		bricks: ProjectedBrick[];
		brickPagination: z.output<typeof paginationSchema>;
	}>
> => {
	const projected = documentEditableDataSchema.safeParse(
		projectEditableValue(
			getDocumentShape(context),
			props.data,
			props.contentLocale,
		),
	);
	if (!projected.success) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.authoring.structure.invalid"),
				status: 500,
				zod: projected.error,
			},
			data: undefined,
		};
	}

	const { fixed, builder, embedded } = projected.data.bricks;
	const bricks = paginate(
		props.includeBricks
			? [
					...Object.entries(fixed).map(([key, fields]) => ({
						key,
						type: "fixed" as const,
						fields,
					})),
					...builder.map((brick) => ({ ...brick, type: "builder" as const })),
					...embedded.map((brick) => ({
						...brick,
						type: "embedded" as const,
					})),
				]
			: [],
		props.bricksPage,
		props.bricksPerPage,
	);

	return {
		error: undefined,
		data: {
			fields: selectFields(projected.data.fields, props.fieldKeys),
			bricks: bricks.data,
			brickPagination: bricks.pagination,
		},
	};
};

export default projectEditableDocument;
