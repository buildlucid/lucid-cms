import T from "@/translations";
import { type Component, type Accessor, createMemo } from "solid-js";
import { Alert } from "@/components/Groups/Modal";
import CopyInput from "@/components/Partials/CopyInput";
import api from "@/services/api";

const CopyShareLinkURL: Component<{
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
		<Alert
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			copy={{
				title: T()("copy_share_link_url_modal_title"),
				description: T()("copy_share_link_url_modal_description"),
			}}
		>
			<CopyInput
				value={url() || ""}
				label={T()("copy_share_link_url_modal_description")}
			/>
		</Alert>
	);
};

export default CopyShareLinkURL;
