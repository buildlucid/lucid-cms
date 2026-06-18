export {
	adminCopyDescriptorSchema,
	adminCopyInputSchema,
	copy,
	copyDescriptorSchema,
	copyInputSchema,
	isCopyDescriptor,
	isTranslatableCopy,
	literalCopySchema,
	normalizeCopy,
	parseCopyKey,
	resolvedAdminCopySchema,
	serverCopyDescriptorSchema,
	translatableCopySchema,
} from "./copy.js";
export { hydrateAdminCopyDefaults } from "./hydrate-admin-copy-defaults.js";
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
	AdminCopyInput,
	BoundTranslateCopyOptions,
	CopyDescriptor,
	CopyInput,
	InterfaceDirection,
	LiteralCopy,
	LocaleDirection,
	ResolvedAdminCopy,
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
