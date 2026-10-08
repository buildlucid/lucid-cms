import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import {
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
import { getTargetLabel } from "@/utils/requests";
import { getRequestRoute } from "@/utils/route-helpers";

type UnpublishMode = "now" | "request";

const DocumentUnpublishModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	collection: Collection | undefined;
	document: { collectionKey: string; documentId: number };
	target: string | undefined;
	onSuccess?: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [mode, setMode] = createSignal<UnpublishMode>("now");
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Queries & Mutations
	const unpublish = api.documents.useUnpublishSingle();
	const request = api.requests.useCreateSingle({
		onSuccess: (response) => {
			props.setOpen(false);
			navigate(getRequestRoute({ requestId: response.data.id }));
		},
	});

	// ----------------------------------------
	// Memos
	const environment = createMemo(() =>
		getTargetLabel(props.collection, props.target ?? ""),
	);
	const modes = createMemo(() => {
		const permissions = props.collection?.permissions;
		if (!permissions || !props.target) return [];

		const canUnpublish =
			props.collection?.publishing.review?.unpublish.includes(props.target) !==
				true && userStore.get.hasPermission([permissions.publish]).all;
		const canRequest =
			userStore.get.hasPermission([Permissions.RequestsRead]).all &&
			userStore.get.hasPermission([
				permissions.update,
				permissions["unpublish-request"],
			]).some;

		return (
			[
				{ value: "now", label: T()("documents.unpublish.now") },
				{ value: "request", label: T()("requests.mode.request") },
			] satisfies Array<{ value: UnpublishMode; label: string }>
		).filter((option) => (option.value === "now" ? canUnpublish : canRequest));
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		untrack(() => {
			setMode(modes()[0]?.value ?? "now");
			setTitle("");
			unpublish.reset();
			request.reset();
		});
	});

	// ----------------------------------------
	// Functions
	const confirm = async () => {
		const target = props.target;
		if (!target) return;

		if (mode() === "request") {
			request.action.mutate({
				body: {
					type: "unpublish",
					title: title().trim(),
					documents: [{ ...props.document, targets: [target] }],
				},
			});
			return;
		}
		await unpublish.action.mutateAsync({
			collectionKey: props.document.collectionKey,
			id: props.document.documentId,
			body: { target },
		});
		props.setOpen(false);
		props.onSuccess?.();
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.setOpen}
			above={
				<Show when={modes().length > 1}>
					<Tabs.Root
						stretch={true}
						value={mode()}
						onChange={(value) => setMode(value as UnpublishMode)}
						items={modes()}
					/>
				</Show>
			}
			title={T()("documents.unpublish.title", {
				environment: environment(),
			})}
			description={
				mode() === "request"
					? T()("documents.unpublish.request.description", {
							environment: environment(),
						})
					: T()("documents.unpublish.now.description", {
							environment: environment(),
						})
			}
			confirmLabel={
				mode() === "request"
					? T()("requests.create")
					: T()("documents.unpublish.action")
			}
			confirmDisabled={mode() === "request" && !title().trim()}
			loading={unpublish.action.isPending || request.action.isPending}
			error={
				mode() === "request"
					? request.errors()?.message
					: unpublish.errors()?.message
			}
			onConfirm={() => void confirm()}
			onCancel={() => props.setOpen(false)}
		>
			<Show when={mode() === "request"}>
				<Input
					id="unpublish-request-title"
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

export default DocumentUnpublishModal;
