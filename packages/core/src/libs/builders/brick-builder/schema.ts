import z from "zod";
import { stringTranslations } from "../../../schemas/locales.js";
import constants from "../../../constants/constants.js";

const BrickConfigSchema = z.object({
	key: z
		.string()
		.refine((val) => !val.includes(constants.db.collectionKeysJoin), {
			message: `Brick key cannot contain '${constants.db.collectionKeysJoin}'`,
		}),
	details: z
		.object({
			name: stringTranslations,
			summary: stringTranslations.optional(),
		})
		.optional(),
});

export default BrickConfigSchema;
