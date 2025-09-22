import i18next from "i18next";
import { createMemo, createSignal } from "solid-js";
// locales
import en from "./en.json";

// TODO: selected locale needs to be persisted in local storage (fine for now as we only have 1 locale)

const supportedLocales = ["en"] as const;
export type SupportedLocales = (typeof supportedLocales)[number];
export type TranslationKeys = keyof typeof en;

export const [getLocale, setLocale] = createSignal<SupportedLocales>("en");

i18next.init<TranslationKeys>({
	lng: getLocale(),
	debug: false,
	resources: {
		en: {
			translation: en,
		},
	},
	fallbackLng: "en",
});

const T = createMemo(() => {
	i18next.changeLanguage(getLocale());
	document.documentElement.lang = getLocale();
	return i18next.t.bind(i18next) as (
		key: TranslationKeys,
		data?: Record<string, string | number | undefined>,
	) => string;
});

export const localesConfig: Array<{
	code: SupportedLocales;
	name: string;
	default?: boolean;
}> = [
	{
		code: "en",
		name: "English",
		default: true,
	},
];

export default T;
