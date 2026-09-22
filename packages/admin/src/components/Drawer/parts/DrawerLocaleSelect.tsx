import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import { useDrawerContext } from "../DrawerContext";

export interface DrawerLocaleSelectProps {
	/** Shows the invalid style, such as when another locale has errors. */
	invalid?: boolean;
	class?: string;
}

/**
 * Switches the drawer's content locale. Hidden when there is only one locale.
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
					invalid={props.invalid}
					showShortcut={true}
				/>
			</div>
		</Show>
	);
};
