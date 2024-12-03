import Formatter from "./index.js";
import type { LocalesResponse } from "../../types/response.js";
import type { LucidLocales, Select } from "../db/types.js";
import type { Config } from "../../types.js";

export default class LocalesFormatter {
	formatMultiple = (props: {
		locales: Select<LucidLocales>[];
		localisation: Config["localisation"];
	}): LocalesResponse[] => {
		return props.locales
			.map((l) => {
				const configLocale = props.localisation.locales.find(
					(locale) => locale.code === l.code,
				);
				if (!configLocale) {
					return null;
				}
				return this.formatSingle({
					locale: l,
					configLocale: configLocale,
					defaultLocale: props.localisation.defaultLocale,
				});
			})
			.filter((l) => l !== null);
	};
	formatSingle = (props: {
		locale: Select<LucidLocales>;
		configLocale: Config["localisation"]["locales"][0];
		defaultLocale: Config["localisation"]["defaultLocale"];
	}): LocalesResponse => {
		return {
			code: props.locale.code,
			name: props.configLocale.label,
			isDefault: props.locale.code === props.defaultLocale ? 1 : 0,
			createdAt: Formatter.formatDate(props.locale.created_at),
			updatedAt: Formatter.formatDate(props.locale.updated_at),
		};
	};
	static swagger = {
		type: "object",
		properties: {
			code: { type: "string", example: "en" },
			name: { type: "string", example: "English" },
			isDefault: { type: "number", example: 1 },
			createdAt: { type: "string", example: "2021-10-05T14:48:00.000Z" },
			updatedAt: { type: "string", example: "2021-10-05T14:48:00.000Z" },
		},
	};
}
