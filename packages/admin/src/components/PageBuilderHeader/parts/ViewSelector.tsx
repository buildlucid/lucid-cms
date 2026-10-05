import { useLocation, useNavigate } from "@solidjs/router";
import {
	FaSolidCaretLeft,
	FaSolidCaretRight,
	FaSolidClockRotateLeft,
	FaSolidLink,
} from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import Menu from "@/components/Menu/Menu";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";

export interface ViewSelectorOption {
	label: string;
	disabled: boolean;
	type: "latest" | "environment" | "proposal" | "link";
	location: string;
	/** The side-by-side key for this version, eg. latest, an environment or proposal:1. */
	compareKey?: string;
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
	/** Runs before switching version and returns where to go, or null to stay. */
	onBeforeVersionChange?: (
		option: ViewSelectorOption,
	) => Promise<string | null>;
	/** While comparing, items show which side-by-side column they open in. */
	comparing?: Accessor<boolean>;
}> = (props) => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const location = useLocation();

	// ----------------------------------
	// Memos
	const currentPath = createMemo(() => {
		const search = new URLSearchParams(location.search);
		search.delete("compare");
		const suffix = search.toString();
		return `${location.pathname}${suffix ? `?${suffix}` : ""}`;
	});
	const versionOptions = (type: "latest" | "environment" | "proposal") =>
		props.options().filter((o) => o.type === type && o.hideInDropdown !== true);
	//* release proposals sit below a separator, apart from latest and its targets
	const versionGroups = createMemo(() => [
		{
			separator: false,
			options: [...versionOptions("latest"), ...versionOptions("environment")],
		},
		{ separator: true, options: versionOptions("proposal") },
	]);
	const linkOptions = createMemo(() =>
		props
			.options()
			.filter((o) => o.type === "link" && o.hideInDropdown !== true),
	);
	const currentOption = createMemo(() => {
		return props.options().find((option) => currentPath() === option.location);
	});
	const collectionLabel = createMemo(() => props.collectionSingularName());

	const optionLabel = (option: ViewSelectorOption) => {
		if (option.type === "proposal") return option.label;
		if (option.type === "latest" || option.type === "environment") {
			return T()("actions.view.selector.document.version", {
				version: option.label.toLowerCase(),
				collection: collectionLabel(),
			});
		}

		if (option.label === T()("common.revision.history")) return option.label;

		return T()("actions.view.selector.document.link", {
			label: option.label.toLowerCase(),
			collection: collectionLabel(),
		});
	};

	const currentOptionLabel = createMemo(() => {
		const option = currentOption();
		if (!option) return props.currentViewLabel?.();
		if (option.type === "link" || option.type === "proposal") {
			return optionLabel(option);
		}

		const action =
			option.type === "latest" ? T()("common.edit") : T()("common.view");
		return `${action} ${optionLabel(option)}`;
	});

	const optionStatusVariant = (
		option: ViewSelectorOption,
	): StatusIndicatorVariant => {
		if (option.type === "proposal") return "info-subtle";
		if (option.type === "latest") {
			return currentOption()?.type === "latest" && props.isDocumentMutated?.()
				? "warning-subtle"
				: "success-subtle";
		}
		if (option.type === "environment") {
			if (option.status?.isPublished === false) return "danger-subtle";
			if (option.status?.upToDate === true) return "success-subtle";
			if (option.status?.upToDate === false) return "warning-subtle";
		}
		return "neutral-subtle";
	};
	const currentStatusVariant = createMemo((): StatusIndicatorVariant => {
		const option = currentOption();
		if (option?.type === "link") return "info-subtle";
		if (option === undefined) {
			return props.currentViewLabel?.() !== undefined
				? "info-subtle"
				: "neutral-subtle";
		}
		return optionStatusVariant(option);
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
				<StatusIndicator variant={currentStatusVariant()} size="md" />
				<span class="group-hover:text-body transition-colors duration-200 inline-block capitalize">
					{currentOptionLabel()}
				</span>
			</Menu.Trigger>
			<Menu.Content class="w-65">
				<For each={versionGroups()}>
					{(group) => (
						<Show when={group.options.length > 0}>
							<Show when={group.separator}>
								<Menu.Separator />
							</Show>
							<For each={group.options}>
								{(item) => (
									<Menu.Item
										textValue={optionLabel(item)}
										class="capitalize"
										selected={currentOption()?.location === item.location}
										unavailable={item.disabled}
										onSelect={async () => {
											if (!item.location || item.disabled) return;

											const location = props.onBeforeVersionChange
												? await props.onBeforeVersionChange(item)
												: item.location;
											if (location) navigate(location);
										}}
										end={
											<span class="flex items-center gap-2">
												<Show when={props.comparing?.() && item.compareKey}>
													<Show
														when={item.type === "environment"}
														fallback={
															<FaSolidCaretLeft
																size={11}
																class="fill-icon text-icon"
																aria-label={T()("documents.compare.opens.left")}
															/>
														}
													>
														<FaSolidCaretRight
															size={11}
															class="fill-icon text-icon"
															aria-label={T()("documents.compare.opens.right")}
														/>
													</Show>
												</Show>
												<StatusIndicator
													variant={optionStatusVariant(item)}
													label={
														item.type === "latest"
															? currentOption()?.type === "latest" &&
																props.isDocumentMutated?.()
																? T()("common.unsaved")
																: undefined
															: item.type === "environment"
																? item.status?.isPublished === false
																	? T()("common.status.unreleased")
																	: item.status?.upToDate
																		? T()("documents.release.status.up.to.date")
																		: T()(
																				"documents.release.status.out.of.date",
																			)
																: undefined
													}
												/>
											</span>
										}
									>
										{optionLabel(item)}
									</Menu.Item>
								)}
							</For>
						</Show>
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
