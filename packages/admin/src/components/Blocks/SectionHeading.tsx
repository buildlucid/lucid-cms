import { type Component, Switch, Match, type JSXElement } from "solid-js";

interface SectionHeadingProps {
	title: string;
	description?: string;
	headingType?: "h3";
	children?: JSXElement;
}

const SectionHeading: Component<SectionHeadingProps> = (props) => {
	return (
		<div class="flex justify-between mt-6 mb-4 first:mt-0">
			<div class="w-full flex flex-col">
				<Switch fallback={<h2 class="text-base">{props.title}</h2>}>
					<Match when={props.headingType === "h3"}>
						<h3 class="text-base">{props.title}</h3>
					</Match>
				</Switch>

				{props.description && (
					<p class="mt-1 text-sm text-body max-w-2xl">{props.description}</p>
				)}
			</div>
			<div>{props.children}</div>
		</div>
	);
};

export default SectionHeading;
