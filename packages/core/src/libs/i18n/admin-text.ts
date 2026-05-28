import z from "zod";
import type { AdminText } from "./types.js";

export const adminTextSchema = z
	.object({
		type: z.literal("admin-text"),
		key: z.string().trim().min(1),
		fallback: z.string().optional(),
	})
	.strict();

/**
 * Defines translatable admin copy in config.
 * The fallback is used when no core, plugin, or project translation exists.
 * Project translations live in `translations/<locale>.admin.json`.
 *
 * ```ts
 * name: adminText("collections.page.name", { fallback: "Pages" })
 * ```
 */
export const adminText = (
	key: string,
	options?: {
		fallback?: string;
	},
): AdminText => ({
	type: "admin-text",
	key,
	...(options?.fallback ? { fallback: options.fallback } : {}),
});

export const isAdminText = (value: unknown): value is AdminText =>
	adminTextSchema.safeParse(value).success;
