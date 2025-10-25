import T from "@/translations";
import { createSignal, type Component } from "solid-js";
import { FaSolidCopy } from "solid-icons/fa";
import spawnToast from "@/utils/spawn-toast";
import classNames from "classnames";

interface CopyInputProps {
	value: string;
	label?: string;
}

const CopyInput: Component<CopyInputProps> = (props) => {
	// ------------------------------
	// State
	const [isCopied, setIsCopied] = createSignal(false);

	// ----------------------------------
	// Functions
	const copyToClipboard = () => {
		navigator.clipboard.writeText(props.value);
		spawnToast({
			title: T()("copy_to_clipboard_toast_title"),
			status: "success",
		});
		setIsCopied(true);
		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
	};

	// ----------------------------------
	// Render
	return (
		<div class="relative flex items-stretch w-full rounded-md overflow-hidden border border-border bg-input-base">
			<input
				class="flex-1 h-12 pr-2.5 pl-10 text-base text-title font-medium bg-transparent focus:outline-hidden"
				type="text"
				value={props.value}
				disabled={true}
				aria-label={props.label}
			/>
			<button
				type="button"
				onClick={copyToClipboard}
				class={classNames(
					"absolute left-2.5 w-6 h-6 top-1/2 -translate-y-1/2 flex items-center justify-center bg-container-4 hover:bg-container-5 transition-colors duration-200 text-body hover:text-title cursor-pointer focus:ring-0 focus-visible:ring-1 rounded-md",
					{
						"text-primary-base hover:!text-primary-hover": isCopied(),
					},
				)}
				aria-label={T()("copy_to_clipboard")}
			>
				<FaSolidCopy class="fill-current" />
			</button>
		</div>
	);
};

export default CopyInput;
