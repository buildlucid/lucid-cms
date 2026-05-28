import type { Config } from "../../../types.js";
import { translateServer } from "../../i18n/index.js";

const checkLocales = (
	localesConfig: Config["i18n"]["content"] | Config["i18n"]["interface"],
) => {
	if (localesConfig.locales.length === 0) {
		throw new Error(translateServer("core.config.locales.empty"));
	}
	if (localesConfig.defaultLocale === undefined) {
		throw new Error(translateServer("core.config.default.locale.undefined"));
	}

	const defaultLocale = localesConfig.locales.find(
		(l) => l.code === localesConfig.defaultLocale,
	);
	if (defaultLocale === undefined) {
		throw new Error(translateServer("core.config.default.locale.not.found"));
	}

	const localeCodes = localesConfig.locales.map((l) => l.code);
	const duplicate = localeCodes.find(
		(code, index) => localeCodes.indexOf(code) !== index,
	);
	if (duplicate !== undefined) {
		throw new Error(
			translateServer("core.config.duplicate.locale", { code: duplicate }),
		);
	}
};

export default checkLocales;
