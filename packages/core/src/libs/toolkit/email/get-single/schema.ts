import z from "zod";
import { emailReadSchema } from "../schema.js";

export const inputSchema = emailReadSchema.extend({
	id: z.number().int().positive(),
});
