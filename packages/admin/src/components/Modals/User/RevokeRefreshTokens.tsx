import type { Accessor, Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";

interface RevokeRefreshTokensProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RevokeRefreshTokens: Component<RevokeRefreshTokensProps> = (props) => {
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
		<Confirmation
			theme="danger"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: revokeRefreshTokens.action.isPending,
				isError: revokeRefreshTokens.action.isError,
			}}
			copy={{
				title: T()("user_revoke_sessions_modal_title"),
				description: T()("user_revoke_sessions_modal_description"),
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

export default RevokeRefreshTokens;
