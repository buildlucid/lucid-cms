import { createStore } from "solid-js/store";
import type { LocalesResponse } from "@lucidcms/core/types";

type ContentLangStoreT = {
	contentLocale: string | undefined;
	locales: LocalesResponse[];
	syncContentLocale: (_locales: LocalesResponse[]) => void;
	setContentLocale: (_contentLocale?: string) => void;
};

const getInitialContentLocale = () => {
	const contentLang = localStorage.getItem("lucid_content_locale");
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

		const contentLocal = localStorage.getItem("lucid_content_locale");
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
			localStorage.removeItem("lucid_content_locale");
		else localStorage.setItem("lucid_content_locale", String(contentLocale));
		set("contentLocale", contentLocale);
	},
});

const contentLocaleStore = {
	get,
	set,
};

export default contentLocaleStore;
