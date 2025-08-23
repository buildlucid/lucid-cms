import T from "../../../translations/index.js";
import type { Config } from "../../../types.js";

const checkLocales = (localization: Config["localization"]) => {
	if (localization.locales.length === 0) {
		throw new Error(T("config_locales_empty"));
	}
	if (localization.defaultLocale === undefined) {
		throw new Error(T("config_default_locale_undefined"));
	}

	const defaultLocale = localization.locales.find(
		(l) => l.code === localization.defaultLocale,
	);
	if (defaultLocale === undefined) {
		throw new Error(T("config_default_locale_not_found"));
	}

	const localeCodes = localization.locales.map((l) => l.code);
	const duplicate = localeCodes.find(
		(code, index) => localeCodes.indexOf(code) !== index,
	);
	if (duplicate !== undefined) {
		throw new Error(T("config_duplicate_locale", { code: duplicate }));
	}
};

export default checkLocales;
