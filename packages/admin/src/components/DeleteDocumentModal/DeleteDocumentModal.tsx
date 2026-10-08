import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import Tabs from "@/components/Tabs/Tabs";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRequestRoute } from "@/utils/route-helpers";

type DeleteMode = "now" | "request";

interface DeleteDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	collection: Collection;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteDocumentModal: Component<DeleteDocumentProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [mode, setMode] = createSignal<DeleteMode>("now");
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Memos
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
			}) || T()("common.collection"),
	);
	const modes = createMemo(() => {
		const permissions = props.collection?.permissions;
		if (!permissions) return [];

		const canDelete =
			props.collection.publishing.review?.delete !== true &&
			userStore.get.hasPermission([permissions.delete]).all;
		const canRequest =
			props.collection.mode === "multiple" &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all &&
			userStore.get.hasPermission([
				permissions.delete,
				permissions["delete-request"],
			]).some;

		return (
			[
				{ value: "now", label: T()("documents.delete.now") },
				{ value: "request", label: T()("requests.mode.request") },
			] satisfies Array<{ value: DeleteMode; label: string }>
		).filter((option) => (option.value === "now" ? canDelete : canRequest));
	});
	const documentId = () =>
		typeof props.id === "function" ? props.id() : props.id;

	// ----------------------------------------
	// Mutations
	const deleteDocument = api.documents.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: collectionSingularName,
	});
	const request = api.requests.useCreateSingle({
		onSuccess: (response) => {
			props.state.setOpen(false);
			navigate(getRequestRoute({ requestId: response.data.id }));
		},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		untrack(() => {
			setMode(modes()[0]?.value ?? "now");
			setTitle("");
			deleteDocument.reset();
			request.reset();
		});
	});

	// ----------------------------------------
	// Functions
	const confirm = () => {
		const id = documentId();
		if (!id) return console.error("No id provided");

		if (mode() === "request") {
			request.action.mutate({
				body: {
					type: "delete",
					title: title().trim(),
					documents: [{ collectionKey: props.collection.key, documentId: id }],
				},
			});
			return;
		}
		deleteDocument.action.mutate({
			id: id,
			collectionKey: props.collection.key,
		});
	};

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			above={
				<Show when={modes().length > 1}>
					<Tabs.Root
						stretch={true}
						value={mode()}
						onChange={(value) => setMode(value as DeleteMode)}
						items={modes()}
					/>
				</Show>
			}
			title={
				mode() === "request"
					? T()("documents.delete.request.title", {
							name: collectionSingularName(),
						})
					: T()("modals.common.delete.document.title", {
							name: collectionSingularName(),
						})
			}
			description={
				mode() === "request"
					? T()("documents.delete.request.description")
					: T()("modals.common.delete.document.description", {
							name: collectionSingularName().toLowerCase(),
						})
			}
			confirmLabel={
				mode() === "request" ? T()("requests.create") : T()("common.delete")
			}
			confirmDisabled={mode() === "request" && !title().trim()}
			loading={deleteDocument.action.isPending || request.action.isPending}
			error={
				mode() === "request"
					? request.errors()?.message
					: deleteDocument.errors()?.message
			}
			onConfirm={confirm}
			onCancel={() => {
				props.state.setOpen(false);
				deleteDocument.reset();
				request.reset();
			}}
		>
			<Show when={mode() === "request"}>
				<Input
					id="delete-request-title"
					name="title"
					type="text"
					value={title()}
					onChange={setTitle}
					required={true}
					label={T()("requests.title.label")}
				/>
			</Show>
		</Modal.Confirm>
	);
};

export default DeleteDocumentModal;
