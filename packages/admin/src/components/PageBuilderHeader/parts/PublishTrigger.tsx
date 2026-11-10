import type { DocumentVersionType } from "@types";
import classNames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import Menu from "@/components/Menu/Menu";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export interface PublishTriggerOption {
	label: string;
	value: Exclude<DocumentVersionType, "revision">;
	route: string;
	action?: "publish" | "compose";
	permission?: boolean;
	disabled?: boolean;
	disabledToast?: {
		title: string;
		message?: string;
		status?: "success" | "error" | "warning" | "info";
		duration?: number;
	};
	status?: {
		isPublished?: boolean;
		upToDate?: boolean;
	};
}

/** An alternative to saving, listed in the menu above the request options. */
export interface PublishTriggerAction {
	label: string;
	icon: ActionIconName;
	onSelect: () => void;
	disabled?: boolean;
}

export const PublishTrigger: Component<{
	options: Accessor<PublishTriggerOption[]>;
	onSelect: (option: PublishTriggerOption) => void;
	/** Alternatives to saving, eg. requesting a new document instead of creating it. */
	actions?: PublishTriggerAction[];
	onSave?: () => void;
	/** Defaults to Save. */
	saveLabel?: string;
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
	const hasOptions = createMemo(
		() => props.options().length > 0 || (props.actions?.length ?? 0) > 0,
	);

	const isDisabled = createMemo(() => {
		return props.disabled || !hasOptions();
	});

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
	const spawnDisabledToast = (option: PublishTriggerOption) => {
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
		<div
			class="flex items-center relative"
			aria-busy={props.loading ? "true" : undefined}
		>
			<Show when={props.loading}>
				<span
					class="loading-overlay rounded-md text-secondary-foreground"
					aria-hidden="true"
				/>
			</Show>
			<button
				type="button"
				onClick={handleSaveClick}
				disabled={props.saveDisabled}
				class={classNames(
					"flex items-center justify-center min-w-max text-center focus-ring transition-colors relative gap-2",
					props.saveDisabled || props.savePermission === false
						? "cursor-not-allowed bg-secondary-disabled text-secondary-disabled-foreground"
						: "bg-secondary hover:bg-secondary-hover text-secondary-foreground",
					"px-3 h-8 text-sm",
					{
						"rounded-md": !hasOptions(),
						"rounded-l-md border-r border-white/20 dark:border-black/10":
							hasOptions() && interfaceDirection.isLTR(),
						"rounded-r-md border-l border-white/20 dark:border-black/10":
							hasOptions() && interfaceDirection.isRTL(),
					},
				)}
			>
				{props.saveLabel ?? T()("common.save")}
			</button>
			<Show when={hasOptions()}>
				<Menu.Root>
					<Menu.Trigger
						class={classNames(
							"flex items-center justify-center min-w-max text-center focus-ring transition-colors relative gap-2",
							isDisabled() || props.permission === false
								? "cursor-not-allowed bg-secondary-disabled text-secondary-disabled-foreground"
								: "bg-secondary hover:bg-secondary-hover text-secondary-foreground",
							"w-7 h-8 text-sm",
							{
								"rounded-r-md": interfaceDirection.isLTR(),
								"rounded-l-md": interfaceDirection.isRTL(),
							},
						)}
						disabled={isDisabled()}
						onClick={handleTriggerClick}
					>
						<TbOutlineChevronDown size={12} />
					</Menu.Trigger>
					<Menu.Content>
						<For each={props.actions}>
							{(action) => (
								<Menu.Item
									textValue={action.label}
									icon={<ActionIcon icon={action.icon} />}
									unavailable={action.disabled === true || isDisabled()}
									onSelect={() => {
										if (action.disabled === true || isDisabled()) return;
										action.onSelect();
									}}
								>
									{action.label}
								</Menu.Item>
							)}
						</For>
						<For each={props.options()}>
							{(option) => (
								<Menu.Item
									textValue={option.label}
									unavailable={option.disabled === true || isDisabled()}
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
									end={
										<StatusIndicator
											variant={
												option.status?.isPublished === false
													? "danger-subtle"
													: option.status?.isPublished === true &&
														  option.status?.upToDate === true
														? "success-subtle"
														: option.status?.isPublished === true &&
															  option.status?.upToDate === false
															? "warning-subtle"
															: "neutral-subtle"
											}
											label={
												option.status?.isPublished === true &&
												option.status?.upToDate === true
													? T()("documents.publish.status.up.to.date")
													: option.status?.isPublished === true &&
														  option.status?.upToDate === false
														? T()("documents.publish.status.out.of.date")
														: T()("common.status.unpublished")
											}
										/>
									}
								>
									{T()("documents.publish.to")} {option.label}
								</Menu.Item>
							)}
						</For>
					</Menu.Content>
				</Menu.Root>
			</Show>
		</div>
	);
};
