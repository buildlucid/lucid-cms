export {
	adminCopyDescriptorSchema,
	copy,
	copyDescriptorSchema,
	isCopyDescriptor,
	isTranslatableCopy,
	literalCopySchema,
	parseCopyKey,
	serverCopyDescriptorSchema,
	translatableCopySchema,
} from "./copy.js";
export { loadTranslationSources } from "./load-project-translations.js";
export {
	default as prepareTranslations,
	writeTranslationArtifact,
} from "./prepare-translations.js";
export { createTranslationStore } from "./store.js";
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
	AdminCopyDescriptor,
	BoundTranslateCopyOptions,
	CopyDescriptor,
	InterfaceDirection,
	LiteralCopy,
	LocaleDirection,
	ServerCopyDescriptor,
	TranslatableCopy,
	TranslateCopy,
	TranslateCopyOptions,
	TranslateKey,
	TranslateOptions,
	TranslationBundle,
	TranslationBundles,
	TranslationScope,
	TranslationSource,
	TranslationStore,
	TranslationValues,
	Translator,
} from "./types.js";
