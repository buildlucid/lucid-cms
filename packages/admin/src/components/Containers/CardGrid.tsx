import { type Component, type JSXElement, For, Switch, Match } from "solid-js";
import classNames from "classnames";
import SkeletonCard from "@/components/Cards/SkeletonCard";

interface CardGridProps {
	columns: number;
	state?: {
		isLoading?: boolean;
		isError?: boolean;
	};
	children: JSXElement;
}

const CardGrid: Component<CardGridProps> = (props) => {
	return (
		<ul
			class={classNames("grid gap-4 mb-4 last-of-type:mb-0", {
				"md:grid-cols-2": props.columns === 2,
				"md:grid-cols-2 lg:grid-cols-3": props.columns === 3,
				"grid-cols-2 md:grid-cols-3 lg:grid-cols-4": props.columns === 4,
			})}
		>
			<Switch>
				<Match when={props.state?.isLoading}>
					<For each={[...Array(props.columns)]}>
						{() => <SkeletonCard size="small" />}
					</For>
				</Match>
				<Match when={!props.state?.isLoading}>{props.children}</Match>
			</Switch>
		</ul>
	);
};

export default CardGrid;
