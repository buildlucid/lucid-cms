import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
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
		<ConfirmationModal
			theme="danger"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: revokeRefreshTokens.action.isPending,
				isError: revokeRefreshTokens.action.isError,
			}}
			copy={{
				title: T()("modals.users.revoke.sessions.title"),
				description: T()("modals.users.revoke.sessions.description"),
				error: revokeRefreshTokens.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					revokeRefreshTokens.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					revokeRefreshTokens.reset();
				},
			}}
		/>
	);
};

export default RevokeRefreshTokensModal;
