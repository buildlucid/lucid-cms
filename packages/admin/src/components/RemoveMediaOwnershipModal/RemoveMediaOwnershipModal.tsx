import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import MediaLinkAccess from "@/components/MediaLinkAccess/MediaLinkAccess";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import T from "@/translations";

const RemoveMediaOwnershipModal: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [getPublic, setPublic] = createSignal(false);
	const [getFolderId, setFolderId] = createSignal<number | null>(null);

	// ----------------------------------------
	// Queries & Mutations
	const foldersHierarchy = api.mediaFolders.useGetHierarchy({
		queryParams: {},
		enabled: () => props.state.open,
	});
	const removeOwnership = api.media.useRemoveOwnership({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
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

		return [{ value: undefined, label: T()("media.folders.none") }, ...sorted];
	});

	// ----------------------------------------
	// Functions
	const onConfirm = () => {
		const id = props.id();
		if (id === undefined) return;

		removeOwnership.action.mutate({
			id,
			body: { public: getPublic(), folderId: getFolderId() },
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setPublic(false);
		setFolderId(null);
		removeOwnership.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.media.ownership.remove.title")}
			description={T()("modals.media.ownership.remove.description")}
			confirmLabel={T()("media.ownership.remove.action")}
			confirmVariant="danger"
			loading={removeOwnership.action.isPending}
			error={removeOwnership.errors()?.message}
			onConfirm={onConfirm}
		>
			<div class="flex flex-col gap-3">
				<Select
					id="library-folder"
					value={getFolderId() ?? undefined}
					onChange={(val) => {
						const id =
							typeof val === "string"
								? Number.parseInt(val, 10)
								: (val as number | undefined);
						setFolderId(id ?? null);
					}}
					name="library-folder"
					options={folderOptions()}
					label={T()("common.folder")}
				/>
				<MediaLinkAccess
					id="library-public"
					value={getPublic()}
					onChange={setPublic}
				/>
			</div>
		</Modal.Confirm>
	);
};

export default RemoveMediaOwnershipModal;
