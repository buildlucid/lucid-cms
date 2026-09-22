import { useLocation, useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidClockRotateLeft, FaSolidLink } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import Menu from "@/components/Menu/Menu";
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
	onBeforeVersionChange?: () => Promise<void>;
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
			return T()("actions.view.selector.document.version", {
				version: option.label.toLowerCase(),
				collection: collectionLabel(),
			});
		}

		if (option.label === T()("common.revision.history")) {
			return T()("actions.view.selector.revision.history", {
				collection: collectionLabel(),
			});
		}

		return T()("actions.view.selector.document.link", {
			label: option.label.toLowerCase(),
			collection: collectionLabel(),
		});
	};

	const currentOptionLabel = createMemo(() => {
		const option = currentOption();
		if (!option) return props.currentViewLabel?.();
		if (option.type === "link") return optionLabel(option);

		const action =
			option.type === "latest" ? T()("common.edit") : T()("common.view");
		return `${action} ${optionLabel(option)}`;
	});

	const optionIcon = (option: ViewSelectorOption) => {
		if (option.icon === "history") return <FaSolidClockRotateLeft size={14} />;

		return <FaSolidLink size={14} />;
	};

	// ----------------------------------
	// Render
	return (
		<Menu.Root>
			<Menu.Trigger class="group flex items-center gap-2 text-base font-medium text-title rounded-md transition-colors outline-none focus-visible:ring-2 ring-primary">
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
			</Menu.Trigger>
			<Menu.Content class="w-[260px]">
				<For each={environments()}>
					{(item) => (
						<Menu.Item
							textValue={optionLabel(item)}
							class="capitalize"
							selected={currentOption()?.location === item.location}
							unavailable={item.disabled}
							onSelect={async () => {
								if (item.location && !item.disabled) {
									await props.onBeforeVersionChange?.();
									navigate(item.location);
								}
							}}
							end={
								<span
									class={classNames("w-2.5 h-2.5 rounded-full border", {
										"bg-primary-muted-bg border-primary-muted-border":
											(item.type === "latest" &&
												!props.isDocumentMutated?.()) ||
											(item.type === "environment" &&
												item.status?.isPublished === true &&
												item.status?.upToDate === true),
										"bg-warning-base/40 border-warning-base/60":
											(item.type === "latest" && props.isDocumentMutated?.()) ||
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
												? T()("common.unsaved")
												: undefined
											: item.type === "environment"
												? item.status?.isPublished === false
													? T()("common.status.unreleased")
													: item.status?.upToDate
														? T()("documents.release.status.up.to.date")
														: T()("documents.release.status.out.of.date")
												: undefined
									}
								/>
							}
						>
							{optionLabel(item)}
						</Menu.Item>
					)}
				</For>
				<Show when={linkOptions().length > 0}>
					<Menu.Separator />
				</Show>
				<For each={linkOptions()}>
					{(item) => (
						<Menu.Item
							textValue={optionLabel(item)}
							class="capitalize"
							selected={currentOption()?.location === item.location}
							disabled={item.disabled}
							onSelect={() => {
								if (item.location && !item.disabled) {
									navigate(item.location);
								}
							}}
							end={optionIcon(item)}
						>
							{optionLabel(item)}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};
