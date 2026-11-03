import type { Deploy } from "@types";
import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

/** Confirms turning a deploy on or off. */
const SetDeployStateModal: Component<{
	deploy: Deploy | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const setState = api.deploys.useSetState();

	// ----------------------------------------
	// Memos
	const turningOff = () => props.deploy?.enabled !== false;

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={
				turningOff()
					? T()("modals.deploys.disable.title", { name: props.deploy?.name })
					: T()("modals.deploys.enable.title", { name: props.deploy?.name })
			}
			description={
				turningOff()
					? T()("modals.deploys.disable.description")
					: T()("modals.deploys.enable.description")
			}
			confirmLabel={
				turningOff()
					? T()("modals.deploys.disable.confirm")
					: T()("modals.deploys.enable.confirm")
			}
			confirmVariant={turningOff() ? "danger" : "primary"}
			loading={setState.action.isPending}
			error={setState.errors()?.message}
			onConfirm={() => {
				const deploy = props.deploy;
				if (!deploy) return;

				setState.action.mutate(
					{ key: deploy.key, enabled: !deploy.enabled },
					{ onSuccess: () => props.onOpenChange(false) },
				);
			}}
			onCancel={() => {
				props.onOpenChange(false);
				setState.reset();
			}}
		/>
	);
};

export default SetDeployStateModal;
