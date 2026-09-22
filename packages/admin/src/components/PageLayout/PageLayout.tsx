import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export interface PageLayoutRootProps {
	class?: string;
	children?: JSXElement;
}

export interface PageLayoutHeaderProps {
	title?: string;
	description?: string;
	actions?: JSXElement;
	/** Shown under the title, such as tabs or a toolbar. */
	children?: JSXElement;
	class?: string;
}

export interface PageLayoutBodyProps {
	/** @default "none" */
	padding?: "none" | "sm" | "md";
	class?: string;
	children?: JSXElement;
}

/**
 * The layout for a page, with a header and a body.
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
 * 			title={t("redirects.title")}
 * 			description={t("redirects.description")}
 * 			actions={<Button size="sm" onClick={openCreate}>{t("common.create")}</Button>}
 * 		/>
 * 		<PageLayout.Body padding="md">
 * 			<RedirectsTable />
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
			data-page-layout-root
			class={classnames(
				"flex flex-col min-h-[calc(100vh-15px)] border-t border-x border-border rounded-t-xl overflow-x-hidden",
				props.class,
			)}
		>
			{props.children}
		</div>
	);
};

/** The page's title, description and actions. */
const PageLayoutHeader: Component<PageLayoutHeaderProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-page-layout-header
			class={classnames("bg-background border-b border-border", props.class)}
		>
			<div
				class={classnames(
					"flex flex-col md:flex-row md:justify-between items-start gap-x-8 gap-y-4 px-4 md:px-6 pt-4 md:pt-6 pb-4",
					{
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

/** The page's content. Fills the remaining height. */
const PageLayoutBody: Component<PageLayoutBodyProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-page-layout-body
			class={classnames(
				"flex grow flex-col justify-between bg-background",
				{
					"p-4": props.padding === "sm",
					"p-4 md:p-6": props.padding === "md",
				},
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
