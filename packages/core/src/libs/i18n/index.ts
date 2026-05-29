export { loadProjectTranslations } from "./load-project-translations.js";
export {
	adminTextDescriptorSchema,
	isTextDescriptor,
	isTranslatableText,
	literalTextSchema,
	serverTextDescriptorSchema,
	text,
	textDescriptorSchema,
	translatableTextSchema,
} from "./text.js";
export {
	createTranslator,
	resolveInterfaceLocale,
	translate,
} from "./translate.js";
export {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
	normalizeTranslationBundle,
	normalizeTranslationBundles,
} from "./translations.js";
export type {
	AdminTextDescriptor,
	BoundTranslateTextOptions,
	InterfaceDirection,
	LiteralText,
	LocaleDirection,
	ServerTextDescriptor,
	TextDescriptor,
	TranslatableText,
	TranslateKey,
	TranslateOptions,
	TranslateText,
	TranslateTextOptions,
	TranslationBundle,
	TranslationBundles,
	TranslationScope,
	TranslationValues,
	Translator,
	TranslatorConfig,
} from "./types.js";
export { getZodIssueText, zodTextIssue } from "./zod.js";
