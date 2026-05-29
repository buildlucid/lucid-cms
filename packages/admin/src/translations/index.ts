import type { AdminCopyDescriptor } from "@types";
import i18next from "i18next";
import { createMemo, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
// locales
import en from "./en.json";

const FALLBACK_LOCALE = "en";
const INTERFACE_LOCALE_KEY = "lucid_interface_locale";
export const interfaceLocaleHeader = "Lucid-Interface-Locale";

export type SupportedLocales = string;
export type TranslationKeys = keyof typeof en | (string & {});
export type InterfaceDirection = "ltr" | "rtl";
export type InterfaceLocaleConfig = {
	code: string;
	label: string;
	name: string;
	direction: InterfaceDirection;
	default?: boolean;
	isDefault: boolean;
};

type AdminTranslationsPayload = {
	locale: string;
	defaultLocale: string;
	direction: InterfaceDirection;
	locales: Array<{
		code: string;
		label: string;
		direction: InterfaceDirection;
		isDefault: boolean;
	}>;
	translations: Record<string, string>;
};

type AdminTranslationsResponse = {
	data: AdminTranslationsPayload;
};

const fallbackLocaleConfig: InterfaceLocaleConfig = {
	code: FALLBACK_LOCALE,
	label: "English",
	name: "English",
	direction: "ltr",
	default: true,
	isDefault: true,
};

const getStoredLocale = () => {
	try {
		return localStorage.getItem(INTERFACE_LOCALE_KEY);
	} catch (_err) {
		return null;
	}
};

const persistLocale = (locale: string) => {
	try {
		localStorage.setItem(INTERFACE_LOCALE_KEY, locale);
	} catch (_err) {
		// Ignore storage errors; the active session can still use the locale.
	}
};

const getFetchURL = (url: string): string => {
	return import.meta.env.PROD
		? url
		: `${import.meta.env.VITE_API_DEV_URL}${url}`;
};

const storedLocale = getStoredLocale();
const [getLocale, setLocaleSignal] = createSignal<SupportedLocales>(
	storedLocale ?? FALLBACK_LOCALE,
);
const [getHasResolvedLocale, setHasResolvedLocale] = createSignal(
	Boolean(storedLocale),
);
const [getReady, setReady] = createSignal(false);
const [getLoading, setLoading] = createSignal(false);
const [localesConfig, setLocalesConfig] = createStore<InterfaceLocaleConfig[]>([
	fallbackLocaleConfig,
]);

i18next.init({
	lng: getLocale(),
	debug: false,
	resources: {
		en: {
			translation: en,
		},
	},
	fallbackLng: FALLBACK_LOCALE,
	keySeparator: false,
	nsSeparator: false,
});

let latestLoadId = 0;

const syncDocumentLocale = (locale: string, direction: InterfaceDirection) => {
	if (typeof document === "undefined") return;
	document.documentElement.lang = locale;
	document.documentElement.dir = direction;
};

const syncTranslations = (
	payload: AdminTranslationsPayload,
	options?: {
		persist?: boolean;
	},
) => {
	const resources = {
		...en,
		...payload.translations,
	};

	i18next.addResourceBundle(
		payload.locale,
		"translation",
		resources,
		true,
		true,
	);

	setLocalesConfig(
		reconcile(
			payload.locales.map((locale) => ({
				code: locale.code,
				label: locale.label,
				name: locale.label,
				direction: locale.direction,
				default: locale.isDefault,
				isDefault: locale.isDefault,
			})),
		),
	);
	setLocaleSignal(payload.locale);
	setHasResolvedLocale(true);
	syncDocumentLocale(payload.locale, payload.direction);
	i18next.changeLanguage(payload.locale);

	if (options?.persist) {
		persistLocale(payload.locale);
	}

	setReady(true);
};

export const loadAdminTranslations = async (
	locale?: string,
	options?: {
		persist?: boolean;
	},
) => {
	const loadId = ++latestLoadId;
	setLoading(true);

	try {
		const target = locale
			? `/lucid/api/v1/i18n/admin/${encodeURIComponent(locale)}`
			: "/lucid/api/v1/i18n/admin";
		const response = await fetch(getFetchURL(target), {
			method: "GET",
			credentials: "include",
			headers: locale ? { [interfaceLocaleHeader]: locale } : undefined,
		});

		if (!response.ok) {
			return false;
		}

		const body = (await response.json()) as AdminTranslationsResponse;
		if (loadId !== latestLoadId) return true;

		syncTranslations(body.data, options);
		return true;
	} catch (_err) {
		return false;
	} finally {
		if (loadId === latestLoadId) setLoading(false);
	}
};

export const initAdminTranslations = async () => {
	if (getReady()) return true;
	const storedLocale = getStoredLocale();
	return loadAdminTranslations(storedLocale ?? undefined, {
		persist: storedLocale !== null,
	});
};

export const setLocale = (locale: SupportedLocales) => {
	setLocaleSignal(locale);
	setHasResolvedLocale(true);
	void loadAdminTranslations(locale, { persist: true });
};

export const getRequestInterfaceLocale = () =>
	getHasResolvedLocale() ? getLocale() : undefined;

export const translateAdminCopy = (
	copy: AdminCopyDescriptor,
	options?: {
		defaultMessage?: string;
		values?: Record<string, string | number | undefined>;
	},
) => {
	return i18next.t(copy.key, {
		...(copy.values ?? {}),
		...(options?.values ?? {}),
		defaultValue: copy.defaultMessage ?? options?.defaultMessage ?? copy.key,
	});
};

const T = createMemo(() => {
	i18next.changeLanguage(getLocale());
	const direction =
		localesConfig.find((locale) => locale.code === getLocale())?.direction ??
		"ltr";
	syncDocumentLocale(getLocale(), direction);

	return i18next.t.bind(i18next) as (
		key: TranslationKeys,
		data?: Record<string, string | number | undefined>,
	) => string;
});

export { getLoading, getLocale, getReady, localesConfig };
export default T;
