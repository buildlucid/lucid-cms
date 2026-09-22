import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export interface InfoRowRootProps {
	title?: string;
	description?: string;
	class?: string;
	children?: JSXElement;
}

export interface InfoRowContentProps {
	title?: string;
	description?: string;
	/** Vertical alignment of the actions. @default "top" */
	align?: "top" | "center";
	actions?: JSXElement;
	class?: string;
	children?: JSXElement;
}

/**
 * A settings section, with a title and description on the left and content
 * cards on the right.
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
				"w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-10 mb-5 last:mb-0",
				props.class,
			)}
		>
			<div class="md:col-span-1">
				<Show when={props.title}>
					<h2 class="text-base mb-0.5">{props.title}</h2>
				</Show>
				<Show when={props.description}>
					<p class="text-sm">{props.description}</p>
				</Show>
			</div>
			<div class="md:col-span-2 lg:col-span-3 space-y-2">{props.children}</div>
		</div>
	);
};

const InfoRowContent: Component<InfoRowContentProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-info-row-content
			class={classnames(
				"rounded-md border border-border bg-card p-4",
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
							<h3 class="text-base">{props.title}</h3>
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
			<Show when={props.children}>
				<div
					class={classnames({
						"mt-4": props.title || props.description,
					})}
				>
					{props.children}
				</div>
			</Show>
		</div>
	);
};

const InfoRow = {
	Root: InfoRowRoot,
	Content: InfoRowContent,
};

export default InfoRow;
