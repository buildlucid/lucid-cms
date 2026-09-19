import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DownloadMediaModal: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// --------------------------------
	// Queries & Mutations
	const requestDownload = api.media.useRequestDownload({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// --------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.download.media.title")}
			description={T()("modals.common.download.media.description")}
			confirmLabel={T()("common.download")}
			confirmVariant="primary"
			loading={requestDownload.action.isPending}
			error={requestDownload.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				requestDownload.action.mutate({ id });
			}}
			onCancel={() => {
				props.state.setOpen(false);
				requestDownload.reset();
			}}
		/>
	);
};

export default DownloadMediaModal;
