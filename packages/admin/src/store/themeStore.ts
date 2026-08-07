import { createSignal } from "solid-js";

export const THEME_STORAGE_KEY = "lucid_theme_preference";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

type ThemeStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type ThemeControllerOptions = {
	document?: Document;
	eventTarget?: Pick<Window, "addEventListener" | "removeEventListener">;
	mediaQuery?: MediaQueryList;
	storage?: ThemeStorage;
};

const LIGHT_THEME_COLOR = "#F1F2F0";
const DARK_THEME_COLOR = "#171717";

const getBrowserStorage = (): ThemeStorage | undefined => {
	if (typeof localStorage === "undefined") return undefined;
	try {
		return localStorage;
	} catch {
		return undefined;
	}
};

const getStoredPreference = (storage?: ThemeStorage): ThemePreference => {
	try {
		const stored = storage?.getItem(THEME_STORAGE_KEY);
		return stored === "light" || stored === "dark" ? stored : "system";
	} catch {
		return "system";
	}
};

export const resolveTheme = (
	preference: ThemePreference,
	systemPrefersDark: boolean,
): ResolvedTheme => {
	if (preference === "light" || preference === "dark") return preference;
	return systemPrefersDark ? "dark" : "light";
};

const applyTheme = (document: Document | undefined, theme: ResolvedTheme) => {
	if (!document) return;

	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme;
	document
		.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
		?.setAttribute(
			"content",
			theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
		);
};

/** Creates the reactive, per-device appearance controller. */
export const createThemeController = (options: ThemeControllerOptions = {}) => {
	const storage = options.storage;
	const mediaQuery = options.mediaQuery;
	const themeDocument = options.document;
	const eventTarget = options.eventTarget;
	const [getThemePreference, setThemePreferenceSignal] =
		createSignal<ThemePreference>(getStoredPreference(storage));
	const [getResolvedTheme, setResolvedTheme] = createSignal<ResolvedTheme>(
		resolveTheme(getThemePreference(), mediaQuery?.matches ?? false),
	);

	const syncTheme = () => {
		const resolved = resolveTheme(
			getThemePreference(),
			mediaQuery?.matches ?? false,
		);
		applyTheme(themeDocument, resolved);
		setResolvedTheme(resolved);
	};

	const reloadStoredPreference = () => {
		setThemePreferenceSignal(getStoredPreference(storage));
		syncTheme();
	};

	const handleSystemThemeChange = () => {
		if (getThemePreference() === "system") syncTheme();
	};

	const handleStorageChange = (event: StorageEvent) => {
		if (event.key === THEME_STORAGE_KEY) reloadStoredPreference();
	};

	mediaQuery?.addEventListener("change", handleSystemThemeChange);
	eventTarget?.addEventListener("storage", handleStorageChange);
	syncTheme();

	return {
		get preference() {
			return getThemePreference;
		},
		get resolved() {
			return getResolvedTheme;
		},
		setThemePreference(preference: ThemePreference) {
			setThemePreferenceSignal(preference);
			try {
				if (preference === "system") {
					storage?.removeItem(THEME_STORAGE_KEY);
				} else {
					storage?.setItem(THEME_STORAGE_KEY, preference);
				}
			} catch {
				// The active session can still use the selected appearance.
			}
			syncTheme();
		},
		reload: reloadStoredPreference,
		destroy() {
			mediaQuery?.removeEventListener("change", handleSystemThemeChange);
			eventTarget?.removeEventListener("storage", handleStorageChange);
		},
	};
};

const browserWindow = typeof window === "undefined" ? undefined : window;
const systemThemeQuery = browserWindow?.matchMedia?.(
	"(prefers-color-scheme: dark)",
);

const themeStore = createThemeController({
	document: typeof document === "undefined" ? undefined : document,
	eventTarget: browserWindow,
	mediaQuery: systemThemeQuery,
	storage: getBrowserStorage(),
});

export default themeStore;
