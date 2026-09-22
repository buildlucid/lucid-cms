import type { Locale } from "@types";
import { type Accessor, createContext, useContext } from "solid-js";

export interface DrawerNestingState {
	/** Ancestor drawers, whichever edge they came from. Drives the stack order. */
	level: Accessor<number>;
	/**
	 * Drawers on the stack for each edge, this one included. A drawer only
	 * stacks behind the ones sharing its edge, so a bottom drawer opened from
	 * a side drawer starts a stack of its own.
	 */
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
	/** Edge the drawer slides from. */
	side: Accessor<"right" | "bottom">;
	/** Horizontal room the header, body and footer leave around their content. */
	padding: Accessor<"sm" | "md">;
	/** Content locale the drawer is editing, when it shows a locale select. */
	locale: Accessor<string | undefined>;
	setLocale: (_value: string | undefined) => void;
	/** Locales the drawer can switch between. */
	locales: Accessor<Locale[]>;
	close: () => void;
}

export const DrawerContext = createContext<DrawerContextValue>();

/** Reads the state shared by Drawer.Root with its parts. */
export const useDrawerContext = (): DrawerContextValue => {
	const context = useContext(DrawerContext);
	if (!context) {
		throw new Error("Drawer parts must be rendered inside <Drawer.Root>.");
	}
	return context;
};

/**
 * The content locale the surrounding drawer is editing. Use it when a drawer's
 * fields are localised.
 *
 * @example
 * ```tsx
 * import { useDrawerLocale } from "@lucidcms/admin/components";
 *
 * const { locale } = useDrawerLocale();
 *
 * return <Input id="title" name="title" type="text" value={values[locale() ?? "en"]} />;
 * ```
 */
export const useDrawerLocale = () => {
	const { locale, setLocale, locales } = useDrawerContext();
	return { locale, setLocale, locales };
};
