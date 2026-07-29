import classNames from "classnames";
import { type Component, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";

export interface NoEntriesBlockProps {
	copy: {
		title?: string;
		description?: string;
		button?: string;
	};
	callbacks?: {
		action?: () => void;
	};
	permissions?: {
		create?: boolean;
	};
	options?: {
		grow?: boolean;
		buttonTheme?: "primary" | "border-outline";
	};
	class?: string;
}

const NoEntriesBlock: Component<NoEntriesBlockProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div
			class={classNames(
				"flex items-center justify-center px-4 py-8 md:px-6 md:py-10",
				props.class,
				{
					grow: props.options?.grow,
				},
			)}
		>
			<div class="text-center flex flex-col items-center">
				<h2 class="mb-1 text-sm font-semibold">
					{props.copy?.title || T()("empty.states.entries.title")}
				</h2>
				<p class="max-w-96 text-sm">
					{props.copy?.description || T()("empty.states.entries.description")}
				</p>
				<Show when={props.callbacks?.action !== undefined}>
					<Button
						theme={props.options?.buttonTheme ?? "primary"}
						size="small"
						classes="mt-4"
						onClick={props.callbacks?.action}
						permission={props.permissions?.create}
					>
						{props.copy?.button || T()("actions.create.entry")}
					</Button>
				</Show>
			</div>
		</div>
	);
};

export default NoEntriesBlock;
