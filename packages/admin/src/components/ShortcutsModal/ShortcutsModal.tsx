import { createHotkey, formatForDisplay } from "@tanstack/solid-hotkeys";
import { type Component, createSignal, For } from "solid-js";
import Modal from "@/components/Modal/Modal";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import T, { type TranslationKeys } from "@/translations";
import { type ShortcutGroup, shortcuts } from "@/utils/shortcuts";

const groups = [
	{ key: "general", label: "shortcuts.group.general" },
	{ key: "builder", label: "shortcuts.group.builder" },
	{ key: "agent", label: "shortcuts.group.agent" },
] as const satisfies ReadonlyArray<{
	key: ShortcutGroup;
	label: TranslationKeys;
}>;

const [open, setOpen] = createSignal(false);

/** Opens the shortcuts modal, such as from the account menu. */
export const openShortcutsModal = () => setOpen(true);

/** Lists every keyboard shortcut by group, opened with `?` from anywhere in the admin. */
const ShortcutsModal: Component = () => {
	// ----------------------------------------
	// Functions
	const groupShortcuts = (group: ShortcutGroup) =>
		Object.values(shortcuts).filter((shortcut) => shortcut.group === group);

	// ----------------------------------------
	// Effects
	createHotkey(shortcuts.showShortcuts.hotkey, () => setOpen(!open()));

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={open()} onOpenChange={setOpen}>
			<Modal.Header>
				<Modal.Title>{T()("shortcuts.title")}</Modal.Title>
				<Modal.Description>{T()("shortcuts.description")}</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<div class="flex flex-col gap-6">
					<For each={groups}>
						{(group) => (
							<section>
								<SectionHeading level={3} title={T()(group.label)} />
								<dl class="divide-y divide-border rounded-md border border-border bg-card">
									<For each={groupShortcuts(group.key)}>
										{(shortcut) => (
											<div class="flex items-center justify-between gap-4 px-3 py-2.5">
												<dt class="text-sm text-body">{T()(shortcut.label)}</dt>
												<dd class="flex shrink-0 items-center gap-1">
													<For
														each={formatForDisplay(shortcut.hotkey, {
															parts: true,
														})}
													>
														{(key) => (
															<kbd class="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border border-b-2 bg-background px-1.5 font-sans text-xs font-medium text-title">
																{key}
															</kbd>
														)}
													</For>
												</dd>
											</div>
										)}
									</For>
								</dl>
							</section>
						)}
					</For>
				</div>
			</Modal.Body>
		</Modal.Root>
	);
};

export default ShortcutsModal;
