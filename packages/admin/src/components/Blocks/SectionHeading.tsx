import { type Component, Switch, Match, type JSXElement } from "solid-js";

interface SectionHeadingProps {
	title: string;
	description?: string;
	headingType?: "h3";
	children?: JSXElement;
}

const SectionHeading: Component<SectionHeadingProps> = (props) => {
	return (
		<div class="flex justify-between mb-15">
			<div class="w-full flex flex-col">
				<Switch fallback={<h2 class="text-lg">{props.title}</h2>}>
					<Match when={props.headingType === "h3"}>
						<h3 class="text-lg">{props.title}</h3>
					</Match>
				</Switch>

				{props.description && <p class="mt-2.5">{props.description}</p>}
			</div>
			<div>{props.children}</div>
		</div>
	);
};

export default SectionHeading;
