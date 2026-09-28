import z from "zod";
import { webSourceSchema } from "../schema.js";

export const inputSchema = z.object({
	query: z.string().trim().min(1).max(2000),
});

export const outputSchema = z.object({
	results: z.array(webSourceSchema.extend({ excerpts: z.array(z.string()) })),
});
