import { type Component, Switch, Match } from "solid-js";

interface SkeletonCardProps {
	size: "small" | "medium";
}

const SkeletonCard: Component<SkeletonCardProps> = (props) => {
	return (
		<li class={"bg-background-base p-4 border-border border rounded-md"}>
			<Switch>
				<Match when={props.size === "small"}>
					<span class="skeleton block h-3 w-1/4 mb-1" />
					<span class="skeleton block h-3 w-2/4 mb-2.5" />
					<span class="skeleton block h-7 w-full" />
				</Match>
				<Match when={props.size === "medium"}>
					<span class="skeleton block h-5 w-1/2 mb-1" />
					<span class="skeleton block h-5 w-full mb-2.5" />
					<span class="skeleton block h-32 w-full" />
				</Match>
			</Switch>
		</li>
	);
};

export default SkeletonCard;
