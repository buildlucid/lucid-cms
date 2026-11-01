import { type Accessor, type Component, createMemo } from "solid-js";
import ShareLinkModal from "@/components/ShareLinkModal/ShareLinkModal";
import api from "@/services/api";

/** Loads a media share link by ID and shows it in the share link modal. */
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
	// Render
	return (
		<ShareLinkModal
			url={shareLink.data?.data.url}
			token={shareLink.data?.data.token}
			title={shareLink.data?.data.name ?? undefined}
			state={props.state}
		/>
	);
};

export default CopyShareLinkURLModal;
