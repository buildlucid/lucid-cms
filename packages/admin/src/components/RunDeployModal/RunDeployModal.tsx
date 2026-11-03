import type { Deploy } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import Alert from "@/components/Alert/Alert";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

/** Confirms running a deploy, and says when it waits behind a run already going. */
const RunDeployModal: Component<{
	deploy: Deploy | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const run = api.deploys.useRun();

	// ----------------------------------------
	// Memos
	const waits = createMemo(() => (props.deploy?.runningRun ?? null) !== null);
	const note = createMemo(() => {
		const deploy = props.deploy;
		if (!deploy) return undefined;
		if (deploy.runningRun) {
			return deploy.queuedRun
				? T()("modals.deploys.run.joins")
				: T()("modals.deploys.run.waits");
		}
		if (deploy.pending) {
			return T()("modals.deploys.run.pending", {
				count: deploy.pending.count,
			});
		}
		return undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={T()("modals.deploys.run.title", { name: props.deploy?.name })}
			description={
				props.deploy?.description ?? T()("modals.deploys.run.description")
			}
			confirmLabel={waits() ? T()("deploys.run.queue") : T()("deploys.run")}
			confirmVariant="primary"
			loading={run.action.isPending}
			error={run.errors()?.message}
			onConfirm={() => {
				const deploy = props.deploy;
				if (!deploy) return;

				run.action.mutate(
					{ key: deploy.key, queued: waits() },
					{ onSuccess: () => props.onOpenChange(false) },
				);
			}}
			onCancel={() => {
				props.onOpenChange(false);
				run.reset();
			}}
		>
			<Show when={note()}>
				{(note) => <Alert variant="info">{note()}</Alert>}
			</Show>
		</Modal.Confirm>
	);
};

export default RunDeployModal;
