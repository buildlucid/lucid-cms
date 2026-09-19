import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface RevokeRefreshTokensProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RevokeRefreshTokensModal: Component<RevokeRefreshTokensProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const revokeRefreshTokens = api.users.useRevokeRefreshTokens({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.users.revoke.sessions.title")}
			description={T()("modals.users.revoke.sessions.description")}
			loading={revokeRefreshTokens.action.isPending}
			error={revokeRefreshTokens.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				revokeRefreshTokens.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				revokeRefreshTokens.reset();
			}}
		/>
	);
};

export default RevokeRefreshTokensModal;
