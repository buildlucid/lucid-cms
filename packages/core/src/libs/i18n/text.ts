import z from "zod";
import type {
	AdminTextDescriptor,
	LiteralText,
	ServerTextDescriptor,
	TextDescriptor,
	TranslatableText,
	TranslationScope,
	TranslationValues,
} from "./types.js";

const translationValuesSchema = z
	.record(z.string(), z.union([z.string(), z.number()]).optional())
	.optional();

type DefineTextOptions = {
	data?: TranslationValues;
	defaultMessage?: string;
};

export const textDescriptorSchema = z
	.object({
		type: z.literal("lucid.text"),
		scope: z.enum(["admin", "server"]),
		key: z.string().trim().min(1),
		values: translationValuesSchema,
		defaultMessage: z.string().optional(),
	})
	.strict();

export const adminTextDescriptorSchema = textDescriptorSchema.extend({
	scope: z.literal("admin"),
});

export const serverTextDescriptorSchema = textDescriptorSchema.extend({
	scope: z.literal("server"),
});

export const literalTextSchema = z
	.object({
		type: z.literal("lucid.literal"),
		value: z.string(),
		values: translationValuesSchema,
	})
	.strict();

export const translatableTextSchema = z.union([
	textDescriptorSchema,
	literalTextSchema,
]);

const defineText = <TScope extends TranslationScope>(
	scope: TScope,
	key: string,
	options?: DefineTextOptions,
): TextDescriptor<TScope> => ({
	type: "lucid.text",
	scope,
	key,
	...(options?.data ? { values: options.data } : {}),
	...(options?.defaultMessage
		? { defaultMessage: options.defaultMessage }
		: {}),
});

export const text = {
	admin: (key: string, options?: DefineTextOptions): AdminTextDescriptor =>
		defineText("admin", key, options),
	server: (key: string, options?: DefineTextOptions): ServerTextDescriptor =>
		defineText("server", key, options),
	literal: (value: string, values?: TranslationValues): LiteralText => ({
		type: "lucid.literal",
		value,
		...(values ? { values } : {}),
	}),
};

export const isTextDescriptor = (value: unknown): value is TextDescriptor =>
	textDescriptorSchema.safeParse(value).success;

export const isTranslatableText = (value: unknown): value is TranslatableText =>
	translatableTextSchema.safeParse(value).success;
