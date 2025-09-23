import T from "@/translations";
import { type Component, Switch, Match } from "solid-js";
import { FaSolidCopy } from "solid-icons/fa";
import spawnToast from "@/utils/spawn-toast";
import classNames from "classnames";

interface ClickToCopyProps {
	type: "simple";

	text: string;
	value: string;
	class?: string;
}

const ClickToCopy: Component<ClickToCopyProps> = (props) => {
	// ----------------------------------
	// Functions
	const copyToClipboard = (e: Event) => {
		e.stopPropagation();

		navigator.clipboard.writeText(props.value);
		spawnToast({
			title: T()("copy_to_clipboard_toast_title"),
			status: "success",
		});
	};

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.type === "simple"}>
				<button
					type="button"
					onClick={copyToClipboard}
					class={classNames(
						"duration-200 cursor-copy transition-colors flex items-center max-w-full text-title fill-title whitespace-nowrap text-base hover:text-primary-hover hover:fill-primary-hover",
						props.class,
					)}
				>
					<FaSolidCopy class="mr-2" />
					<span class="text-ellipsis overflow-hidden text-sm">
						{props.text}
					</span>
				</button>
			</Match>
		</Switch>
	);
};

export default ClickToCopy;
