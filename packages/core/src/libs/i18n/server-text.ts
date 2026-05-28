import z from "zod";
import {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
} from "./translations.js";
import type { ServerText, TranslationData } from "./types.js";

export const serverTextSchema = z
	.object({
		type: z.literal("server-text"),
		key: z.string().trim().min(1),
		default: z.string(),
		priority: z.string().optional(),
		fallback: z.string().optional(),
		data: z
			.record(z.string(), z.union([z.string(), z.number()]).optional())
			.optional(),
	})
	.strict();

/**
 * Defines translatable server/API copy without translating it immediately.
 *
 * ```ts
 * message: serverText("core.media.not.found")
 * ```
 */
export const serverText = (
	key: string,
	options?: {
		priority?: string;
		fallback?: string;
		data?: TranslationData;
	},
): ServerText => {
	const bundles = mergeTranslationBundles(coreTranslations);
	const fallback = options?.fallback ?? bundles.en?.server[key] ?? key;

	return {
		type: "server-text",
		key,
		default: formatTranslation(fallback, options?.data),
		...(options?.priority ? { priority: options.priority } : {}),
		...(options?.fallback ? { fallback: options.fallback } : {}),
		...(options?.data ? { data: options.data } : {}),
	};
};

export const isServerText = (value: unknown): value is ServerText =>
	serverTextSchema.safeParse(value).success;
