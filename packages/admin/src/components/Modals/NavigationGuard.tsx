import T from "@/translations";
import { type Component, createSignal, onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import brickStore from "@/store/brickStore";
import { Confirmation } from "@/components/Groups/Modal";

interface NavigationGuardProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
		targetElement?: HTMLLinkElement | null;
		targetCallback?: () => void;
	};
}

const NavigationGuard: Component<NavigationGuardProps> = (props) => {
	// ------------------------------
	// Hooks
	const navigate = useNavigate();

	// ------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			copy={{
				title: T()("navigation_guard_modal_title"),
				description: T()("navigation_guard_modal_description"),
			}}
			callbacks={{
				onConfirm: () => {
					if (props.state.targetElement) {
						const href = props.state.targetElement.getAttribute("href");
						if (href) navigate(href);
					}
					if (props.state.targetCallback) {
						props.state.targetCallback();
						props.state.setOpen(false);
					}
				},
				onCancel: () => {
					props.state.setOpen(false);
				},
			}}
		/>
	);
};

export const navGuardHook = (props?: {
	brickMutateLock?: boolean;
}) => {
	const [getTargetElement, setTargetElement] =
		createSignal<HTMLLinkElement | null>(null);
	const [getTargetCallback, setTargetCallback] = createSignal<() => void>(
		() => {},
	);
	const [getModalOpen, setModalOpen] = createSignal<boolean>(false);

	const clickEvent = (e: MouseEvent) => {
		if (props?.brickMutateLock && brickStore.get.documentMutated === false) {
			return;
		}
		e.preventDefault();
		const target = e.currentTarget as HTMLLinkElement;
		if (target) {
			setTargetElement(target);
			setModalOpen(true);
		}
	};

	onMount(() => {
		const ignoreClasses = ["ql-action", "ql-remove"];

		setTimeout(() => {
			const links = document.querySelectorAll("a");
			for (const link of links) {
				if (link.target === "_blank") continue;
				if (ignoreClasses.includes(link.className)) continue;
				link.addEventListener("click", clickEvent);
			}
		}, 500);
	});

	onCleanup(() => {
		const links = document.querySelectorAll("a");
		for (const link of links) {
			if (link.target === "_blank") continue;
			link.removeEventListener("click", clickEvent);
		}
	});

	return {
		getTargetElement,
		setTargetElement,
		getModalOpen,
		setModalOpen,
		getTargetCallback,
		setTargetCallback,
	};
};

export default NavigationGuard;
