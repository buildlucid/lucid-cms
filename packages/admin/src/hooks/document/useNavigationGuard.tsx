import { createSignal, type Accessor } from "solid-js";
import { useBeforeLeave, type BeforeLeaveEventArgs } from "@solidjs/router";

export interface NavigationGuardState {
	isOpen: Accessor<boolean>;
	cancel: () => void;
	proceed: () => void;
}

export function useNavigationGuard(
	shouldBlock: Accessor<boolean>,
): NavigationGuardState {
	const [isOpen, setIsOpen] = createSignal(false);
	const [pendingNavigation, setPendingNavigation] =
		createSignal<BeforeLeaveEventArgs | null>(null);

	useBeforeLeave((e) => {
		if (e.to === "/admin/login") return;
		if (!shouldBlock()) return;
		e.preventDefault();

		setPendingNavigation(e);
		setIsOpen(true);
	});

	const cancel = () => {
		setIsOpen(false);
		setPendingNavigation(null);
	};

	const proceed = () => {
		const navigation = pendingNavigation();
		if (navigation) {
			navigation.retry(true);
		}
		setIsOpen(false);
		setPendingNavigation(null);
	};

	return {
		isOpen,
		cancel,
		proceed,
	};
}

export type UseNavigationGuard = ReturnType<typeof useNavigationGuard>;
