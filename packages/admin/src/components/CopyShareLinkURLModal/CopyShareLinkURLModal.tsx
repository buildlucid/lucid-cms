import { type Accessor, type Component, createMemo } from "solid-js";
import CopyInput from "@/components/CopyInput/CopyInput";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const CopyShareLinkURLModal: Component<{
	ids: Accessor<[number, number] | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onClose?: () => void;
	};
}> = (props) => {
	// ------------------------------
	// Memos
	const mediaId = createMemo(() => props.ids()?.[0]);
	const shareLinkId = createMemo(() => props.ids()?.[1]);

	// ------------------------------
	// Query
	const shareLink = api.mediaShareLinks.useGetSingle({
		queryParams: {
			location: {
				mediaId: mediaId,
				id: shareLinkId,
			},
		},
		key: () => props.state.open,
		enabled: () =>
			props.state.open &&
			mediaId() !== undefined &&
			shareLinkId() !== undefined,
	});

	// ------------------------------
	// Memos
	const url = createMemo(() => shareLink.data?.data.url);

	// ------------------------------
	// Render
	return (
		<Modal.Root
			role="alertdialog"
			open={props.state.open}
			onOpenChange={props.state.setOpen}
		>
			<Modal.Header>
				<Modal.Title>
					{T()("modals.common.copy.share.link.url.title")}
				</Modal.Title>
				<Modal.Description>
					{T()("modals.common.copy.share.link.url.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<CopyInput value={url() || ""} />
			</Modal.Body>
		</Modal.Root>
	);
};

export default CopyShareLinkURLModal;
