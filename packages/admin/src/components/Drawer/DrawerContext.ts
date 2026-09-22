import type { Locale } from "@types";
import { type Accessor, createContext, useContext } from "solid-js";

export interface DrawerNestingState {
	/** Number of parent drawers. */
	level: Accessor<number>;
	/** Number of open drawers on each side, including this one. */
	sideDepth: Accessor<Record<"right" | "bottom", number>>;
	zIndex: Accessor<number>;
	setChildOpen: (
		_id: symbol,
		_open: boolean,
		_side: "right" | "bottom",
	) => void;
}

/** Lets a drawer find the drawer it was opened from. */
export const DrawerNestingContext = createContext<DrawerNestingState>();

export interface DrawerContextValue {
	side: Accessor<"right" | "bottom">;
	padding: Accessor<"sm" | "md">;
	locale: Accessor<string | undefined>;
	setLocale: (_value: string | undefined) => void;
	locales: Accessor<Locale[]>;
	close: () => void;
}

export const DrawerContext = createContext<DrawerContextValue>();

/** Reads the state Drawer.Root shares with its parts. */
export const useDrawerContext = (): DrawerContextValue => {
	const context = useContext(DrawerContext);
	if (!context) {
		throw new Error("Drawer parts must be rendered inside <Drawer.Root>.");
	}
	return context;
};

/**
 * Returns the content locale selected in the drawer, and the locales it can
 * switch between.
 *
 * @example
 * ```tsx
 * import { Input, useDrawerLocale } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * const { locale } = useDrawerLocale();
 *
 * return (
 * 	<Input
 * 		id="alt"
 * 		name="alt"
 * 		type="text"
 * 		label={t("common.alt")}
 * 		value={alt()[locale() ?? ""] ?? ""}
 * 		onChange={(value) => setAlt({ ...alt(), [locale() ?? ""]: value })}
 * 	/>
 * );
 * ```
 */
export const useDrawerLocale = () => {
	const { locale, setLocale, locales } = useDrawerContext();
	return { locale, setLocale, locales };
};
