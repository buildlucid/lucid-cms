import { TbOutlineBug } from "solid-icons/tb";
import { type Component, createMemo, createSignal } from "solid-js";
import BugReportModal from "@/components/BugReportModal/BugReportModal";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";

/** Opens bug reporting from navigation. Requires a Lucid connection. */
export const NavigationBugReport: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const connected = createMemo(
		() => siteStore.get.connection?.status === "connected",
	);
	const label = createMemo(() =>
		T()(connected() ? "bug.report.open" : "bug.report.unavailable"),
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<button
				type="button"
				class="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
				disabled={!connected()}
				aria-label={label()}
				title={label()}
				onClick={() => setOpen(true)}
			>
				<TbOutlineBug class="size-3.5" />
			</button>
			<BugReportModal open={open()} onOpenChange={setOpen} />
		</>
	);
};
