import { DropdownMenu } from "@kobalte/core";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import { FaSolidChevronRight } from "solid-icons/fa";
import classNames from "classnames";
import { useLocation, useNavigate } from "@solidjs/router";
import T from "@/translations";
import DropdownContent from "@/components/Partials/DropdownContent";

export interface ViewSelectorOption {
	label: string;
	disabled: boolean;
	type: "latest" | "environment" | "revision";
	location: string;
	status?: {
		isPublished?: boolean;
		upToDate?: boolean;
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
							currentOption()?.type === "latest" ||
							(currentOption()?.type === "environment" &&
								currentOption()?.status?.upToDate === true),
						"bg-warning-base/40 border-warning-base/60":
							currentOption()?.type === "revision" ||
							(currentOption()?.type === "environment" &&
								currentOption()?.status?.upToDate === false),
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
										"flex items-center justify-between hover:bg-dropdown-hover hover:text-dropdown-contrast px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors",
										{
											"bg-dropdown-hover text-dropdown-contrast":
												currentOption()?.location === item.location,
											"hover:bg-dropdown-base! hover:text-body!": item.disabled,
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
									<span
										class={classNames("w-2.5 h-2.5 rounded-full border", {
											"bg-primary-base/40 border-primary-base/60":
												item.type === "latest" ||
												(item.type === "environment" &&
													item.status?.isPublished === true &&
													item.status?.upToDate === true),
											"bg-warning-base/40 border-warning-base/60":
												item.type === "environment" &&
												item.status?.isPublished === true &&
												item.status?.upToDate === false,
											"bg-error-base/40 border-error-base/60":
												item.type === "environment" &&
												item.status?.isPublished === false,
										})}
										title={
											item.type === "environment"
												? item.status?.isPublished === false
													? T()("not_released")
													: item.status?.upToDate
														? T()("released_up_to_date")
														: T()("released_out_of_date")
												: undefined
										}
									/>
								</DropdownMenu.Item>
							</li>
						)}
					</For>
					<For each={revisions()}>
						{(item) => (
							<li>
								<DropdownMenu.Item
									class={classNames(
										"flex items-center justify-between hover:bg-dropdown-hover hover:text-dropdown-contrast px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors",
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
									<span class="w-2.5 h-2.5 rounded-full border bg-warning-base/40 border-warning-base/60" />
								</DropdownMenu.Item>
							</li>
						)}
					</For>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
