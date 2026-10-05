import classnames from "classnames";
import {
	type Component,
	createUniqueId,
	type JSXElement,
	Show,
} from "solid-js";
import ViewAllLink from "@/components/ViewAllLink/ViewAllLink";

export interface DashboardCardProps {
	title: string;
	description?: string;
	/** Shown as a badge beside the title when above zero. */
	count?: number;
	/** Adds a "View all" link to the header. */
	href?: string;
	/** Replaces the "View all" link text. */
	linkLabel?: string;
	/** Shown in the header, before the link. */
	actions?: JSXElement;
	/** Shown under the content, divided from it. */
	footer?: JSXElement;
	/** @default "sm" */
	padding?: "none" | "sm" | "md";
	class?: string;
	children?: JSXElement;
}

/**
 * A card for a Home overview widget, with a title, optional link and the
 * widget's content. Fills the height of its grid cell.
 *
 * @example
 * ```tsx
 * import { DashboardCard, DashboardCardItem } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<DashboardCard title={t("reports.title")} href="/lucid/e/reports">
 * 		<ul>
 * 			<li>
 * 				<DashboardCardItem title={t("reports.weekly")} href="/lucid/e/reports/weekly" />
 * 			</li>
 * 		</ul>
 * 	</DashboardCard>
 * );
 * ```
 */
const DashboardCard: Component<DashboardCardProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const titleId = createUniqueId();

	// ----------------------------------------
	// Render
	return (
		<section
			data-dashboard-card
			aria-labelledby={titleId}
			class={classnames(
				"flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
				props.class,
			)}
		>
			<header class="flex min-h-12 items-center justify-between gap-3 px-4 pt-3 pb-1">
				<div class="flex min-w-0 items-center gap-2">
					<h2 id={titleId} class="truncate text-sm font-medium text-title">
						{props.title}
					</h2>
					<Show when={(props.count ?? 0) > 0}>
						<span class="rounded-full bg-primary-low px-1.5 text-[11px] leading-4 tabular-nums text-primary-low-foreground">
							{props.count}
						</span>
					</Show>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					{props.actions}
					<Show when={props.href}>
						{(href) => <ViewAllLink href={href()} label={props.linkLabel} />}
					</Show>
				</div>
			</header>
			<Show when={props.description}>
				<p class="-mt-0.5 px-4 pb-1 text-xs text-body">{props.description}</p>
			</Show>
			<div
				class={classnames("flex grow flex-col", {
					"px-2 pb-2": (props.padding ?? "sm") === "sm",
					"px-4 pt-1 pb-4": props.padding === "md",
				})}
			>
				{props.children}
			</div>
			<Show when={props.footer}>
				<div class="border-t border-border px-4 py-2.5">{props.footer}</div>
			</Show>
		</section>
	);
};

export default DashboardCard;
