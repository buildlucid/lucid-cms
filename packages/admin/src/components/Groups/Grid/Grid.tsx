import classNames from "classnames";
import {
	type Component,
	createMemo,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import SkeletonCard from "@/components/Cards/SkeletonCard";
import NoEntriesBlock, {
	type NoEntriesBlockProps,
} from "@/components/Partials/NoEntriesBlock";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";

export const Grid: Component<{
	state?: {
		isLoading?: boolean;
		totalItems: number;
		searchParams?: ReturnType<typeof useSearchParamsLocation>;
	};
	slots?: {
		loadingCard?: JSXElement;
		topRow?: JSXElement;
	};
	copy?: {
		empty?: NoEntriesBlockProps["copy"];
	};
	callback?: {
		createEntry?: () => void;
	};
	options?: {
		disableEmpty?: boolean;
		growWhenEmpty?: boolean;
	};
	children: JSXElement;
	class?: string;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isEmpty = createMemo(() => {
		if (props.options?.disableEmpty) {
			return false;
		}
		return (
			props.state?.isLoading === false && (props.state?.totalItems ?? 0) === 0
		);
	});

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames(props.class, {
				"flex-1 flex items-center justify-center":
					isEmpty() && props.options?.growWhenEmpty,
			})}
		>
			<Switch>
				<Match when={isEmpty()}>
					<NoEntriesBlock
						copy={{
							title: props.copy?.empty?.title,
							description: props.copy?.empty?.description,
							button: props.copy?.empty?.button,
						}}
						callbacks={{
							action: props.callback?.createEntry,
						}}
					/>
				</Match>
				<Match when={!isEmpty()}>
					<Show when={props.slots?.topRow}>{props.slots?.topRow}</Show>
					<ul
						class={classNames(
							"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4",
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
						</Switch>
					</ul>
				</Match>
			</Switch>
		</div>
	);
};
