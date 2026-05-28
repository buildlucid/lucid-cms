import type { Component } from "solid-js";
import { Alert } from "@/components/Groups/Modal";
import CopyInput from "@/components/Partials/CopyInput";
import T from "@/translations";

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
				title: T()("modals.common.copy.api.key.title"),
				description: T()("modals.common.copy.api.key.description"),
			}}
		>
			<CopyInput value={props.apiKey || ""} />
		</Alert>
	);
};

export default CopyAPIKey;
