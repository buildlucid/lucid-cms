import {
	FaSolidComments,
	FaSolidDatabase,
	FaSolidTriangleExclamation,
	FaSolidUserCheck,
} from "solid-icons/fa";
import { type Component, For, Index, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import DashboardCardItem from "@/components/DashboardCardItem/DashboardCardItem";
import type {
	NeedsYouItem,
	NeedsYouKind,
} from "@/hooks/useNeedsYou/useNeedsYou";
import dateHelpers from "@/utils/date-helpers";

const kinds = {
	failed: { icon: FaSolidTriangleExclamation, class: "text-danger" },
	review: { icon: FaSolidUserCheck, class: "text-info" },
	chat: { icon: FaSolidComments, class: "text-warning" },
	system: { icon: FaSolidDatabase, class: "text-warning" },
} satisfies Record<
	NeedsYouKind,
	{ icon: typeof FaSolidComments; class: string }
>;

/**
 * Rows for the things waiting on the user, from useNeedsYou. The caller owns
 * the heading and what to show when there is nothing to do.
 */
const NeedsYouList: Component<{
	items: NeedsYouItem[];
	loading?: boolean;
	/** Skeleton rows shown while loading. @default 3 */
	placeholders?: number;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<ul class={props.class}>
			<Show
				when={!props.loading}
				fallback={
					<Index each={Array.from({ length: props.placeholders ?? 3 })}>
						{() => (
							<li class="flex flex-col gap-1.5 px-2 py-2">
								<span class="skeleton block h-3.5 w-1/2" />
								<span class="skeleton block h-3 w-3/4" />
							</li>
						)}
					</Index>
				}
			>
				<For each={props.items}>
					{(item) => (
						<li>
							<DashboardCardItem
								href={item.href}
								title={item.title}
								description={item.detail}
								icon={
									<Dynamic
										component={kinds[item.kind].icon}
										size={11}
										class={kinds[item.kind].class}
									/>
								}
								meta={
									item.date ? (
										<time datetime={item.date}>
											{dateHelpers.formatTimestamp(item.date)}
										</time>
									) : undefined
								}
							/>
						</li>
					)}
				</For>
			</Show>
		</ul>
	);
};

export default NeedsYouList;
