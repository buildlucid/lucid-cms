export {
	adminText,
	adminTextSchema,
	isAdminText,
} from "./admin-text.js";
export { loadProjectTranslations } from "./load-project-translations.js";
export {
	isServerText,
	serverText,
	serverTextSchema,
} from "./server-text.js";
export {
	resolveInterfaceLocale,
	translateAdmin,
	translateServer,
	translateServerText,
} from "./translate.js";
export {
	coreTranslations,
	formatTranslation,
	mergeTranslationBundles,
	normalizeTranslationBundle,
	normalizeTranslationBundles,
} from "./translations.js";
export type {
	AdminText,
	InterfaceDirection,
	LocaleDirection,
	ServerText,
	TranslateServer,
	TranslateServerOptions,
	TranslationBundle,
	TranslationBundles,
	TranslationData,
	TranslationScope,
	Translator,
} from "./types.js";
