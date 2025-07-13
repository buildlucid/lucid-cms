import { createStore } from "solid-js/store";
import type { LocalesResponse } from "@types";

type ContentLangStoreT = {
	contentLocale: string | undefined;
	locales: LocalesResponse[];
	syncContentLocale: (_locales: LocalesResponse[]) => void;
	setContentLocale: (_contentLocale?: string) => void;
};

const CONTENT_LOCALE_KEY = "lucid_content_locale";

const getInitialContentLocale = () => {
	const contentLang = localStorage.getItem(CONTENT_LOCALE_KEY);
	if (contentLang) {
		return contentLang;
	}
	return undefined;
};

const [get, set] = createStore<ContentLangStoreT>({
	contentLocale: getInitialContentLocale(),
	locales: [],

	syncContentLocale(locales: LocalesResponse[]) {
		if (locales.length === 0) {
			set("contentLocale", undefined);
			return;
		}

		const contentLocal = localStorage.getItem(CONTENT_LOCALE_KEY);
		if (contentLocal) {
			const localeExists = locales.find((l) => l.code === contentLocal);
			if (localeExists !== undefined) {
				set("contentLocale", contentLocal);
				return;
			}
		}
		set("contentLocale", locales[0]?.code || undefined);
	},
	setContentLocale(contentLocale?: string) {
		if (contentLocale === undefined)
			localStorage.removeItem(CONTENT_LOCALE_KEY);
		else localStorage.setItem(CONTENT_LOCALE_KEY, String(contentLocale));
		set("contentLocale", contentLocale);
	},
});

const contentLocaleStore = {
	get,
	set,
};

export default contentLocaleStore;
