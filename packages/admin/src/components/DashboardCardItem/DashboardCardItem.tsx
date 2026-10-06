import { A } from "@solidjs/router";
import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface DashboardCardItemProps {
	title: string;
	/** A second, quieter line under the title. */
	description?: string;
	/** A small icon before the text. Colour it to signal a state. */
	icon?: JSXElement;
	/** A larger visual before the text, such as a document sketch. Replaces `icon`. */
	thumb?: JSXElement;
	/** Shown at the end of the row, such as a time or status. */
	meta?: JSXElement;
	/** Makes the row a link. Without it, the row is a button. */
	href?: string;
	onClick?: () => void;
	class?: string;
}

/**
 * A row in a DashboardCard list, with a title, optional description, icon and
 * trailing detail. Keeps widget lists consistent.
 *
 * @example
 * ```tsx
 * import { DashboardCardItem, DateText } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<DashboardCardItem
 * 		title={report.title}
 * 		description={t("reports.item.description", { author: report.author })}
 * 		meta={<DateText date={report.createdAt} />}
 * 		href={`/lucid/e/reports/${report.id}`}
 * 	/>
 * );
 * ```
 */
const DashboardCardItem: Component<DashboardCardItemProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dynamic
			component={props.href ? A : "button"}
			data-dashboard-card-item
			href={props.href}
			type={props.href ? undefined : "button"}
			onClick={props.onClick}
			class={classnames(
				"group flex w-full min-w-0 items-center gap-3 rounded-md px-2 py-2 text-start transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
				props.class,
			)}
		>
			<Show
				when={props.thumb}
				fallback={
					<Show when={props.icon}>
						<span class="flex h-5 w-4 shrink-0 items-center justify-center self-start text-icon transition-colors group-hover:text-title">
							{props.icon}
						</span>
					</Show>
				}
			>
				<span class="flex shrink-0">{props.thumb}</span>
			</Show>
			<span class="flex min-w-0 grow flex-col">
				<span class="truncate text-sm text-title">{props.title}</span>
				<Show when={props.description}>
					<span class="truncate text-xs text-muted">{props.description}</span>
				</Show>
			</span>
			<Show when={props.meta}>
				<span class="flex h-5 shrink-0 items-center self-start text-xs text-muted">
					{props.meta}
				</span>
			</Show>
		</Dynamic>
	);
};

export default DashboardCardItem;
