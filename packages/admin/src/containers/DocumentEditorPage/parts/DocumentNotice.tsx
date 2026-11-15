import { type Component, type JSXElement, Show } from "solid-js";
import Alert from "@/components/Alert/Alert";

/** A warning bar across the top of one side of the builder, such as the fields or a comparison, with optional actions. */
const DocumentNotice: Component<{
	children: JSXElement;
	actions?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div role="status">
			<Alert variant="warning" appearance="bar">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
					<p class="min-w-0 flex-1 text-current">{props.children}</p>
					<Show when={props.actions}>
						<div class="flex shrink-0 items-center gap-2">{props.actions}</div>
					</Show>
				</div>
			</Alert>
		</div>
	);
};

export default DocumentNotice;
