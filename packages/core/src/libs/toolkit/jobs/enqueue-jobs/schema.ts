import z from "zod";
import { enqueueSchema } from "../schema.js";

export const inputSchema = enqueueSchema.extend({
	payload: z.array(z.unknown()),
});
