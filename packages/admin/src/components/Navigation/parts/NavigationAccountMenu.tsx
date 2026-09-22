import type { User } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidBookOpen,
	FaSolidChevronDown,
	FaSolidCircleHalfStroke,
	FaSolidLanguage,
	FaSolidRightFromBracket,
	FaSolidUser,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import Spinner from "@/components/Spinner/Spinner";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import constants from "@/constants";
import themeStore, {
	type ThemePreference,
} from "@/store/themeStore/themeStore";
import T, { getLocale, localesConfig, setLocale } from "@/translations";

const NavigationAccountMenu: Component<{
	user: Pick<User, "username" | "firstName" | "lastName" | "profilePicture">;
	logoutPending?: boolean;
	onLogout?: () => void;
	onNavigate?: () => void;
}> = (props) => {
	// -------------------------------
	// State & Hooks
	const [isOpen, setIsOpen] = createSignal(false);
	// -------------------------------
	// Memos
	const themeOptions = createMemo<
		Array<{ label: string; value: ThemePreference }>
	>(() => [
		{
			label: T()("settings.interface.cms.appearance.system"),
			value: "system",
		},
		{
			label: T()("settings.interface.cms.appearance.light"),
			value: "light",
		},
		{
			label: T()("settings.interface.cms.appearance.dark"),
			value: "dark",
		},
	]);
	const selectedThemeLabel = createMemo(
		() =>
			themeOptions().find((option) => option.value === themeStore.preference())
				?.label ?? T()("settings.interface.cms.appearance.system"),
	);
	const selectedLocaleLabel = createMemo(
		() =>
			localesConfig.find((locale) => locale.code === getLocale())?.name ??
			getLocale(),
	);

	// -------------------------------
	// Render
	return (
		<Menu.Root
			placement="top-start"
			gutter={8}
			open={isOpen()}
			onOpenChange={setIsOpen}
		>
			<Menu.Trigger
				class="group flex w-full items-center gap-2.5 rounded-xl border border-border bg-input-base px-3 py-2 text-left outline-none transition-[background-color,border-color] duration-150 hover:bg-secondary-hover focus-visible:border-primary-base focus-visible:ring-2 focus-visible:ring-primary-muted-border data-expanded:bg-secondary-hover dark:hover:bg-card-base dark:data-expanded:bg-card-base"
				aria-label={T()("routes.account.title")}
			>
				<div class="min-w-0 flex-1 overflow-hidden">
					<UserDisplay user={props.user} variant="stacked" size="sm" />
				</div>
				<FaSolidChevronDown
					class={classNames(
						"mr-1 size-3 shrink-0 text-icon-faded transition-transform duration-200 group-hover:text-icon-base",
						{
							"rotate-180": isOpen(),
						},
					)}
				/>
			</Menu.Trigger>

			<Menu.Content matchTriggerWidth class="min-w-52 shadow-lg">
				<Menu.Item
					href="/lucid/account"
					icon={<FaSolidUser class="size-3.5 shrink-0" />}
					onSelect={props.onNavigate}
				>
					{T()("routes.account.title")}
				</Menu.Item>
				<Menu.Item
					href={constants.documentationUrl}
					target="_blank"
					rel="noreferrer"
					icon={<FaSolidBookOpen class="size-3.5 shrink-0" />}
					end={<FaSolidArrowUpRightFromSquare class="size-2.5 shrink-0" />}
				>
					{T()("common.documentation")}
				</Menu.Item>
				<Menu.Sub
					label={T()("settings.interface.cms.appearance.title")}
					icon={<FaSolidCircleHalfStroke class="size-3.5 shrink-0" />}
					end={
						<span class="max-w-16 truncate text-xs text-unfocused">
							{selectedThemeLabel()}
						</span>
					}
				>
					<Menu.RadioGroup
						value={themeStore.preference()}
						onChange={(value) =>
							themeStore.setThemePreference(value as ThemePreference)
						}
					>
						<For each={themeOptions()}>
							{(option) => (
								<Menu.RadioItem value={option.value}>
									{option.label}
								</Menu.RadioItem>
							)}
						</For>
					</Menu.RadioGroup>
				</Menu.Sub>
				<Menu.Sub
					label={T()("settings.interface.cms.locale.title")}
					icon={<FaSolidLanguage class="size-3.5 shrink-0" />}
					end={
						<span class="max-w-16 truncate text-xs text-unfocused">
							{selectedLocaleLabel()}
						</span>
					}
				>
					<Menu.RadioGroup value={getLocale()} onChange={setLocale}>
						<For each={localesConfig}>
							{(locale) => (
								<Menu.RadioItem value={locale.code}>
									{locale.name || locale.code}
								</Menu.RadioItem>
							)}
						</For>
					</Menu.RadioGroup>
				</Menu.Sub>
				<Menu.Item
					icon={<FaSolidRightFromBracket class="size-3.5 shrink-0" />}
					end={props.logoutPending ? <Spinner size="sm" /> : undefined}
					disabled={props.logoutPending}
					onSelect={props.onLogout}
				>
					{T()("common.logout")}
				</Menu.Item>
			</Menu.Content>
		</Menu.Root>
	);
};

export default NavigationAccountMenu;
