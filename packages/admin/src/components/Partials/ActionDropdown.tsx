import T from "@/translations";
import {
	type Component,
	For,
	Switch,
	Match,
	Show,
	createSignal,
} from "solid-js";
import { FaSolidEllipsisVertical, FaSolidChevronRight } from "solid-icons/fa";
import classNames from "classnames";
import spawnToast from "@/utils/spawn-toast";
import { DropdownMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import DropdownContent from "@/components/Partials/DropdownContent";
import Spinner from "./Spinner";

export interface ActionDropdownProps {
	actions: Array<{
		label: string;
		type: "button" | "link";
		onClick?: () => void;
		href?: string;
		permission?: boolean;
		hide?: boolean;
		isLoading?: boolean;
		actionExclude?: boolean;
		theme?: "error" | "primary";
	}>;
	options?: {
		border?: boolean;
		placement?: "bottom-end";
		raised?: boolean;
	};
}

const ActionDropdown: Component<ActionDropdownProps> = (props) => {
	// ----------------------------------------
	// State
	const [isOpen, setIsOpen] = createSignal(false);

	// ----------------------------------------
	// Classes
	const liItemClasses =
		"flex justify-between items-center px-2 rounded-md hover:bg-dropdown-hover w-full text-sm text-left py-1 text-title fill-dropdown-contrast";

	// ----------------------------------------
	// Render
	return (
		<DropdownMenu.Root
			placement={props.options?.placement}
			open={isOpen()}
			onOpenChange={setIsOpen}
		>
			<DropdownMenu.Trigger
				onClick={(e) => {
					e.stopPropagation();
				}}
				class={classNames(
					"dropdown-trigger pointer-events-auto min-w-7 w-7 h-7 bg-input-base border border-border outline-none ring-0 focus-visible:ring-1 focus:ring-primary-base rounded-md flex justify-center items-center hover:bg-background-hover",
					{
						"border border-border": props.options?.border,
					},
				)}
			>
				<span class="sr-only">{T()("show_options")}</span>
				<DropdownMenu.Icon>
					<FaSolidEllipsisVertical class="text-body pointer-events-none" />
				</DropdownMenu.Icon>
			</DropdownMenu.Trigger>

			<DropdownContent
				options={{
					class: "w-[200px] p-1.5!",
					rounded: true,
					raised: props.options?.raised,
				}}
			>
				<ul class="flex flex-col gap-y-1">
					<For each={props.actions}>
						{(action) => (
							<Show when={action.hide !== true}>
								<li
									class={classNames(
										"flex border-b border-border last:border-b-0 pb-1 last:pb-0",
										{
											"opacity-50": action.permission === false,
										},
									)}
								>
									<Switch>
										<Match when={action.type === "link"}>
											<A
												href={action.href || "/"}
												class={classNames(liItemClasses, {
													"cursor-not-allowed": action.permission === false,
												})}
												onClick={(e) => {
													e.stopPropagation();
													if (action.permission === false) {
														spawnToast({
															title: T()("no_permission_toast_title"),
															message: T()("no_permission_toast_message"),
															status: "warning",
														});
														e.preventDefault();
													}
												}}
											>
												<span class="line-clamp-1 mr-2.5">{action.label}</span>
												<FaSolidChevronRight size={14} />
											</A>
										</Match>
										<Match when={action.type === "button"}>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (action.permission === false) {
														spawnToast({
															title: T()("no_permission_toast_title"),
															message: T()("no_permission_toast_message"),
															status: "warning",
														});
														return;
													}
													action.onClick?.();
													setIsOpen(false);
												}}
												class={classNames(liItemClasses, {
													"cursor-not-allowed": action.permission === false,
													"hover:bg-error-hover hover:text-error-contrast":
														action.theme === "error",
													"hover:bg-primary-base hover:text-primary-contrast":
														action.theme === "primary",
												})}
											>
												<span class="line-clamp-1 mr-2.5">{action.label}</span>
												<Show when={action.isLoading !== true}>
													<FaSolidChevronRight size={14} />
												</Show>
												<Show when={action.isLoading}>
													<Spinner size="sm" />
												</Show>
											</button>
										</Match>
									</Switch>
								</li>
							</Show>
						)}
					</For>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};

export default ActionDropdown;
