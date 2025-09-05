import { type Component, type JSXElement, Switch, Match } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import SkeletonCard from "@/components/Cards/SkeletonCard";
import classNames from "classnames";

export const Grid: Component<{
	state?: {
		isLoading?: boolean;
		totalItems: number;
		searchParams?: ReturnType<typeof useSearchParamsLocation>;
	};
	slots?: {
		loadingCard?: JSXElement;
	};
	children: JSXElement;
	class?: string;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<ul
			class={classNames(
				"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
				props.class,
			)}
		>
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
