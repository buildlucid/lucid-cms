import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface SectionHeadingProps {
	title: string;
	description?: string;
	/** Heading level, for the page's outline. @default 2 */
	level?: 2 | 3 | 4;
	/** Buttons or links, against the right edge. */
	actions?: JSXElement;
	/** Overrides the spacing this heading keeps from the section above it. */
	class?: string;
}

/**
 * A heading that separates one section of a page or drawer from the next. It
 * spaces itself from what came before, apart from when it comes first.
 *
 * @example
 * ```tsx
 * import { Button, SectionHeading } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<SectionHeading
 * 		title={t("common.details")}
 * 		description={t("common.content.summary")}
 * 		actions={<Button size="sm">{t("common.edit")}</Button>}
 * 	/>
 * );
 * ```
 */
const SectionHeading: Component<SectionHeadingProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"flex justify-between mt-6 mb-4 first:mt-0",
				props.class,
			)}
		>
			<div class="w-full flex flex-col">
				<Dynamic component={`h${props.level ?? 2}`} class="text-base">
					{props.title}
				</Dynamic>
				<Show when={props.description}>
					<p class="mt-1 text-sm text-body max-w-2xl">{props.description}</p>
				</Show>
			</div>
			<Show when={props.actions}>
				<div>{props.actions}</div>
			</Show>
		</div>
	);
};

export default SectionHeading;
