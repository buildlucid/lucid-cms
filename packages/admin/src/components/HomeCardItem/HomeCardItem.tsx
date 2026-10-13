import { A } from "@solidjs/router";
import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface HomeCardItemProps {
	title: string;
	/** A second, quieter line under the title. */
	description?: string;
	/** A small icon before the text. */
	icon?: JSXElement;
	/** A larger visual before the text that replaces `icon`. */
	thumb?: JSXElement;
	/** Shown at the end of the row, such as a time or status. */
	meta?: JSXElement;
	/** Renders a link when set, or a button otherwise. */
	href?: string;
	onClick?: () => void;
	class?: string;
}

/**
 * A HomeCard list row with a title and optional description, visual and trailing detail.
 *
 * @example
 * ```tsx
 * import { HomeCardItem, DateText } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<HomeCardItem
 * 		title={report.title}
 * 		description={t("reports.item.description", { author: report.author })}
 * 		meta={<DateText date={report.createdAt} />}
 * 		href={`/lucid/e/reports/${report.id}`}
 * 	/>
 * );
 * ```
 */
const HomeCardItem: Component<HomeCardItemProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Dynamic
			component={props.href ? A : "button"}
			data-home-card-item
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

export default HomeCardItem;
