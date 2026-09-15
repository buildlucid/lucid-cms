import { type Accessor, type Component, createMemo } from "solid-js";
import { AlertModal } from "@/components/AlertModal/AlertModal";
import CopyInput from "@/components/CopyInput/CopyInput";
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
		<AlertModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			copy={{
				title: T()("modals.common.copy.share.link.url.title"),
				description: T()("modals.common.copy.share.link.url.description"),
			}}
		>
			<CopyInput value={url() || ""} />
		</AlertModal>
	);
};

export default CopyShareLinkURLModal;
