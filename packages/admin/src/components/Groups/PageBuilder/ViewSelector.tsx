import { DropdownMenu } from "@kobalte/core";
import { useLocation, useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidClockRotateLeft, FaSolidLink } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import T from "@/translations";

export interface ViewSelectorOption {
	label: string;
	disabled: boolean;
	type: "latest" | "environment" | "link";
	location: string;
	hideInDropdown?: boolean;
	icon?: "history";
	status?: {
		isPublished?: boolean;
		upToDate?: boolean;
	};
}

export const ViewSelector: Component<{
	options: Accessor<ViewSelectorOption[]>;
	collectionSingularName: Accessor<string>;
	isDocumentMutated?: Accessor<boolean>;
	currentViewLabel?: Accessor<string | undefined>;
}> = (props) => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const location = useLocation();

	// ----------------------------------
	// Memos
	const currentPath = createMemo(
		() => `${location.pathname}${location.search}`,
	);
	const environments = createMemo(() =>
		props
			.options()
			.filter(
				(o) =>
					(o.type === "latest" || o.type === "environment") &&
					o.hideInDropdown !== true,
			),
	);
	const linkOptions = createMemo(() =>
		props
			.options()
			.filter((o) => o.type === "link" && o.hideInDropdown !== true),
	);
	const currentOption = createMemo(() => {
		return props
			.options()
			.find(
				(option) =>
					currentPath().includes(option.location) ||
					location.pathname.includes(option.location),
			);
	});
	const collectionLabel = createMemo(() => props.collectionSingularName());

	const optionLabel = (option: ViewSelectorOption) => {
		if (option.type === "latest" || option.type === "environment") {
			return T()("view_selector_document_version", {
				version: option.label.toLowerCase(),
				collection: collectionLabel(),
			});
		}

		if (option.label === T()("revision_history")) {
			return T()("view_selector_revision_history", {
				collection: collectionLabel(),
			});
		}

		return T()("view_selector_document_link", {
			label: option.label.toLowerCase(),
			collection: collectionLabel(),
		});
	};

	const currentOptionLabel = createMemo(() => {
		const option = currentOption();
		if (!option) return props.currentViewLabel?.();
		if (option.type === "link") return optionLabel(option);

		const action = option.type === "latest" ? T()("edit") : T()("view");
		return `${action} ${optionLabel(option)}`;
	});

	const optionIcon = (option: ViewSelectorOption) => {
		if (option.icon === "history") return <FaSolidClockRotateLeft size={14} />;

		return <FaSolidLink size={14} />;
	};

	// ----------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="group flex items-center gap-2 text-base font-medium text-title rounded-md transition-colors outline-none focus-visible:ring-2 ring-primary">
				<span
					class={classNames("size-3 rounded-full border block", {
						"bg-primary-muted-bg border-primary-muted-border":
							(currentOption()?.type === "latest" &&
								!props.isDocumentMutated?.()) ||
							(currentOption()?.type === "environment" &&
								currentOption()?.status?.upToDate === true),
						"bg-warning-base/40 border-warning-base/60":
							(currentOption()?.type === "latest" &&
								props.isDocumentMutated?.()) ||
							(currentOption()?.type === "environment" &&
								currentOption()?.status?.upToDate === false),
						"bg-info-base/40 border-info-base/60":
							currentOption()?.type === "link" ||
							(currentOption() === undefined &&
								props.currentViewLabel?.() !== undefined),
					})}
				/>
				<span class="group-hover:text-body transition-colors duration-200 inline-block capitalize">
					{currentOptionLabel()}
				</span>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "div",
					rounded: true,
					class: "w-[260px] z-60 p-1.5!",
				}}
			>
				<ul class="flex flex-col gap-y-0.5">
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
										class={classNames("line-clamp-1 mr-2 capitalize", {
											"opacity-50": item.disabled,
										})}
									>
										{optionLabel(item)}
									</span>
									<span
										class={classNames("w-2.5 h-2.5 rounded-full border", {
											"bg-primary-muted-bg border-primary-muted-border":
												(item.type === "latest" &&
													!props.isDocumentMutated?.()) ||
												(item.type === "environment" &&
													item.status?.isPublished === true &&
													item.status?.upToDate === true),
											"bg-warning-base/40 border-warning-base/60":
												(item.type === "latest" &&
													props.isDocumentMutated?.()) ||
												(item.type === "environment" &&
													item.status?.isPublished === true &&
													item.status?.upToDate === false),
											"bg-error-base/40 border-error-base/60":
												item.type === "environment" &&
												item.status?.isPublished === false,
										})}
										title={
											item.type === "latest"
												? props.isDocumentMutated?.()
													? T()("unsaved")
													: undefined
												: item.type === "environment"
													? item.status?.isPublished === false
														? T()("unreleased")
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
					<For each={linkOptions()}>
						{(item, index) => (
							<li
								class={classNames({
									"border-t border-border pt-1 mt-0.5": index() === 0,
								})}
							>
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
									<span class="line-clamp-1 flex items-center gap-2 capitalize">
										{optionLabel(item)}
									</span>
									{optionIcon(item)}
								</DropdownMenu.Item>
							</li>
						)}
					</For>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
