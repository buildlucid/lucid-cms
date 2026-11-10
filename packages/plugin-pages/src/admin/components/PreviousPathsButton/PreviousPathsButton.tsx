import { useTranslation } from "@lucidcms/admin/hooks";
import { TbOutlineHistory } from "solid-icons/tb";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import usePreviousPaths from "../../hooks/use-previous-paths.js";
import type {} from "../../translations.js";
import PreviousPathsDrawer from "../PreviousPathsDrawer/PreviousPathsDrawer.jsx";

/**
 * A history icon and count beside the path that opens the page's previous paths. It shows as soon as
 * the page is saved, with a placeholder count while loading, so the field doesn't shift.
 */
const PreviousPathsButton: Component = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const previous = usePreviousPaths();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const count = createMemo(() => previous.paths.data?.length);
	const label = createMemo(() => {
		const total = count();
		return total === undefined
			? t("plugin.pages.previous.paths.title")
			: t("plugin.pages.previous.paths.open", { count: total });
	});

	// ----------------------------------
	// Render
	return (
		<Show when={previous.saved()}>
			{/* as tall as the path line; `before` widens the touch target */}
			<button
				type="button"
				class="relative ms-auto flex h-5 shrink-0 items-center gap-1 rounded-md px-0.5 text-xs text-muted transition-colors duration-200 hover:text-subtitle focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary before:absolute before:-inset-1 before:rounded-md before:content-['']"
				aria-label={label()}
				aria-busy={previous.paths.isLoading ? "true" : undefined}
				title={label()}
				onClick={() => setOpen(true)}
			>
				<TbOutlineHistory size={14} aria-hidden="true" />
				<Show
					when={count() !== undefined}
					fallback={
						<Show when={previous.paths.isLoading}>
							<span
								class="skeleton inline-block h-3 w-1.5 rounded-sm"
								aria-hidden="true"
							/>
						</Show>
					}
				>
					{count()}
				</Show>
			</button>
			<PreviousPathsDrawer open={open()} onOpenChange={setOpen} />
		</Show>
	);
};

export default PreviousPathsButton;
