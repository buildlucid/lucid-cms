import { createHotkey, formatForDisplay } from "@tanstack/solid-hotkeys";
import type { Locale } from "@types";
import classNames from "classnames";
import {
	TbOutlineAlertTriangle,
	TbOutlineChevronDown,
	TbOutlineLanguage,
} from "solid-icons/tb";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import { getButtonClasses } from "@/components/Button/classes";
import Menu from "@/components/Menu/Menu";
import Select from "@/components/Select/Select";
import { showShortcutFeedback } from "@/components/ShortcutFeedback/ShortcutFeedback";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { inModal, shortcuts } from "@/utils/shortcuts";

interface ContentLocaleSelectProps {
	value?: string | undefined;
	setValue?: (_value: string | undefined) => void;
	invalid?: boolean;
	/** Locales marked with an error icon in the compact menu. */
	errorLocales?: string[];
	showShortcut?: boolean;
	locales?: Locale[];
	/** A toolbar button showing the language icon and code, listing the full names in its menu. For headers, with the global locale only. */
	compact?: boolean;
}

const shortcutText = `${formatForDisplay(shortcuts.previousLocale.hotkey)} / ${formatForDisplay(shortcuts.nextLocale.hotkey)}`;

const ContentLocaleSelect: Component<ContentLocaleSelectProps> = (props) => {
	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const locales = createMemo(
		() => props.locales ?? contentLocaleStore.get.locales,
	);
	const hasMultipleLocales = createMemo(() => locales().length > 1);
	const options = createMemo(() => {
		return (
			locales().map((l) => ({
				value: l.code,
				label: `${l.name ? `${l.name} (${l.code})` : l.code}`,
			})) || []
		);
	});
	const currentOption = createMemo(() =>
		options().find((option) => option.value === contentLocale()),
	);
	const triggerLabel = createMemo(() => {
		const label = currentOption()?.label ?? "";
		return props.invalid ? `${label} - ${T()("builder.locale.errors")}` : label;
	});

	// ----------------------------------
	// Functions
	const stepLocale = (step: 1 | -1) => {
		//* the global selector steps aside while a dialog is open, and a dialog's selector only answers inside one
		const isModalSelector = props.value !== undefined;
		if (isModalSelector !== inModal()) return;

		const currentLocaleCode = isModalSelector ? props.value : contentLocale();
		const count = locales().length;
		const currentIndex = locales().findIndex(
			(locale) => locale.code === currentLocaleCode,
		);
		const next = options()[(currentIndex + step + count) % count];
		if (!next) return;

		if (isModalSelector && props.setValue) {
			props.setValue(next.value);
		} else {
			contentLocaleStore.get.setContentLocale(next.value);
		}
		showShortcutFeedback(
			T()("shortcuts.feedback.locale", { locale: next.label }),
		);
	};

	// ----------------------------------
	// Effects
	//* the global and a dialog's selector can both be mounted, and stepLocale picks between them
	const hotkeyOptions = () =>
		({ enabled: hasMultipleLocales(), conflictBehavior: "allow" }) as const;
	createHotkey(shortcuts.nextLocale.hotkey, () => stepLocale(1), hotkeyOptions);
	createHotkey(
		shortcuts.previousLocale.hotkey,
		() => stepLocale(-1),
		hotkeyOptions,
	);

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.compact && hasMultipleLocales()}>
				<Menu.Root placement="bottom-end">
					<Menu.Trigger
						aria-label={T()("builder.locale.label", {
							locale: triggerLabel(),
						})}
						title={
							props.showShortcut
								? `${triggerLabel()} (${shortcutText})`
								: triggerLabel()
						}
						class={classNames(
							getButtonClasses({
								variant: "toolbar",
								size: "xs",
								shape: "standard",
							}),
							"gap-1.5 font-medium text-subtitle",
						)}
					>
						<Show
							when={props.invalid}
							fallback={<TbOutlineLanguage size={12} class="text-icon" />}
						>
							<span class="flex size-3 shrink-0 items-center justify-center">
								<TbOutlineAlertTriangle size={10} class="text-danger" />
							</span>
						</Show>
						<span class="uppercase">{contentLocale()}</span>
						<TbOutlineChevronDown size={10} class="text-icon" />
					</Menu.Trigger>
					<Menu.Content>
						<For each={options()}>
							{(option) => (
								<Menu.Item
									selected={option.value === contentLocale()}
									onSelect={() =>
										contentLocaleStore.get.setContentLocale(option.value)
									}
									end={
										<Show when={props.errorLocales?.includes(option.value)}>
											<TbOutlineAlertTriangle
												size={12}
												class="text-danger"
												role="img"
												aria-label={T()("common.errors")}
											/>
										</Show>
									}
								>
									{option.label}
								</Menu.Item>
							)}
						</For>
					</Menu.Content>
				</Menu.Root>
			</Match>
			<Match when={props.value === undefined && hasMultipleLocales()}>
				<Select
					id={"content-locale"}
					value={contentLocale()}
					onChange={(value) => {
						if (!value) contentLocaleStore.get.setContentLocale(undefined);
						else contentLocaleStore.get.setContentLocale(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					invalid={props.invalid}
					size="sm"
					shortcut={props.showShortcut ? shortcutText : undefined}
					shortcutDisplay={props.showShortcut ? "compact" : undefined}
				/>
			</Match>
			<Match when={props.value !== undefined && hasMultipleLocales()}>
				<Select
					id={"content-locale"}
					value={props.value}
					onChange={(value) => {
						if (!value) props.setValue?.(undefined);
						else props.setValue?.(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					invalid={props.invalid}
					size="sm"
					shortcut={props.showShortcut ? shortcutText : undefined}
					shortcutDisplay={props.showShortcut ? "compact" : undefined}
				/>
			</Match>
		</Switch>
	);
};

export default ContentLocaleSelect;
