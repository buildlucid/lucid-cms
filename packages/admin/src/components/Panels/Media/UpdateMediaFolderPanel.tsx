import T from "@/translations";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	createEffect,
} from "solid-js";
import { Panel } from "@/components/Groups/Panel";
import { Input, Select } from "@/components/Groups/Form";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";

const UpdateMediaFolderPanel: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
}> = (props) => {
	// -----------------------------
	// State
	const [getTitle, setTitle] = createSignal<string>("");
	const [getSelectedParentId, setSelectedParentId] = createSignal<
		number | null | undefined
	>(undefined);

	// ----------------------------------------
	// Queries / Mutations
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	const updateFolder = api.mediaFolders.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// -----------------------------
	// Memos
	const folderOptions = createMemo(() => {
		const folders = foldersHierarchy.data?.data || [];
		const currentId = props.id();
		const sorted = folders
			.slice()
			.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
			.filter((f) => f.id !== currentId)
			.map((f) => {
				let label = f.meta?.label ?? f.title;
				if (f.meta?.level && f.meta?.level > 0) label = `| ${label}`;
				return { value: f.id, label: label };
			});

		return [{ value: undefined, label: T()("no_folder") }, ...sorted];
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) {
			const currentId = props.id();
			const folders = foldersHierarchy.data?.data || [];
			const current = folders.find((f) => f.id === currentId);
			if (current) {
				setTitle(current.title);
				setSelectedParentId(current.parentFolderId ?? null);
			}
		}
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
				isLoading: updateFolder.action.isPending,
				errors: updateFolder.errors(),
			}}
			fetchState={{
				isLoading: foldersHierarchy.isLoading,
				isError: foldersHierarchy.isError,
			}}
			callbacks={{
				onSubmit: () => {
					const id = props.id();
					if (!id) return;
					updateFolder.action.mutate({
						id: id,
						body: {
							title: getTitle(),
							parentFolderId: getSelectedParentId() ?? null,
						},
					});
				},
				reset: () => {
					updateFolder.reset();
					setTitle("");
					setSelectedParentId(undefined);
				},
			}}
			copy={{
				title: T()("update_media_folder_panel_title"),
				description: T()("update_media_folder_panel_description"),
				submit: T()("update"),
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
						errors={getBodyError("title", updateFolder.errors)}
					/>
					<Select
						id="parent-folder"
						value={getSelectedParentId() ?? undefined}
						onChange={(val) => {
							const id =
								typeof val === "string"
									? Number.parseInt(val, 10)
									: (val as number | undefined);
							setSelectedParentId(id ?? null);
						}}
						name={"parent-folder"}
						options={folderOptions()}
						copy={{ label: T()("folder") }}
						noClear={true}
						errors={getBodyError("parentFolderId", updateFolder.errors)}
					/>
				</>
			)}
		</Panel>
	);
};

export default UpdateMediaFolderPanel;
