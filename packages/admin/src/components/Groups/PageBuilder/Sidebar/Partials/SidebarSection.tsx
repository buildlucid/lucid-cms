import { Collapsible } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidChevronRight } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";

const getStoredOpen = (storageKey: string) => {
	try {
		const stored = localStorage.getItem(storageKey);
		if (stored === null) return true;
		return stored === "true";
	} catch {
		return true;
	}
};

const SidebarSection: Component<{
	title: string;
	icon: JSXElement;
	storageKey: string;
	meta?: string | number;
	children: JSXElement;
}> = (props) => {
	// ----------------------------------
	// State
	const [open, setOpen] = createSignal(getStoredOpen(props.storageKey));

	// ----------------------------------
	// Effects
	createEffect(() => {
		try {
			localStorage.setItem(props.storageKey, String(open()));
		} catch {
			// Ignore unavailable storage; the section still works for this session.
		}
	});

	// ----------------------------------
	// Render
	return (
		<Collapsible.Root open={open()} onOpenChange={setOpen}>
			<section>
				<Collapsible.Trigger class="group flex w-full items-center gap-2 rounded-md text-left focus:outline-hidden focus-visible:ring-1 ring-primary-base">
					<span class="flex size-5 shrink-0 items-center justify-center text-body">
						{props.icon}
					</span>
					<h3 class="min-w-0 flex-1 truncate text-base font-medium text-title">
						{props.title}
					</h3>
					<Show when={props.meta !== undefined}>
						<span class="text-xs font-medium text-body">{props.meta}</span>
					</Show>
					<FaSolidChevronRight
						size={12}
						class={classNames(
							"shrink-0 text-body transition-transform duration-200",
							{
								"rotate-90": open(),
							},
						)}
					/>
				</Collapsible.Trigger>
				<Collapsible.Content class="mt-3">{props.children}</Collapsible.Content>
			</section>
		</Collapsible.Root>
	);
};

export default SidebarSection;
