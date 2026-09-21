import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export interface PageLayoutRootProps {
	class?: string;
	children?: JSXElement;
}

export interface PageLayoutHeaderProps {
	title?: string;
	description?: string;
	/** Buttons or links, against the right edge on desktop. */
	actions?: JSXElement;
	/** A row under the title, for tabs or a filter bar. */
	children?: JSXElement;
	class?: string;
}

export interface PageLayoutBodyProps {
	class?: string;
	children?: JSXElement;
}

/**
 * The frame a page sits in. It stacks whatever you put in it, so anything
 * before the header becomes a top bar and anything after the body is pinned
 * beneath it.
 *
 * @example
 * ```tsx
 * import { Button, PageLayout } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<PageLayout.Root>
 * 		<PageLayout.Header
 * 			title={t("admin:reports.title")}
 * 			description={t("admin:reports.description")}
 * 			actions={<Button size="sm" onClick={run}>{t("admin:reports.run")}</Button>}
 * 		/>
 * 		<PageLayout.Body class="p-4 md:p-6">
 * 			<ReportList />
 * 		</PageLayout.Body>
 * 	</PageLayout.Root>
 * );
 * ```
 */
const PageLayoutRoot: Component<PageLayoutRootProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		//* the 15px leaves room for the shell's bottom padding
		<div
			class={classnames(
				"flex flex-col min-h-[calc(100vh-15px)] border-t border-x border-border rounded-t-xl overflow-x-hidden",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};

/** The page's title row. Children render as a second row beneath it. */
const PageLayoutHeader: Component<PageLayoutHeaderProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"bg-background-base border-b border-border",
				props.class,
			)}
		>
			<div
				class={classnames(
					"flex flex-col md:flex-row md:justify-between items-start gap-x-8 gap-y-4 px-4 md:px-6 pt-4 md:pt-6 pb-4",
					{
						//* the second row supplies the bottom spacing when there is one
						"md:pb-6": !props.children,
					},
				)}
			>
				<div class="w-full min-w-0">
					<Show when={props.title}>
						<h1 class="text-base">{props.title}</h1>
					</Show>
					<Show when={props.description}>
						<p class="mt-1 text-sm">{props.description}</p>
					</Show>
				</div>
				<Show when={props.actions}>
					<div class="flex w-full items-center justify-end gap-2.5">
						{props.actions}
					</div>
				</Show>
			</div>
			{props.children}
		</div>
	);
};

/** The part of the page that grows to fill the height left over. */
const PageLayoutBody: Component<PageLayoutBodyProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"flex grow flex-col justify-between bg-background-base",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};

const PageLayout = {
	Root: PageLayoutRoot,
	Header: PageLayoutHeader,
	Body: PageLayoutBody,
};

export default PageLayout;
