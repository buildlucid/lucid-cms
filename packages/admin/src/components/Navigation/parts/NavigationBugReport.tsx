import { TbOutlineBug } from "solid-icons/tb";
import { type Component, createMemo, createSignal } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import lazyPage from "@/utils/lazy-page";

const BugReportModal = lazyPage(
	() => import("@/components/BugReportModal/BugReportModal"),
);

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
			<Tooltip
				type="button"
				class="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-hover hover:text-title focus-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted"
				disabled={!connected()}
				aria-label={label()}
				content={label()}
				onClick={() => setOpen(true)}
			>
				<TbOutlineBug class="size-3.5" />
			</Tooltip>
			<BugReportModal open={open()} onOpenChange={setOpen} />
		</>
	);
};
