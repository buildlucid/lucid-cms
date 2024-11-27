import { type Component, type JSXElement, Switch, Match } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import SkeletonCard from "@/components/Cards/SkeletonCard";

export const GridRoot: Component<{
	state?: {
		isLoading?: boolean;
		totalItems: number;
		searchParams?: ReturnType<typeof useSearchParamsLocation>;
	};
	slots?: {
		loadingCard?: JSXElement;
	};
	children: JSXElement;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<ul class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-15">
			<Switch fallback={props.children}>
				<Match when={props.state?.isLoading}>
					<Switch>
						<Match when={props.slots?.loadingCard}>
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
							{props.slots?.loadingCard}
						</Match>
						<Match when={!props.slots?.loadingCard}>
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
							<SkeletonCard size="medium" />
						</Match>
					</Switch>
				</Match>
				<Match when={props.state?.isLoading === false}>{props.children}</Match>
			</Switch>
		</ul>
	);
};
