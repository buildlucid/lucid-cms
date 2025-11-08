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

const CreateMediaFolderPanel: Component<{
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

	// -----------------------------
	// Mutations
	const createFolder = api.mediaFolders.useCreateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Queries
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
	});

	// -----------------------------
	// Memos
	const resolveParentFolderId = createMemo(() => {
		const parent = props.state.parentFolderId();
		if (parent === "") return null;
		return typeof parent === "string" ? Number.parseInt(parent, 10) : parent;
	});

	const folderOptions = createMemo(() => {
		const folders = foldersHierarchy.data?.data || [];
		const sorted = folders
			.slice()
			.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0))
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
			setSelectedParentId(resolveParentFolderId());
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
				isLoading: createFolder.action.isPending,
				errors: createFolder.errors(),
			}}
			fetchState={{
				isLoading: foldersHierarchy.isLoading,
				isError: foldersHierarchy.isError,
			}}
			callbacks={{
				onSubmit: () => {
					createFolder.action.mutate({
						title: getTitle(),
						parentFolderId: getSelectedParentId() ?? null,
					});
				},
				reset: () => {
					createFolder.reset();
					setTitle("");
					setSelectedParentId(undefined);
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
					/>
				</>
			)}
		</Panel>
	);
};

export default CreateMediaFolderPanel;
