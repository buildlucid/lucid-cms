import T from "../../../translations/index.js";
import type { Config } from "../../../types.js";

const checkLocales = (localisation: Config["localisation"]) => {
	if (localisation.locales.length === 0) {
		throw new Error(T("config_locales_empty"));
	}
	if (localisation.defaultLocale === undefined) {
		throw new Error(T("config_default_locale_undefined"));
	}

	const defaultLocale = localisation.locales.find(
		(l) => l.code === localisation.defaultLocale,
	);
	if (defaultLocale === undefined) {
		throw new Error(T("config_default_locale_not_found"));
	}

	const localeCodes = localisation.locales.map((l) => l.code);
	const duplicate = localeCodes.find(
		(code, index) => localeCodes.indexOf(code) !== index,
	);
	if (duplicate !== undefined) {
		throw new Error(T("config_duplicate_locale", { code: duplicate }));
	}
};

export default checkLocales;
