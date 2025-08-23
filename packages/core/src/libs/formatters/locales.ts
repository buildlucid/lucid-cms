import Formatter from "./index.js";
import type { LocalesResponse } from "../../types/response.js";
import type { LucidLocales, Select } from "../db/types.js";
import type { Config } from "../../types.js";

export default class LocalesFormatter {
	formatMultiple = (props: {
		locales: Select<LucidLocales>[];
		localization: Config["localization"];
	}): LocalesResponse[] => {
		return props.locales
			.map((l) => {
				const configLocale = props.localization.locales.find(
					(locale) => locale.code === l.code,
				);
				if (!configLocale) {
					return null;
				}
				return this.formatSingle({
					locale: l,
					configLocale: configLocale,
					defaultLocale: props.localization.defaultLocale,
				});
			})
			.filter((l) => l !== null);
	};
	formatSingle = (props: {
		locale: Select<LucidLocales>;
		configLocale: Config["localization"]["locales"][0];
		defaultLocale: Config["localization"]["defaultLocale"];
	}): LocalesResponse => {
		return {
			code: props.locale.code,
			name: props.configLocale.label,
			isDefault: props.locale.code === props.defaultLocale,
			createdAt: Formatter.formatDate(props.locale.created_at),
			updatedAt: Formatter.formatDate(props.locale.updated_at),
		};
	};
}
