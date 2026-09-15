import type { Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import T from "@/translations";

interface ClearCacheProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearCacheModal: Component<ClearCacheProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const clearCache = api.settings.useClearKV({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: clearCache.action.isPending,
				isError: clearCache.action.isError,
			}}
			copy={{
				title: T()("modals.system.cache.title"),
				description: T()("modals.system.cache.description"),
				error: clearCache.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					clearCache.action.mutate({});
				},
				onCancel: () => {
					props.state.setOpen(false);
					clearCache.reset();
				},
			}}
		/>
	);
};

export default ClearCacheModal;
