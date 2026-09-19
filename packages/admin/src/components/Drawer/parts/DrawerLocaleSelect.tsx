import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerLocaleSelectProps {
	/** Marks the select when another locale has a validation error. */
	hasError?: boolean;
	class?: string;
}

/**
 * Switches the content locale the drawer is editing. Render it inside
 * Drawer.Header, and read the choice from the function you pass to
 * Drawer.Root. It hides itself when there is only one locale.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Header>
 * 		<Drawer.Title>Edit media</Drawer.Title>
 * 		<Drawer.LocaleSelect hasError={hasTranslationErrors()} />
 * 	</Drawer.Header>
 * );
 * ```
 */
export const DrawerLocaleSelect: Component<DrawerLocaleSelectProps> = (
	props,
) => {
	// ------------------------------
	// State & Hooks
	const { locale, setLocale, locales } = useDrawerContext();

	// ------------------------------
	// Memos
	const show = createMemo(() => locales().length > 1);

	// ------------------------------
	// Render
	return (
		<Show when={show()}>
			<div data-drawer-locale-select class={classNames("mt-2", props.class)}>
				<ContentLocaleSelect
					locales={locales()}
					value={locale()}
					setValue={setLocale}
					hasError={props.hasError}
					showShortcut={true}
				/>
			</div>
		</Show>
	);
};
