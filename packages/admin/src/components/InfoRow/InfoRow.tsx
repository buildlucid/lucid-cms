import classnames from "classnames";
import { type Component, children, type JSXElement, Show } from "solid-js";

export interface InfoRowRootProps {
	title?: string;
	description?: string;
	/** Shows title and description skeletons, for loading fallbacks where the section isn't known yet. */
	loading?: boolean;
	/** Content under the description, such as the section's create action. */
	aside?: JSXElement;
	class?: string;
	children?: JSXElement;
}

export interface InfoRowContentProps {
	title?: string;
	description?: string;
	/** Vertical alignment of the actions. @default "top" */
	align?: "top" | "center";
	/** `none` lets content such as a table reach the card's edges, clipped to its rounded corners. @default "md" */
	padding?: "md" | "none";
	actions?: JSXElement;
	class?: string;
	children?: JSXElement;
}

/**
 * A settings section, with a title and description on the left and content
 * cards on the right. Below `lg` they stack, and the title pins to the top as
 * a full-width bar while the section scrolls.
 *
 * @example
 * ```tsx
 * import { Button, InfoRow } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<InfoRow.Root title={t("cache.title")} description={t("cache.description")}>
 * 		<InfoRow.Content
 * 			title={t("cache.clear.title")}
 * 			actions={<Button size="sm" onClick={clearCache}>{t("common.clear")}</Button>}
 * 		/>
 * 	</InfoRow.Root>
 * );
 * ```
 */
const InfoRowRoot: Component<InfoRowRootProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-info-row-root
			class={classnames(
				"w-full grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-10 mb-5 last:mb-0",
				props.class,
			)}
		>
			{/* stays in view while a long section scrolls. Stacked, it's a full-width bar: `before` paints its background over
			the gap above (and the page frame's translucent top border) and bleeds over the body padding. The negative margin
			cancels its bottom padding, so spacing at rest is unchanged */}
			<div class="info-row-heading sticky top-[calc(var(--page-layout-sticky-top)+--spacing(4))] z-10 -mb-4 pb-4 before:absolute before:-top-4 before:bottom-0 before:-inset-x-4 before:-z-1 before:bg-background md:before:-top-5 md:before:-inset-x-6 lg:top-8 lg:col-span-1 lg:mb-0 lg:self-start lg:before:hidden">
				<Show
					when={!props.loading}
					fallback={
						<>
							<div class="text-sm mb-0.5">
								<span class="skeleton block w-32">&nbsp;</span>
							</div>
							<p class="text-sm">
								<span class="skeleton block w-full max-w-56">&nbsp;</span>
							</p>
						</>
					}
				>
					<Show when={props.title}>
						<h2 class="text-sm font-medium mb-0.5">{props.title}</h2>
					</Show>
					<Show when={props.description}>
						<p class="text-sm">{props.description}</p>
					</Show>
					<Show when={props.aside}>
						<div class="mt-4 flex flex-wrap items-center gap-2">
							{props.aside}
						</div>
					</Show>
				</Show>
				{/* fades content out beneath the bar, shown only once it's stuck */}
				<span
					aria-hidden="true"
					class="info-row-fade pointer-events-none absolute top-full -inset-x-4 h-6 bg-linear-to-b from-background to-transparent md:-inset-x-6 lg:hidden"
				/>
			</div>
			{/* keeps content z-indexes, like media previews, beneath the sticky title bar */}
			<div class="isolate lg:col-span-3 space-y-2">{props.children}</div>
		</div>
	);
};

const InfoRowContent: Component<InfoRowContentProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* resolved once, as reading `props.children` twice would create the content twice
	const content = children(() => props.children);

	// ----------------------------------------
	// Render
	return (
		<div
			data-info-row-content
			class={classnames(
				"rounded-md border border-border bg-card",
				{
					"p-4": props.padding !== "none",
					"overflow-hidden": props.padding === "none",
				},
				props.class,
			)}
		>
			<Show when={props.title || props.description || props.actions}>
				<div
					class={classnames(
						"flex flex-col gap-6 md:flex-row md:justify-between",
						{
							"md:items-start": props.align !== "center",
							"md:items-center": props.align === "center",
						},
					)}
				>
					<div>
						<Show when={props.title}>
							<h3 class="text-sm font-medium">{props.title}</h3>
						</Show>
						<Show when={props.description}>
							<p class="text-sm max-w-4xl mt-1">{props.description}</p>
						</Show>
					</div>
					<Show when={props.actions}>
						<div class="flex items-center gap-2">{props.actions}</div>
					</Show>
				</div>
			</Show>
			<Show when={content()}>
				<div
					class={classnames({
						"mt-4": props.title || props.description,
					})}
				>
					{content()}
				</div>
			</Show>
		</div>
	);
};

export interface InfoRowItemProps {
	/** Leave out when the section's own title covers the row, such as a lone row of details. */
	title?: string;
	/** Shown after the title, such as a status pill. */
	badge?: JSXElement;
	description?: string;
	actions?: JSXElement;
	class?: string;
	/** Content below the title, such as a list of sign-in methods. */
	children?: JSXElement;
}

/** A roomy row inside an `InfoRow.Content` with `padding="none"`, for cards made of divided rows. Wrap rows in a `<ul class="divide-y divide-border">`. */
const InfoRowItem: Component<InfoRowItemProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* resolved once, as reading `props.children` twice would create the content twice
	const content = children(() => props.children);

	// ----------------------------------------
	// Render
	return (
		<li class={classnames("px-5 py-4", props.class)}>
			<Show when={props.title || props.description || props.actions}>
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div class="min-w-0">
						<Show when={props.title}>
							<h3 class="flex items-center gap-2 text-sm font-medium">
								{props.title}
								{props.badge}
							</h3>
						</Show>
						<Show when={props.description}>
							<p class="mt-0.5 max-w-2xl text-sm">{props.description}</p>
						</Show>
					</div>
					<Show when={props.actions}>
						<div class="flex shrink-0 items-center gap-2">{props.actions}</div>
					</Show>
				</div>
			</Show>
			<Show when={content()}>
				<div
					class={classnames({
						"mt-4": props.title || props.description || props.actions,
					})}
				>
					{content()}
				</div>
			</Show>
		</li>
	);
};

const InfoRow = {
	Root: InfoRowRoot,
	Content: InfoRowContent,
	Item: InfoRowItem,
};

export default InfoRow;
