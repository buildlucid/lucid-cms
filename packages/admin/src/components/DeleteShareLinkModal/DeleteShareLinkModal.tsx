import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const DeleteShareLinkModal: Component<{
	mediaId: Accessor<number | undefined> | undefined;
	linkId: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteShareLink = api.mediaShareLinks.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.share.link.title")}
			description={T()("modals.common.delete.share.link.description")}
			loading={deleteShareLink.action.isPending}
			error={deleteShareLink.errors()?.message}
			onConfirm={() => {
				const mediaId = props.mediaId?.();
				const linkId = props.linkId();
				if (!mediaId || !linkId) return console.error("No ids provided");
				deleteShareLink.action.mutate({
					mediaId: mediaId,
					linkId: linkId,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteShareLink.reset();
			}}
		/>
	);
};

export default DeleteShareLinkModal;
