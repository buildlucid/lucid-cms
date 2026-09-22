import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export interface SectionHeadingProps {
	title: string;
	description?: string;
	/** @default 2 */
	level?: 2 | 3 | 4;
	actions?: JSXElement;
	class?: string;
}

/**
 * A heading for a section of a page, with an optional description and actions.
 *
 * @example
 * ```tsx
 * import { SectionHeading } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<SectionHeading
 * 		title={t("social.title")}
 * 		description={t("social.description")}
 * 	/>
 * );
 * ```
 */
const SectionHeading: Component<SectionHeadingProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-section-heading
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
