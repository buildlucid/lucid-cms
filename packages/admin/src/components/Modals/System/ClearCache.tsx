import T from "@/translations";
import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface ClearCacheProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ClearCache: Component<ClearCacheProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: clearCache.action.isPending,
				isError: clearCache.action.isError,
			}}
			copy={{
				title: T()("clear_cache_modal_title"),
				description: T()("clear_cache_modal_description"),
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

export default ClearCache;
