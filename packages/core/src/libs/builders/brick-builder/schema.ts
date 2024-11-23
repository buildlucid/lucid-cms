import z from "zod";
import { stringTranslations } from "../../../schemas/locales.js";

const BrickConfigSchema = z.object({
	details: z
		.object({
			name: stringTranslations,
			summary: stringTranslations.optional(),
		})
		.optional(),
});

export default BrickConfigSchema;
