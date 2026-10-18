import z from "zod";
import { libraryOnlySchema } from "../schema.js";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	libraryOnly: libraryOnlySchema,
});
