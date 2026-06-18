import z from "zod";
import type {
	AdminCopyDescriptor,
	AdminCopyInput,
	CopyDescriptor,
	CopyInput,
	LiteralCopy,
	RegisteredCopyTranslationKey,
	ServerCopyDescriptor,
	TranslatableCopy,
	TranslationScope,
	TranslationValues,
} from "./types.js";

const translationValuesSchema = z
	.record(z.string(), z.union([z.string(), z.number()]).optional())
	.optional();

type DefineCopyOptions = {
	data?: TranslationValues;
	defaultMessage?: string;
};

type AdminCopyKey = `admin:${string}`;
type ServerCopyKey = `server:${string}`;
type RegisteredAdminCopyKey = Extract<
	RegisteredCopyTranslationKey,
	AdminCopyKey
>;
type RegisteredServerCopyKey = Extract<
	RegisteredCopyTranslationKey,
	ServerCopyKey
>;

type DefineCopy = {
	(
		prefixedKey: RegisteredAdminCopyKey,
		options?: DefineCopyOptions,
	): AdminCopyDescriptor;
	(
		prefixedKey: RegisteredServerCopyKey,
		options?: DefineCopyOptions,
	): ServerCopyDescriptor;
	(prefixedKey: AdminCopyKey, options?: DefineCopyOptions): AdminCopyDescriptor;
	(
		prefixedKey: ServerCopyKey,
		options?: DefineCopyOptions,
	): ServerCopyDescriptor;
	(prefixedKey: string, options?: DefineCopyOptions): CopyDescriptor;
};

type CopyHelper = DefineCopy & {
	literal: (value: string, values?: TranslationValues) => LiteralCopy;
};

/**
 * Parses a prefixed translation key into the scope used by the translation
 * store and the unprefixed key stored in translation files.
 */
export const parseCopyKey = (key: string) => {
	const separatorIndex = key.indexOf(":");
	const scope = key.slice(0, separatorIndex);
	const translationKey = key.slice(separatorIndex + 1);

	if (
		separatorIndex === -1 ||
		(scope !== "admin" && scope !== "server") ||
		translationKey.trim().length === 0
	) {
		throw new Error(
			`Lucid copy keys must start with "admin:" or "server:". Received "${key}".`,
		);
	}

	return {
		scope: scope as TranslationScope,
		key: translationKey,
	};
};

/**
 * Zod schema for any Lucid translation descriptor created by `copy`.
 */
export const copyDescriptorSchema = z
	.object({
		type: z.literal("lucid.copy"),
		scope: z.enum(["admin", "server"]),
		key: z.string().trim().min(1),
		values: translationValuesSchema,
		defaultMessage: z.string().optional(),
	})
	.strict();

/**
 * Zod schema for admin UI copy descriptors.
 */
export const adminCopyDescriptorSchema = copyDescriptorSchema.extend({
	scope: z.literal("admin"),
});

/**
 * Zod schema for server/API copy descriptors.
 */
export const serverCopyDescriptorSchema = copyDescriptorSchema.extend({
	scope: z.literal("server"),
});

/**
 * Zod schema for literal copy that can still receive interpolation data.
 */
export const literalCopySchema = z
	.object({
		type: z.literal("lucid.literal"),
		value: z.string(),
		values: translationValuesSchema,
	})
	.strict();

/**
 * Zod schema for any value Lucid can resolve through a translator.
 */
export const translatableCopySchema = z.union([
	copyDescriptorSchema,
	literalCopySchema,
]);

/**
 * Normalises copy authored in config into Lucid's internal descriptor shape.
 *
 * Plain strings become literal copy (`copy.literal`) so they flow through the
 * same translator pipeline as descriptors. Existing descriptors/literals and
 * nullish values pass through untouched.
 *
 * @example
 * ```ts
 * normalizeCopy("Posts"); // { type: "lucid.literal", value: "Posts" }
 * normalizeCopy(copy("admin:collections.posts.name")); // unchanged
 * ```
 */
export function normalizeCopy<T extends TranslatableCopy>(
	value: T | string,
): T | LiteralCopy;
export function normalizeCopy<T extends TranslatableCopy>(
	value: T | string | null,
): T | LiteralCopy | null;
export function normalizeCopy<T extends TranslatableCopy>(
	value: T | string | undefined,
): T | LiteralCopy | undefined;
export function normalizeCopy<T extends TranslatableCopy>(
	value: T | string | null | undefined,
): T | LiteralCopy | null | undefined;
export function normalizeCopy(
	value: string | TranslatableCopy | null | undefined,
) {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return { type: "lucid.literal", value } satisfies LiteralCopy;
	}
	return value;
}

/**
 * Schema for copy authored in config: accepts a plain string, a copy
 * descriptor, or a literal, and normalises strings into literal copy.
 *
 * The static output is typed as {@link CopyInput} so processed config types stay
 * compatible with their authored counterparts; at runtime the value is always a
 * descriptor or literal.
 */
export const copyInputSchema = z
	.union([z.string(), copyDescriptorSchema, literalCopySchema])
	.transform((value): CopyInput => normalizeCopy(value));

/**
 * Admin-scoped variant of {@link copyInputSchema}. Use this anywhere config
 * accepts admin UI copy so authors can pass a string instead of `copy(...)`.
 */
export const adminCopyInputSchema = z
	.union([z.string(), adminCopyDescriptorSchema, literalCopySchema])
	.transform((value): AdminCopyInput => normalizeCopy(value));

/**
 * Schema for already-normalised admin copy as it appears in API responses
 * (descriptor or literal — never a bare string). Use this in resource schemas.
 */
export const resolvedAdminCopySchema = z.union([
	adminCopyDescriptorSchema,
	literalCopySchema,
]);

/**
 * Defines translatable copy without resolving it immediately.
 *
 * Prefix keys with `admin:` for admin UI copy and `server:` for API/service
 * copy. The prefix chooses the translation group; translation files still store
 * the unprefixed key.
 *
 * @example
 * ```ts
 * import { copy } from "@lucidcms/core";
 *
 * const label = copy("admin:collections.posts.name", {
 *   defaultMessage: "Posts",
 * });
 *
 * const message = copy("server:posts.not.found", {
 *   data: { id: 12 },
 *   defaultMessage: "Post {{id}} was not found.",
 * });
 * ```
 */
function defineCopy(
	prefixedKey: RegisteredAdminCopyKey,
	options?: DefineCopyOptions,
): AdminCopyDescriptor;
function defineCopy(
	prefixedKey: RegisteredServerCopyKey,
	options?: DefineCopyOptions,
): ServerCopyDescriptor;
function defineCopy(
	prefixedKey: AdminCopyKey,
	options?: DefineCopyOptions,
): AdminCopyDescriptor;
function defineCopy(
	prefixedKey: ServerCopyKey,
	options?: DefineCopyOptions,
): ServerCopyDescriptor;
function defineCopy(
	prefixedKey: string,
	options?: DefineCopyOptions,
): CopyDescriptor;
function defineCopy(
	prefixedKey: string,
	options?: DefineCopyOptions,
): CopyDescriptor {
	const { scope, key } = parseCopyKey(prefixedKey);

	return {
		type: "lucid.copy",
		scope,
		key,
		...(options?.data ? { values: options.data } : {}),
		...(options?.defaultMessage
			? { defaultMessage: options.defaultMessage }
			: {}),
	};
}

/**
 * Describes already-written copy while keeping the value compatible with APIs
 * that accept translatable descriptors.
 */
export const copy: CopyHelper = Object.assign(defineCopy, {
	literal: (value: string, values?: TranslationValues): LiteralCopy => ({
		type: "lucid.literal",
		value,
		...(values ? { values } : {}),
	}),
});

/**
 * Checks whether a value is a Lucid admin/server copy descriptor.
 *
 * @example
 * ```ts
 * if (isCopyDescriptor(value)) {
 *   console.log(value.key);
 * }
 * ```
 */
export const isCopyDescriptor = (value: unknown): value is CopyDescriptor =>
	copyDescriptorSchema.safeParse(value).success;

/**
 * Checks whether a value can be resolved by Lucid's translation helpers.
 *
 * @example
 * ```ts
 * if (isTranslatableCopy(value)) {
 *   const message = translate(value);
 * }
 * ```
 */
export const isTranslatableCopy = (value: unknown): value is TranslatableCopy =>
	translatableCopySchema.safeParse(value).success;

export type { AdminCopyDescriptor, ServerCopyDescriptor };
