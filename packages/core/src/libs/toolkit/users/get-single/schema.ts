import z from "zod";
import { userReadSchema } from "../schema.js";

export const inputSchema = userReadSchema.extend({
	id: z.number().int().positive(),
});
