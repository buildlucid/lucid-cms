import { A } from "@solidjs/router";
import classnames from "classnames";
import { TbOutlineArrowRight } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import T from "@/translations";

export type ViewAllLinkProps = {
	/** Replaces the "View all" text. */
	label?: string;
	class?: string;
} & (
	| { href: string; onClick?: never }
	| {
			/** Opens the full list in place, such as in a drawer. */
			onClick: () => void;
			href?: never;
	  }
);

/**
 * A quiet link to the full list behind a short preview, as used on Home
 * widgets and sidebar sections.
 *
 * @example
 * ```tsx
 * import { ViewAllLink } from "@lucidcms/admin/components";
 *
 * return <ViewAllLink href="/admin/requests" />;
 * // or open the full list in place
 * return <ViewAllLink onClick={() => setDrawerOpen(true)} />;
 * ```
 */
const ViewAllLink: Component<ViewAllLinkProps> = (props) => {
	// ----------------------------------------
	// Functions
	const classes = () =>
		classnames(
			"group flex items-center gap-1.5 rounded-md px-1 text-xs text-muted transition-colors hover:text-body focus-ring",
			props.class,
		);
	const content = () => (
		<>
			{props.label ?? T()("common.view.all")}
			<TbOutlineArrowRight
				size={9}
				class="transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
			/>
		</>
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.href}
			fallback={
				<button type="button" class={classes()} onClick={props.onClick}>
					{content()}
				</button>
			}
		>
			{(href) => (
				<A href={href()} class={classes()}>
					{content()}
				</A>
			)}
		</Show>
	);
};

export default ViewAllLink;
