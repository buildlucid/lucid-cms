import { type Component, children, type JSXElement, Show } from "solid-js";
import T from "@/translations";

export interface SkeletonProps {
	/**
	 * Placeholder shapes built from `.skeleton` blocks, sized like the content they stand in for.
	 * Without children, a heading and a few lines of text are shown.
	 */
	children?: JSXElement;
	class?: string;
}

/**
 * Announces loading to screen readers while showing placeholder shapes. Use it, rather than a spinner, wherever content is on its way.
 *
 * @example
 * ```tsx
 * import { Skeleton } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Skeleton class="flex flex-col gap-3">
 * 		<span class="skeleton block h-5 w-40" />
 * 		<span class="skeleton block h-24 w-full" />
 * 	</Skeleton>
 * );
 * ```
 */
const Skeleton: Component<SkeletonProps> = (props) => {
	// ----------------------------------------
	// Memos
	const shapes = children(() => props.children);

	// ----------------------------------------
	// Render
	return (
		<div data-skeleton role="status" class={props.class}>
			<span class="sr-only">
				{T()("common.loading")}
				{T()("common.ellipsis")}
			</span>
			<Show
				when={shapes()}
				fallback={
					<>
						<span class="skeleton mb-3 block h-5 w-40 max-w-full" />
						<span class="skeleton mb-2 block h-4 w-full" />
						<span class="skeleton mb-2 block h-4 w-11/12" />
						<span class="skeleton block h-4 w-2/3" />
					</>
				}
			>
				{shapes()}
			</Show>
		</div>
	);
};

export default Skeleton;
