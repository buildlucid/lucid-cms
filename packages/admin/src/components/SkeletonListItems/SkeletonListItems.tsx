import { type Component, Index } from "solid-js";

export interface SkeletonListItemsProps {
	/** @default 3 */
	count?: number;
}

const SkeletonListItems: Component<SkeletonListItemsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Index each={Array.from({ length: props.count ?? 3 })}>
			{() => (
				<li class="flex items-center gap-3 px-2 py-2">
					<span class="skeleton block h-9 w-7 shrink-0" />
					<span class="flex grow flex-col gap-1.5">
						<span class="skeleton block h-3.5 w-1/2" />
						<span class="skeleton block h-3 w-1/3" />
					</span>
				</li>
			)}
		</Index>
	);
};

export default SkeletonListItems;
