import classNames from "classnames";
import {
	type Component,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import Pill, { type PillSize, type PillVariant } from "@/components/Pill/Pill";

export type DetailsListVariant = "card" | "plain";
export type DetailsListPadding = "sm" | "md";
export type DetailsListItemType = "text" | "pill";

export interface DetailsListItem {
	label: string;
	value?: string | number | null | JSXElement;
	/** @default "text" */
	type?: DetailsListItemType;
	/** @default "primary" */
	pillVariant?: PillVariant;
	pillSize?: PillSize;
	/** @default true */
	show?: boolean;
	/** Shows the value under the label at every screen size. */
	stacked?: boolean;
	/** Lets long values wrap onto more lines. */
	wrap?: boolean;
}

export interface DetailsListProps {
	items: DetailsListItem[];
	/** @default "card" */
	variant?: DetailsListVariant;
	/** Ignored by the `plain` variant. @default "md" */
	padding?: DetailsListPadding;
	class?: string;
}

/**
 * A list of labels and values. Values can be shown as text or as a pill.
 *
 * @example
 * ```tsx
 * import { DetailsList } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<DetailsList
 * 		items={[
 * 			{ label: t("common.name"), value: redirect.name },
 * 			{ label: t("common.status"), value: redirect.status, type: "pill" },
 * 		]}
 * 	/>
 * );
 * ```
 */
const DetailsList: Component<DetailsListProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<ul
			data-details-list
			class={classNames(
				"w-full",
				{
					"rounded-md border border-border bg-card": props.variant !== "plain",
					"p-3": props.variant !== "plain" && props.padding === "sm",
					"px-4 py-3": props.variant !== "plain" && props.padding !== "sm",
				},
				props.class,
			)}
		>
			<For each={props.items}>
				{(item) => (
					<Show when={item.show !== false}>
						<li
							data-details-list-item
							class={classNames(
								"mb-2 flex gap-x-2 gap-y-1 border-b border-border pb-2 last:mb-0 last:border-b-0 last:pb-0",
								{
									"flex-col items-start lg:justify-between":
										item.type !== "pill",
									"items-center justify-between": item.type === "pill",
									"lg:flex-row lg:items-center": !item.stacked,
								},
							)}
						>
							<span class="text-sm font-medium text-subtitle">
								{item.label}
							</span>
							<Show when={item.value !== undefined}>
								<Switch>
									<Match when={item.type === "pill"}>
										<Pill
											variant={item.pillVariant ?? "primary"}
											size={item.pillSize}
										>
											{item.value}
										</Pill>
									</Match>
									<Match when={item.type !== "pill"}>
										<span
											class={classNames("text-sm font-medium text-muted", {
												"min-w-0 text-left break-all lg:text-right": item.wrap,
											})}
										>
											{item.value}
										</span>
									</Match>
								</Switch>
							</Show>
						</li>
					</Show>
				)}
			</For>
		</ul>
	);
};

export default DetailsList;
