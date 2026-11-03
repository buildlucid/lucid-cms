import type { Deploy, DeployRun } from "@types";
import { type Component, createMemo } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import { getDeployRunCancellation } from "@/utils/deploys";

/** Confirms cancelling a run, saying whether the host stops it or Lucid only stops waiting for it. */
const CancelDeployRunModal: Component<{
	run: DeployRun | undefined;
	deploy: Deploy | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const cancelRun = api.deploys.useCancelRun();

	// ----------------------------------------
	// Memos
	const cancellation = createMemo(() =>
		props.run && props.deploy
			? getDeployRunCancellation(props.deploy, props.run)
			: "waiting",
	);
	const copy = createMemo(() => {
		switch (cancellation()) {
			case "queued":
				return {
					title: T()("modals.deploys.cancel.queued.title"),
					description: T()("modals.deploys.cancel.queued.description"),
					confirm: T()("deploys.run.cancel"),
				};
			case "host":
				return {
					title: T()("modals.deploys.cancel.host.title"),
					description: T()("modals.deploys.cancel.host.description"),
					confirm: T()("deploys.run.cancel"),
				};
			case "waiting":
				return {
					title: T()("modals.deploys.cancel.waiting.title"),
					description: T()("modals.deploys.cancel.waiting.description"),
					confirm: T()("deploys.run.stop.waiting"),
				};
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={copy().title}
			description={copy().description}
			confirmLabel={copy().confirm}
			cancelLabel={T()("modals.deploys.cancel.keep")}
			confirmVariant="danger"
			loading={cancelRun.action.isPending}
			error={cancelRun.errors()?.message}
			onConfirm={() => {
				const run = props.run;
				if (!run) return;

				cancelRun.action.mutate(
					{ id: run.id, cancellation: cancellation() },
					{ onSuccess: () => props.onOpenChange(false) },
				);
			}}
			onCancel={() => {
				props.onOpenChange(false);
				cancelRun.reset();
			}}
		/>
	);
};

export default CancelDeployRunModal;
