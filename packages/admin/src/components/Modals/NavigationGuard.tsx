import T from "@/translations";
import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import type { NavigationGuardState } from "@/hooks/document/useNavigationGuard";

interface NavigationGuardProps {
	state: NavigationGuardState;
}

const NavigationGuard: Component<NavigationGuardProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.isOpen(),
				setOpen: (open) => {
					if (!open) props.state.cancel();
				},
			}}
			copy={{
				title: T()("navigation_guard_modal_title"),
				description: T()("navigation_guard_modal_description"),
			}}
			callbacks={{
				onConfirm: () => {
					props.state.proceed();
				},
				onCancel: () => {
					props.state.cancel();
				},
			}}
		/>
	);
};

export default NavigationGuard;
