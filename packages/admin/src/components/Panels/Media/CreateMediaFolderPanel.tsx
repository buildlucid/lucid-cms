import T from "@/translations";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
} from "solid-js";
import { Panel } from "@/components/Groups/Panel";
import { Input } from "@/components/Groups/Form";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";

const CreateMediaFolderPanel: Component<{
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string>;
	};
}> = (props) => {
	// -----------------------------
	// State
	const [getTitle, setTitle] = createSignal<string>("");

	// -----------------------------
	// Mutations
	const createFolder = api.mediaFolders.useCreateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// -----------------------------
	// Memos
	const resolveParentFolderId = createMemo(() => {
		const parent = props.state.parentFolderId();
		if (parent === "") return null;
		return typeof parent === "string" ? Number.parseInt(parent, 10) : parent;
	});

	// -----------------------------
	// Render
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			mutateState={{
				isLoading: createFolder.action.isPending,
				errors: createFolder.errors(),
			}}
			callbacks={{
				onSubmit: () => {
					createFolder.action.mutate({
						title: getTitle(),
						parentFolderId: resolveParentFolderId(),
					});
				},
				reset: () => {
					createFolder.reset();
					setTitle("");
				},
			}}
			copy={{
				title: T()("create_media_folder_panel_title"),
				description: T()("create_media_folder_panel_description"),
				submit: T()("create"),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<Input
						id="title"
						value={getTitle()}
						onChange={setTitle}
						name={"title"}
						type="text"
						required={true}
						copy={{
							label: T()("title"),
						}}
						errors={getBodyError("title", createFolder.errors)}
						theme="full"
					/>
				</>
			)}
		</Panel>
	);
};

export default CreateMediaFolderPanel;
