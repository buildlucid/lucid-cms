import type { Accessor, Component } from "solid-js";
import { createSignal } from "solid-js";
import { CheckboxInput } from "@/components/Groups/Form/Checkbox";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import T from "@/translations";

interface DeleteMediaFolderProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteMediaFolder: Component<DeleteMediaFolderProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteMediaFolder.action.isPending,
				isError: deleteMediaFolder.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.media.folder.title"),
				description: T()("modals.common.delete.media.folder.description"),
				error: deleteMediaFolder.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No folder id provided");
					deleteMediaFolder.action.mutate({
						body: {
							folderIds: [id],
							mediaIds: [],
							recursiveMedia: recursiveMedia(),
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteMediaFolder.reset();
					setRecursiveMedia(false);
				},
			}}
		>
			<div class="bg-card-base p-4 rounded-md border border-border mb-4 md:mb-6">
				<CheckboxInput
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
		</Confirmation>
	);
};

export default DeleteMediaFolder;
