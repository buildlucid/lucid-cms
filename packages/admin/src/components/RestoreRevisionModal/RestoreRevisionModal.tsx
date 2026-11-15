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
import T from "@/translations";
import { getChangeModes, type LatestAccess } from "@/utils/requests";

type RestoreMode = ReturnType<typeof getChangeModes>[number];

/**
 * Restores a revision to latest, or proposes it in a new update request. People who can only
 * propose changes, and collections that review updates, get the request tab alone.
 */
const RestoreRevisionModal: Component<{
	versionId: Accessor<number | null>;
	latestAccess: LatestAccess;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	loading?: boolean;
	error?: string;
	callbacks: {
		onConfirm: (
			versionId: number,
			request?: { title: string },
		) => void | Promise<void>;
		onCancel: () => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [mode, setMode] = createSignal<RestoreMode>("now");
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Memos
	const proposing = createMemo(() => mode() === "request");
	const modes = createMemo(() =>
		getChangeModes(props.latestAccess).map((value) => ({
			value,
			label:
				value === "now"
					? T()("modals.common.restore.revision.now")
					: T()("requests.mode.request"),
		})),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		untrack(() => {
			setMode(modes()[0]?.value ?? "now");
			setTitle(
				T()("modals.common.restore.revision.request.default", {
					id: props.versionId() ?? "",
				}),
			);
		});
	});

	// ----------------------------------------
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
						onChange={(value) => setMode(value as RestoreMode)}
						items={modes()}
					/>
				</Show>
			}
			title={T()("modals.common.restore.revision.title")}
			description={
				proposing()
					? T()("modals.common.restore.revision.request.description", {
							id: props.versionId() ?? "",
						})
					: T()("modals.common.restore.revision.description", {
							id: props.versionId() ?? "",
						})
			}
			confirmVariant="primary"
			confirmLabel={proposing() ? T()("documents.propose.submit") : undefined}
			confirmDisabled={proposing() && !title().trim()}
			loading={props.loading}
			error={props.error}
			onConfirm={async () => {
				const versionId = props.versionId();
				if (versionId === null) return console.error("No versionId provided");
				await props.callbacks.onConfirm(
					versionId,
					proposing() ? { title: title().trim() } : undefined,
				);
			}}
			onCancel={props.callbacks.onCancel}
		>
			<Show when={proposing()}>
				<Input
					id="restore-request-title"
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

export default RestoreRevisionModal;
