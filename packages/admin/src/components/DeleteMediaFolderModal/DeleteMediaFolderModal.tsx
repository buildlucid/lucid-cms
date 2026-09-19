import type { Accessor, Component } from "solid-js";
import { createSignal } from "solid-js";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore/mediaStore";
import T from "@/translations";

interface DeleteMediaFolderProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaFolderModal: Component<DeleteMediaFolderProps> = (props) => {
	// ----------------------------------------
	// State
	const [recursiveMedia, setRecursiveMedia] = createSignal<boolean>(false);

	// ----------------------------------------
	// Mutations
	const deleteMediaFolder = api.media.useDeleteBatch({
		onSuccess: () => {
			props.state.setOpen(false);
			mediaStore.get.reset();
			setRecursiveMedia(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.media.folder.title")}
			description={T()("modals.common.delete.media.folder.description")}
			loading={deleteMediaFolder.action.isPending}
			error={deleteMediaFolder.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No folder id provided");
				deleteMediaFolder.action.mutate({
					body: {
						folderIds: [id],
						mediaIds: [],
						recursiveMedia: recursiveMedia(),
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteMediaFolder.reset();
				setRecursiveMedia(false);
			}}
		>
			<div class="bg-card-base p-4 rounded-md border border-border mb-4 md:mb-6">
				<Checkbox
					id="recursiveMedia"
					value={recursiveMedia()}
					onChange={(value) => {
						setRecursiveMedia(value);
					}}
					name="recursiveMedia"
					copy={{
						label: T()("media.folders.delete.recursive.label"),
						describedBy: T()("media.folders.delete.recursive.description"),
					}}
					noMargin={true}
				/>
			</div>
		</Modal.Confirm>
	);
};

export default DeleteMediaFolderModal;
