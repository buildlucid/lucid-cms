import { DropdownMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidChevronRight, FaSolidPlus } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Switch,
} from "solid-js";
import Button from "@/components/Partials/Button";
import DropdownContent from "@/components/Partials/DropdownContent";
import Link from "@/components/Partials/Link";
import T from "@/translations";

export type HeaderPrimaryAction =
	| {
			type: "button";
			label: string;
			onClick: () => void;
			secondary?: boolean;
	  }
	| {
			type: "link";
			label: string;
			href: string;
	  };

const HeaderPrimaryActions: Component<{
	actions: HeaderPrimaryAction[];
}> = (props) => {
	// ----------------------------------
	// Signals
	const [isOpen, setIsOpen] = createSignal(false);

	const dropdownItemClasses =
		"flex items-center justify-between gap-2 px-2 py-1 rounded-md hover:bg-dropdown-hover hover:text-dropdown-contrast text-sm w-full text-left fill-dropdown-contrast";

	// ----------------------------------
	// Memos
	const visibleActions = createMemo(() => props.actions);
	const singleAction = createMemo(() => visibleActions()[0]);

	// ----------------------------------
	// Render
	const renderSingleAction = () => {
		const action = singleAction();
		if (!action) return null;

		if (action.type === "button") {
			return (
				<Button
					type="button"
					theme={action.secondary ? "border-outline" : "primary"}
					size="icon"
					title={action.label}
					aria-label={action.label}
					onClick={action.onClick}
				>
					<FaSolidPlus />
				</Button>
			);
		}

		return (
			<Link
				theme="primary"
				size="icon"
				href={action.href}
				title={action.label}
				aria-label={action.label}
			>
				<FaSolidPlus />
				<span class="sr-only">{action.label}</span>
			</Link>
		);
	};

	if (visibleActions().length === 0) return null;

	return (
		<Switch>
			<Match when={visibleActions().length === 1}>{renderSingleAction()}</Match>
			<Match when={visibleActions().length > 1}>
				<DropdownMenu.Root open={isOpen()} onOpenChange={setIsOpen}>
					<DropdownMenu.Trigger
						class="dropdown-trigger w-9 h-9 bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast border border-transparent outline-none ring-0 focus-visible:ring-1 focus:ring-primary-base rounded-md flex justify-center items-center transition-colors"
						onClick={(e) => e.stopPropagation()}
						title={T()("create")}
						aria-label={T()("create")}
					>
						<span class="sr-only">{T()("create")}</span>
						<DropdownMenu.Icon>
							<FaSolidPlus class="pointer-events-none" />
						</DropdownMenu.Icon>
					</DropdownMenu.Trigger>

					<DropdownContent
						options={{
							class: "w-[220px] p-1.5! z-60",
							rounded: true,
						}}
					>
						<ul class="flex flex-col gap-y-1">
							<For each={visibleActions()}>
								{(action) => (
									<li class="flex border-b border-border last:border-b-0 pb-1 last:pb-0">
										<Switch>
											<Match when={action.type === "button"}>
												<button
													type="button"
													class={dropdownItemClasses}
													onClick={(e) => {
														e.stopPropagation();
														if (action.type === "button") action.onClick();
														setIsOpen(false);
													}}
												>
													<span class="line-clamp-1 mr-2.5">
														{action.label}
													</span>
													<FaSolidChevronRight size={14} />
												</button>
											</Match>
											<Match when={action.type === "link"}>
												<A
													href={action.type === "link" ? action.href : "/"}
													class={classNames(dropdownItemClasses)}
													onClick={(e) => {
														e.stopPropagation();
													}}
												>
													<span class="line-clamp-1 mr-2.5">
														{action.label}
													</span>
													<FaSolidChevronRight size={14} />
												</A>
											</Match>
										</Switch>
									</li>
								)}
							</For>
						</ul>
					</DropdownContent>
				</DropdownMenu.Root>
			</Match>
		</Switch>
	);
};

export default HeaderPrimaryActions;
