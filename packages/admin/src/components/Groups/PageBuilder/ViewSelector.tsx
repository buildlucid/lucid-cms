import { DropdownMenu } from "@kobalte/core";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import { FaSolidChevronRight } from "solid-icons/fa";
import classNames from "classnames";
import { useLocation, useNavigate } from "@solidjs/router";
import T from "@/translations";
import DropdownContent from "@/components/Partials/DropdownContent";
import Pill from "@/components/Partials/Pill";

export interface ViewSelectorOption {
	label: string;
	disabled: boolean;
	type: "latest" | "environment" | "revision";
	location: string;
	status?: {
		isPublished?: boolean;
	};
}

export const ViewSelector: Component<{
	options: Accessor<ViewSelectorOption[]>;
}> = (props) => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const location = useLocation();

	// ----------------------------------
	// Memos
	const environments = createMemo(() =>
		props
			.options()
			.filter((o) => o.type === "latest" || o.type === "environment"),
	);
	const revisions = createMemo(() =>
		props.options().filter((o) => o.type === "revision"),
	);
	const currentOption = createMemo(() => {
		const currentPath = location.pathname;

		return props.options().find((option) => {
			if (currentPath === option.location) {
				return true;
			}

			if (option.type === "revision" && currentPath.includes("revision")) {
				return true;
			}

			return false;
		});
	});

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="group flex items-center gap-2 text-base font-medium text-title rounded-md transition-colors outline-none focus-visible:ring-2 ring-primary">
				<span
					class={classNames("size-3 rounded-full border block", {
						"bg-primary-base/40 border-primary-base/60":
							currentOption()?.type === "latest",
						"bg-warning-base/40 border-warning-base/60":
							currentOption()?.type === "environment" ||
							currentOption()?.type === "revision",
					})}
				/>
				<span class="group-hover:text-body transition-colors duration-200 inline-block">
					<Show when={currentOption()?.type === "latest"}>{T()("edit")} </Show>
					<Show when={currentOption()?.type === "environment"}>
						{T()("view")}{" "}
					</Show>
					<Show when={currentOption()?.type === "revision"}>
						{T()("view")}{" "}
					</Show>
					{currentOption()?.label}
				</span>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "div",
					rounded: true,
					class: "w-[260px] z-60 p-1.5!",
				}}
			>
				<ul class="flex flex-col gap-y-0.5 mb-1">
					<For each={environments()}>
						{(item) => (
							<li>
								<DropdownMenu.Item
									class={classNames(
										"flex items-center justify-between px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors",
										{
											"bg-dropdown-hover text-dropdown-contrast":
												currentOption()?.location === item.location,
											"cursor-not-allowed": item.disabled,
										},
									)}
									disabled={item.disabled}
									onSelect={() => {
										if (item.location && !item.disabled) {
											navigate(item.location);
										}
									}}
								>
									<span
										class={classNames("line-clamp-1 mr-2", {
											"opacity-50": item.disabled,
										})}
									>
										{item.label}
									</span>
									<Show when={currentOption()?.location === item.location}>
										<div class="w-1.5 h-1.5 rounded-full bg-primary-base" />
									</Show>
									<Show when={item.status?.isPublished === false}>
										<Pill theme="warning">{T()("not_released")}</Pill>
									</Show>
								</DropdownMenu.Item>
							</li>
						)}
					</For>
					<For each={revisions()}>
						{(item) => (
							<li>
								<DropdownMenu.Item
									class={classNames(
										"flex items-center justify-between px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors",
										{
											"bg-dropdown-hover text-dropdown-contrast":
												currentOption()?.location === item.location,
											"opacity-50 cursor-not-allowed": item.disabled,
										},
									)}
									disabled={item.disabled}
									onSelect={() => {
										if (item.location && !item.disabled) {
											navigate(item.location);
										}
									}}
								>
									<span class="line-clamp-1 mr-2.5">{item.label}</span>
									<Show when={currentOption()?.location === item.location}>
										<div class="w-1.5 h-1.5 rounded-full bg-primary-base" />
									</Show>
								</DropdownMenu.Item>
							</li>
						)}
					</For>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
