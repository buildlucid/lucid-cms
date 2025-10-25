import type { Component } from "solid-js";
import classNames from "classnames";
import { Td } from "@/components/Groups/Table";
import spawnToast from "@/utils/spawn-toast";
import T from "@/translations";
import { FaSolidCopy } from "solid-icons/fa";

interface TextColProps {
	text?: string | number | null;
	value: string;
	options?: {
		include?: boolean;
		maxLines?: number;
		padding?: "16" | "24";
	};
}

const TextCol: Component<TextColProps> = (props) => {
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
		<Td
			options={{
				include: props?.options?.include,
				padding: props?.options?.padding,
			}}
		>
			<button
				type="button"
				onClick={copyToClipboard}
				class="flex items-center gap-2 ring-offset-4 ring-offset-card-base rounded-sm line-clamp-1"
			>
				<FaSolidCopy />
				<span class="text-sm">{props.text || "-"}</span>
			</button>
		</Td>
	);
};

export default TextCol;
