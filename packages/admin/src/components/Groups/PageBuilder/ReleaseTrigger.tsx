import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";
import { DropdownMenu } from "@kobalte/core";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import classNames from "classnames";
import DropdownContent from "@/components/Partials/DropdownContent";
import Pill from "@/components/Partials/Pill";
import spawnToast from "@/utils/spawn-toast";
import type { DocumentVersionType } from "@types";
import { FaSolidChevronDown } from "solid-icons/fa";

export interface ReleaseTriggerOption {
	label: string;
	value: Exclude<DocumentVersionType, "revision">;
	route: string;
	disabled?: boolean;
	status?: {
		isReleased?: boolean;
		upToDate?: boolean;
	};
}

export const ReleaseTrigger: Component<{
	options: Accessor<ReleaseTriggerOption[]>;
	onSelect: (option: ReleaseTriggerOption) => void;
	onSave?: () => void;
	saveDisabled?: boolean;
	savePermission?: boolean;
	disabled?: boolean;
	permission?: boolean;
	loading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const isDisabled = createMemo(() => {
		return props.disabled || props.options().length === 0;
	});

	const hasOptions = createMemo(() => props.options().length > 0);

	// ----------------------------------------
	// Functions
	const handleTriggerClick = (event: MouseEvent) => {
		if (props.permission === false) {
			spawnToast({
				title: T()("no_permission_toast_title"),
				message: T()("no_permission_toast_message"),
				status: "warning",
			});
			event.preventDefault();
			event.stopPropagation();
		}
	};
	const handleSaveClick = (event: MouseEvent) => {
		if (props.savePermission === false) {
			spawnToast({
				title: T()("no_permission_toast_title"),
				message: T()("no_permission_toast_message"),
				status: "warning",
			});
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		props.onSave?.();
	};

	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center relative">
			<Show when={props.loading}>
				<span class="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-md cursor-wait">
					<Spinner size="sm" />
				</span>
			</Show>
			<button
				type="button"
				onClick={handleSaveClick}
				disabled={props.saveDisabled}
				class={classNames(
					"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors relative font-base gap-2",
					"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base",
					"px-4 h-9 text-sm",
					{
						"rounded-md": !hasOptions(),
						"rounded-l-md border-r border-black/10": hasOptions(),
						"opacity-80 cursor-not-allowed":
							props.saveDisabled || props.savePermission === false,
					},
				)}
			>
				{T()("save")}
			</button>
			<Show when={hasOptions()}>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={classNames(
							"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-r-md relative font-base gap-2",
							"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base",
							"px-2 w-9 h-9 text-sm",
							{
								"opacity-80 cursor-not-allowed":
									isDisabled() || props.permission === false,
							},
						)}
						disabled={isDisabled()}
						onClick={handleTriggerClick}
					>
						<FaSolidChevronDown />
					</DropdownMenu.Trigger>
					<DropdownContent
						options={{
							as: "div",
							rounded: true,
							class: "p-1.5! z-60",
						}}
					>
						<ul class="flex flex-col gap-y-0.5">
							<For each={props.options()}>
								{(option) => (
									<li>
										<DropdownMenu.Item
											class={classNames(
												"flex items-center gap-3 justify-between px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors text-left hover:bg-dropdown-hover hover:text-dropdown-contrast",
												{
													"opacity-50 cursor-not-allowed":
														option.disabled === true || isDisabled(),
												},
											)}
											disabled={option.disabled === true || isDisabled()}
											onSelect={() => {
												if (option.disabled === true || isDisabled()) return;
												props.onSelect(option);
											}}
										>
											<span class="line-clamp-1">
												{T()("release_to")} {option.label}
											</span>
											<Show when={option.status?.isReleased === false}>
												<Pill theme="warning">{T()("not_released")}</Pill>
											</Show>
											<Show when={option.status?.upToDate === true}>
												<Pill theme="warning">{T()("released")}</Pill>
											</Show>
										</DropdownMenu.Item>
									</li>
								)}
							</For>
						</ul>
					</DropdownContent>
				</DropdownMenu.Root>
			</Show>
		</div>
	);
};
