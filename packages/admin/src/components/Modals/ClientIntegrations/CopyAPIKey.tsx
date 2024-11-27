import T from "@/translations";
import { type Component, Show } from "solid-js";
import Modal from "@/components/Groups/Modal";
import Form from "@/components/Groups/Form";

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
		<Modal.Alert
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
					"focus:outline-hidden px-2.5 text-sm text-title font-medium h-14 rounded-md bg-container-4 w-full"
				}
				type={"text"}
				value={props.apiKey || ""}
				disabled={true}
				aria-label={T()("copy_api_key_modal_description")}
			/>
			<p class="mt-15">{T()("copy_api_key_modal_description")}</p>
		</Modal.Alert>
	);
};

export default CopyAPIKey;
