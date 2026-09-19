import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import T from "@/translations";

const RestoreRevisionModal: Component<{
	versionId: Accessor<number | null>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (versionId: number) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.restore.revision.title")}
			description={T()("modals.common.restore.revision.description", {
				id: props.versionId() ?? "",
			})}
			confirmVariant="primary"
			loading={props.loading}
			error={props.error}
			onConfirm={async () => {
				const versionId = props.versionId();
				if (versionId === null) return console.error("No versionId provided");
				await props.callbacks.onConfirm(versionId);
			}}
			onCancel={props.callbacks.onCancel}
		/>
	);
};

export default RestoreRevisionModal;
