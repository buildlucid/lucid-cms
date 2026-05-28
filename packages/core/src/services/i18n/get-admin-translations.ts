import { resolveInterfaceLocale } from "../../libs/i18n/index.js";
import type { LocaleDirection } from "../../libs/i18n/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getAdminTranslations: ServiceFn<
	[
		{
			locale?: string | null;
		},
	],
	{
		locale: string;
		defaultLocale: string;
		direction: LocaleDirection;
		locales: {
			code: string;
			label: string;
			direction: LocaleDirection;
			isDefault: boolean;
		}[];
		translations: Record<string, string>;
	}
> = async (context, data) => {
	const defaultLocale = context.config.i18n.interface.defaultLocale;

	const resolvedLocale = data.locale
		? resolveInterfaceLocale({
				config: context.config,
				locale: data.locale,
			})
		: context.request.locale;

	const locales = context.config.i18n.interface.locales.map(
		(interfaceLocale) => ({
			code: interfaceLocale.code,
			label: interfaceLocale.label,
			direction: interfaceLocale.direction ?? "ltr",
			isDefault: interfaceLocale.code === defaultLocale,
		}),
	);

	const localeMeta =
		locales.find(
			(interfaceLocale) => interfaceLocale.code === resolvedLocale,
		) ??
		locales.find((interfaceLocale) => interfaceLocale.code === defaultLocale);

	return {
		error: undefined,
		data: {
			locale: resolvedLocale,
			defaultLocale,
			direction: localeMeta?.direction ?? "ltr",
			locales,
			translations: {
				...(context.config.i18n.translations[defaultLocale]?.admin ?? {}),
				...(context.config.i18n.translations[resolvedLocale]?.admin ?? {}),
			},
		},
	};
};

export default getAdminTranslations;
