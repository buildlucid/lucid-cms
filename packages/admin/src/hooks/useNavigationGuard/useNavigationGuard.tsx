import {
	type BeforeLeaveEventArgs,
	useBeforeLeave,
	useLocation,
} from "@solidjs/router";
import { type Accessor, createSignal } from "solid-js";

export interface NavigationGuardState {
	isOpen: Accessor<boolean>;
	cancel: () => void;
	proceed: () => void;
}

export function useNavigationGuard(
	shouldBlock: Accessor<boolean>,
): NavigationGuardState {
	const location = useLocation();
	const [isOpen, setIsOpen] = createSignal(false);
	const [pendingNavigation, setPendingNavigation] =
		createSignal<BeforeLeaveEventArgs | null>(null);

	useBeforeLeave((e) => {
		if (e.to === "/lucid/login") return;
		if (typeof e.to === "string") {
			const current = new URL(
				`${location.pathname}${location.search}`,
				window.location.origin,
			);
			const next = new URL(e.to, current);
			current.searchParams.delete("compare");
			next.searchParams.delete("compare");
			if (current.href === next.href) return;
		}
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
