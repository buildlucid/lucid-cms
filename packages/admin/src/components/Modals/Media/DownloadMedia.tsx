import type { Accessor, Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";

const DownloadMedia: Component<{
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
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: requestDownload.action.isPending,
				isError: requestDownload.action.isError,
			}}
			copy={{
				title: T()("modals.common.download.media.title"),
				description: T()("modals.common.download.media.description"),
				confirm: T()("common.download"),
				error: requestDownload.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					requestDownload.action.mutate({ id });
				},
				onCancel: () => {
					props.state.setOpen(false);
					requestDownload.reset();
				},
			}}
		/>
	);
};

export default DownloadMedia;
