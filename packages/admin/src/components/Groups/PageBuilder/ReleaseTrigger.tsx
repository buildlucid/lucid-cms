import { DropdownMenu } from "@kobalte/core";
import type { DocumentVersionType } from "@types";
import classNames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import Spinner from "@/components/Partials/Spinner";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export interface ReleaseTriggerOption {
	label: string;
	value: Exclude<DocumentVersionType, "revision">;
	route: string;
	action?: "publish" | "request";
	permission?: boolean;
	disabled?: boolean;
	disabledToast?: {
		title: string;
		message?: string;
		status?: "success" | "error" | "warning" | "info";
		duration?: number;
	};
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
	// State & Hooks
	const interfaceDirection = useInterfaceDirection();

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
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
				status: "warning",
			});
			event.preventDefault();
			event.stopPropagation();
		}
	};
	const getOptionLabel = (option: ReleaseTriggerOption) =>
		option.action === "request"
			? T()("documents.release.request.publish.to")
			: T()("documents.release.to");
	const spawnDisabledToast = (option: ReleaseTriggerOption) => {
		if (!option.disabledToast) return;

		spawnToast({
			...option.disabledToast,
			status: option.disabledToast.status ?? "warning",
		});
	};
	const handleSaveClick = (event: MouseEvent) => {
		if (props.savePermission === false) {
			spawnToast({
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
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
				<span class="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-md cursor-wait pointer-events-none">
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
						"rounded-l-md border-r border-black/10":
							hasOptions() && interfaceDirection.isLTR(),
						"rounded-r-md border-l border-black/10":
							hasOptions() && interfaceDirection.isRTL(),
						"opacity-80 cursor-not-allowed":
							props.saveDisabled || props.savePermission === false,
					},
				)}
			>
				{T()("common.save")}
			</button>
			<Show when={hasOptions()}>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class={classNames(
							"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors relative font-base gap-2",
							"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base",
							"px-2 w-9 h-9 text-sm",
							{
								"rounded-r-md": interfaceDirection.isLTR(),
								"rounded-l-md": interfaceDirection.isRTL(),
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
													"cursor-not-allowed": option.disabled === true,
													"hover:bg-dropdown-base! hover:text-body!":
														option.disabled === true || isDisabled(),
												},
											)}
											disabled={isDisabled()}
											onSelect={() => {
												if (option.disabled === true) {
													spawnDisabledToast(option);
													return;
												}
												if (isDisabled()) return;
												if (option.permission === false) {
													spawnToast({
														title: T()("toasts.common.no.permission.title"),
														message: T()("toasts.common.no.permission.message"),
														status: "warning",
													});
													return;
												}
												props.onSelect(option);
											}}
										>
											<span
												class={classNames("line-clamp-1", {
													"opacity-60":
														option.disabled === true || isDisabled(),
												})}
											>
												{getOptionLabel(option)} {option.label}
											</span>
											<span
												class={classNames("w-2.5 h-2.5 rounded-full border", {
													"bg-primary-muted-bg border-primary-muted-border":
														option.status?.isReleased === true &&
														option.status?.upToDate === true,
													"bg-warning-base/40 border-warning-base/60":
														option.status?.isReleased === true &&
														option.status?.upToDate === false,
													"bg-error-base/40 border-error-base/60":
														option.status?.isReleased === false,
												})}
												title={
													option.status?.isReleased === true &&
													option.status?.upToDate === true
														? T()("documents.release.status.up.to.date")
														: option.status?.isReleased === true &&
																option.status?.upToDate === false
															? T()("documents.release.status.out.of.date")
															: T()("common.status.unreleased")
												}
											/>
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
