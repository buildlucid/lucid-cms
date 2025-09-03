import T from "@/translations";
import { type Component, Show } from "solid-js";
import { Alert } from "@/components/Groups/Modal";

interface CopyAPIKeyProps {
	apiKey: string | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onClose?: () => void;
	};
}

const CopyAPIKey: Component<CopyAPIKeyProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Alert
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			copy={{
				title: T()("copy_api_key_modal_title"),
			}}
		>
			<input
				class={
					"focus:outline-hidden px-2.5 text-sm text-title font-medium h-14 rounded-md bg-input-base w-full"
				}
				type={"text"}
				value={props.apiKey || ""}
				disabled={true}
				aria-label={T()("copy_api_key_modal_description")}
			/>
			<p class="mt-4">{T()("copy_api_key_modal_description")}</p>
		</Alert>
	);
};

export default CopyAPIKey;
