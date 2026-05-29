import type { Config } from "../../../types.js";
import { translate } from "../../i18n/index.js";

const checkLocales = (
	localesConfig: Config["localization"] | Config["i18n"],
) => {
	if (localesConfig.locales.length === 0) {
		throw new Error(translate("server:core.config.locales.empty"));
	}
	if (localesConfig.defaultLocale === undefined) {
		throw new Error(translate("server:core.config.default.locale.undefined"));
	}

	const defaultLocale = localesConfig.locales.find(
		(l) => l.code === localesConfig.defaultLocale,
	);
	if (defaultLocale === undefined) {
		throw new Error(translate("server:core.config.default.locale.not.found"));
	}

	const localeCodes = localesConfig.locales.map((l) => l.code);
	const duplicate = localeCodes.find(
		(code, index) => localeCodes.indexOf(code) !== index,
	);
	if (duplicate !== undefined) {
		throw new Error(
			translate("server:core.config.duplicate.locale", {
				data: { code: duplicate },
			}),
		);
	}
};

export default checkLocales;
