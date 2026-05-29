import z from "zod";
import constants from "../../../../constants/constants.js";
import { adminCopyDescriptorSchema } from "../../../i18n/index.js";
import { collectionTableParts } from "../../helpers/table-parts.js";

// TODO: merge with brickConfigSchema from schemas/collection-bricks
const BrickConfigSchema = z.object({
	key: z
		.string()
		.max(constants.db.maxBuilderKeyLength)
		.refine((val) => !val.includes(constants.db.nameSeparator), {
			message: `Brick key cannot contain '${constants.db.nameSeparator}'`,
		})
		//* these keys are reserved due to them being used in the table name generation on the same level as the brick key
		.refine((val) => val !== collectionTableParts.versions, {
			message: `Brick key cannot be '${collectionTableParts.versions}'`,
		})
		.refine((val) => val !== collectionTableParts.fields, {
			message: `Brick key cannot be '${collectionTableParts.fields}'`,
		}),
	details: z
		.object({
			name: adminCopyDescriptorSchema,
			summary: adminCopyDescriptorSchema.optional(),
		})
		.optional(),
});

export default BrickConfigSchema;
