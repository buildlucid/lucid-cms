import type { Locale } from "@types";
import { createStore } from "solid-js/store";

type ContentLangStoreT = {
	contentLocale: string | undefined;
	locales: Locale[];
	syncContentLocale: (_locales: Locale[]) => void;
	setContentLocale: (_contentLocale?: string | null) => void;
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

	syncContentLocale(locales: Locale[]) {
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
		set(
			"contentLocale",
			locales.find((locale) => locale.isDefault)?.code ?? locales[0]?.code,
		);
	},
	setContentLocale(contentLocale?: string | null) {
		if (contentLocale == null) localStorage.removeItem(CONTENT_LOCALE_KEY);
		else localStorage.setItem(CONTENT_LOCALE_KEY, String(contentLocale));
		set("contentLocale", contentLocale ?? undefined);
	},
});

const contentLocaleStore = {
	get,
	set,
};

export default contentLocaleStore;
