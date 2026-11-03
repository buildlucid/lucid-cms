import packageJson from "@lucidcms/admin/package.json" with { type: "json" };
import { A } from "@solidjs/router";
import { type Component, createMemo, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";

/** Shows the admin version and, for diagnostics users, an update indicator linking to packages. */
export const NavigationVersion: Component<{
	/** Whether to check for updates, for people who can see diagnostics. */
	checkUpdates: boolean;
	onNavigate?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const updates = api.diagnostics.useGetPackageUpdates({
		queryParams: {},
		enabled: () => props.checkUpdates,
	});

	// ----------------------------------------
	// Memos
	const updateAvailable = createMemo(
		() =>
			props.checkUpdates &&
			(updates.data?.data ?? []).some(
				(update) => update.status === "available",
			),
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={updateAvailable()}
			fallback={
				<small class="py-1 text-[10px] leading-none text-muted">
					v{packageJson.version}
				</small>
			}
		>
			<A
				href="/admin/system/diagnostics"
				title={T()("diagnostics.packages.updates.available")}
				class="inline-flex items-center gap-1.5 rounded-sm py-1 text-[10px] leading-none text-muted transition-colors hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				onClick={() => props.onNavigate?.()}
			>
				<StatusIndicator
					variant="warning"
					size="xs"
					class="text-warning motion-safe:animate-status-pulse"
				/>
				v{packageJson.version}
				<span class="sr-only">
					{T()("diagnostics.packages.updates.available")}
				</span>
			</A>
		</Show>
	);
};
