import { type Component, Match, Switch, createMemo } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import { Select } from "@/components/Groups/Form";
import useKeyboardShortcuts, {
	shortcutText,
	inModal,
} from "@/hooks/useKeyboardShortcuts";

interface ContentLocaleSelectProps {
	value?: string | undefined;
	setValue?: (_value: string | undefined) => void;
	hasError?: boolean;
	showShortcut?: boolean;
}

const ContentLocaleSelect: Component<ContentLocaleSelectProps> = (props) => {
	// ----------------------------------
	// Hooks
	useKeyboardShortcuts({
		changeLocale: {
			permission: () => {
				const isInModal = inModal();

				const isGlobalSelector = props.value === undefined;
				const isModalSelector = props.value !== undefined;

				if (
					(isGlobalSelector && isInModal) ||
					(isModalSelector && !isInModal)
				) {
					return false;
				}

				return true;
			},
			callback: () => {
				const currentLocaleCode =
					props.value !== undefined ? props.value : contentLocale();
				const availableLocales = locales();
				const currentIndex = availableLocales.findIndex(
					(locale) => locale.code === currentLocaleCode,
				);
				const nextIndex = (currentIndex + 1) % availableLocales.length;
				const nextLocale = availableLocales[nextIndex].code;

				if (props.value !== undefined && props.setValue) {
					props.setValue(nextLocale);
				} else {
					contentLocaleStore.get.setContentLocale(nextLocale);
				}
			},
		},
	});

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const options = createMemo(() => {
		return (
			locales().map((l) => ({
				value: l.code,
				label: `${l.name ? `${l.name} (${l.code})` : l.code}`,
			})) || []
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.value === undefined}>
				<Select
					id={"content-locale"}
					value={contentLocale()}
					onChange={(value) => {
						if (!value) contentLocaleStore.get.setContentLocale(undefined);
						else contentLocaleStore.get.setContentLocale(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					noMargin={true}
					noClear={true}
					hasError={props.hasError}
					small={true}
					shortcut={props.showShortcut ? shortcutText.changeLocale : undefined}
				/>
			</Match>
			<Match when={props.value !== undefined}>
				<Select
					id={"content-locale"}
					value={props.value}
					onChange={(value) => {
						if (!value) props.setValue?.(undefined);
						else props.setValue?.(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					noMargin={true}
					noClear={true}
					hasError={props.hasError}
					small={true}
					shortcut={props.showShortcut ? shortcutText.changeLocale : undefined}
				/>
			</Match>
		</Switch>
	);
};

export default ContentLocaleSelect;
