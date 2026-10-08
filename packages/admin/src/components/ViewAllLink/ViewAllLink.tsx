import { A } from "@solidjs/router";
import classnames from "classnames";
import { TbOutlineArrowRight } from "solid-icons/tb";
import type { Component } from "solid-js";
import T from "@/translations";

export interface ViewAllLinkProps {
	href: string;
	/** Replaces the "View all" text. */
	label?: string;
	class?: string;
}

/**
 * A quiet link to the full list behind a short preview, as used on Home
 * widgets and sidebar sections.
 *
 * @example
 * ```tsx
 * import { ViewAllLink } from "@lucidcms/admin/components";
 *
 * return <ViewAllLink href="/lucid/requests" />;
 * ```
 */
const ViewAllLink: Component<ViewAllLinkProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<A
			href={props.href}
			class={classnames(
				"group flex items-center gap-1.5 rounded-md px-1 text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
				props.class,
			)}
		>
			{props.label ?? T()("common.view.all")}
			<TbOutlineArrowRight
				size={9}
				class="transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
			/>
		</A>
	);
};

export default ViewAllLink;
