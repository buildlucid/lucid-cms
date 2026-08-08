import { DropdownMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import type { User } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidBookOpen,
	FaSolidCheck,
	FaSolidChevronDown,
	FaSolidChevronRight,
	FaSolidCircleHalfStroke,
	FaSolidLanguage,
	FaSolidRightFromBracket,
	FaSolidUser,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, For } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import Spinner from "@/components/Partials/Spinner";
import UserDisplay from "@/components/Partials/UserDisplay";
import constants from "@/constants";
import themeStore, { type ThemePreference } from "@/store/themeStore";
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
	const itemClasses =
		"group flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-left text-sm fill-dropdown-contrast outline-none transition-colors hover:bg-dropdown-hover hover:text-dropdown-contrast focus-visible:bg-dropdown-hover focus-visible:text-dropdown-contrast data-[highlighted]:bg-dropdown-hover data-[highlighted]:text-dropdown-contrast";
	const submenuClasses =
		"z-60 ml-1 w-48 rounded-md border border-border bg-dropdown-base p-1.5 shadow-md outline-none animate-animate-dropdown";

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
		<DropdownMenu.Root
			placement="top-start"
			gutter={8}
			sameWidth={true}
			open={isOpen()}
			onOpenChange={setIsOpen}
		>
			<DropdownMenu.Trigger
				class="group flex w-full items-center gap-2.5 rounded-xl border border-border bg-input-base px-3 py-2 text-left outline-none transition-[background-color,border-color] duration-150 hover:bg-secondary-hover focus-visible:border-primary-base focus-visible:ring-2 focus-visible:ring-primary-muted-border data-expanded:bg-secondary-hover dark:hover:bg-card-base dark:data-expanded:bg-card-base"
				aria-label={T()("routes.account.title")}
			>
				<div class="min-w-0 flex-1 overflow-hidden">
					<UserDisplay user={props.user} mode="long" compact={true} />
				</div>
				<FaSolidChevronDown
					class={classNames(
						"mr-1 size-3 shrink-0 text-icon-faded transition-transform duration-200 group-hover:text-icon-base",
						{
							"rotate-180": isOpen(),
						},
					)}
				/>
			</DropdownMenu.Trigger>

			<DropdownContent
				options={{
					anchorWidth: true,
					class: "z-60 min-w-52 p-1.5! shadow-lg",
					noMargin: true,
					rounded: true,
					raised: true,
				}}
			>
				<div class="flex flex-col">
					<DropdownMenu.Item
						as={A}
						href="/lucid/account"
						class={itemClasses}
						onSelect={props.onNavigate}
					>
						<FaSolidUser class="size-3.5 shrink-0" />
						<span class="flex-1">{T()("routes.account.title")}</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item
						as="a"
						href={constants.documentationUrl}
						target="_blank"
						rel="noreferrer"
						class={itemClasses}
					>
						<FaSolidBookOpen class="size-3.5 shrink-0" />
						<span class="flex-1">{T()("common.documentation")}</span>
						<FaSolidArrowUpRightFromSquare class="size-2.5 shrink-0" />
					</DropdownMenu.Item>
					<DropdownMenu.Separator class="my-1 h-px border-0 bg-border" />
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger
							class={itemClasses}
							textValue={T()("settings.interface.cms.appearance.title")}
						>
							<FaSolidCircleHalfStroke class="size-3.5 shrink-0" />
							<span class="min-w-0 flex-1">
								{T()("settings.interface.cms.appearance.title")}
							</span>
							<span class="max-w-16 truncate text-xs text-unfocused">
								{selectedThemeLabel()}
							</span>
							<FaSolidChevronRight class="size-2.5 shrink-0" />
						</DropdownMenu.SubTrigger>
						<DropdownMenu.Portal>
							<DropdownMenu.SubContent class={submenuClasses}>
								<DropdownMenu.RadioGroup
									value={themeStore.preference()}
									onChange={(value) =>
										themeStore.setThemePreference(value as ThemePreference)
									}
								>
									<For each={themeOptions()}>
										{(option) => (
											<DropdownMenu.RadioItem
												value={option.value}
												class={itemClasses}
											>
												<span class="flex-1">{option.label}</span>
												<DropdownMenu.ItemIndicator>
													<FaSolidCheck class="size-3 text-primary-base" />
												</DropdownMenu.ItemIndicator>
											</DropdownMenu.RadioItem>
										)}
									</For>
								</DropdownMenu.RadioGroup>
							</DropdownMenu.SubContent>
						</DropdownMenu.Portal>
					</DropdownMenu.Sub>

					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger
							class={itemClasses}
							textValue={T()("settings.interface.cms.locale.title")}
						>
							<FaSolidLanguage class="size-3.5 shrink-0" />
							<span class="min-w-0 flex-1">
								{T()("settings.interface.cms.locale.title")}
							</span>
							<span class="max-w-16 truncate text-xs text-unfocused">
								{selectedLocaleLabel()}
							</span>
							<FaSolidChevronRight class="size-2.5 shrink-0" />
						</DropdownMenu.SubTrigger>
						<DropdownMenu.Portal>
							<DropdownMenu.SubContent class={submenuClasses}>
								<DropdownMenu.RadioGroup
									value={getLocale()}
									onChange={setLocale}
								>
									<For each={localesConfig}>
										{(locale) => (
											<DropdownMenu.RadioItem
												value={locale.code}
												class={itemClasses}
											>
												<span class="flex-1">{locale.name || locale.code}</span>
												<DropdownMenu.ItemIndicator>
													<FaSolidCheck class="size-3 text-primary-base" />
												</DropdownMenu.ItemIndicator>
											</DropdownMenu.RadioItem>
										)}
									</For>
								</DropdownMenu.RadioGroup>
							</DropdownMenu.SubContent>
						</DropdownMenu.Portal>
					</DropdownMenu.Sub>

					<DropdownMenu.Separator class="my-1 h-px border-0 bg-border" />

					<DropdownMenu.Item
						class={itemClasses}
						disabled={props.logoutPending}
						onSelect={props.onLogout}
					>
						<FaSolidRightFromBracket class="size-3.5 shrink-0" />
						<span class="flex-1">{T()("common.logout")}</span>
						{props.logoutPending ? <Spinner size="sm" /> : null}
					</DropdownMenu.Item>
				</div>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};

export default NavigationAccountMenu;
