import T from "@/translations";
import { Show, type Component } from "solid-js";
import Button from "@/components/Partials/Button";
import classNames from "classnames";

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
	};
	class?: string;
}

const NoEntriesBlock: Component<NoEntriesBlockProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div
			class={classNames(
				"flex items-center justify-center p-4 md:p-6",
				props.class,
				{
					"flex-grow": props.options?.grow,
				},
			)}
		>
			<div class="text-center flex flex-col items-center">
				<h2 class="mb-2">{props.copy?.title || T()("no_entries_title")}</h2>
				<p class="max-w-96 text-sm">
					{props.copy?.description || T()("no_entries_description")}
				</p>
				<Show when={props.callbacks?.action !== undefined}>
					<Button
						theme={"primary"}
						size="medium"
						classes="mt-6"
						onClick={props.callbacks?.action}
						permission={props.permissions?.create}
					>
						{props.copy?.button || T()("create_entry")}
					</Button>
				</Show>
			</div>
		</div>
	);
};

export default NoEntriesBlock;
