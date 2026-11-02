import type { Diagnostics } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import StateNote from "@/components/StateNote/StateNote";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

/** Past this many seconds apart, time-based two-factor codes start to fail. */
const CLOCK_WARNING_SECONDS = 30;

/** The version, role, addresses and server clock. */
const InstallSection: Component<{
	data: Diagnostics;
	/** Seconds the server's clock is ahead of the browser's, negative when behind. */
	clockSkew: number | null;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const clock = createMemo(() => {
		const skew = props.clockSkew;
		//* a few seconds is request latency, not a wrong clock
		if (skew === null || Math.abs(skew) < 5) {
			return T()("diagnostics.server.clock.in.sync");
		}
		const seconds = Math.abs(skew);
		const amount =
			seconds < 120
				? T()("diagnostics.server.clock.seconds", { count: seconds })
				: T()("diagnostics.server.clock.minutes", {
						count: Math.round(seconds / 60),
					});
		return T()(
			skew > 0
				? "diagnostics.server.clock.ahead"
				: "diagnostics.server.clock.behind",
			{ amount },
		);
	});

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.install.title")}
			description={T()("diagnostics.install.description")}
		>
			<InfoRow.Content>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{
							label: T()("diagnostics.install.version"),
							value: props.data.install.version,
						},
						{
							label: T()("diagnostics.install.role"),
							value: T()(
								props.data.install.role === "content"
									? "diagnostics.install.role.content"
									: "diagnostics.install.role.primary",
							),
						},
						{
							label: T()("diagnostics.install.url"),
							value: props.data.install.url,
							wrap: true,
						},
						{
							label: T()("diagnostics.install.site.url"),
							value: props.data.install.siteUrl ?? "-",
							wrap: true,
						},
						{
							label: T()("diagnostics.install.telemetry"),
							value: props.data.install.telemetry
								? T()("common.on")
								: T()("common.off"),
						},
						{
							label: T()("diagnostics.install.announcements"),
							value: props.data.install.announcements
								? T()("common.on")
								: T()("common.off"),
						},
					]}
				/>
			</InfoRow.Content>
			<InfoRow.Content
				title={T()("diagnostics.server.title")}
				description={T()("diagnostics.server.description")}
			>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{
							label: T()("common.runtime"),
							value:
								[props.data.server.runtime, props.data.server.runtimeVersion]
									.filter(Boolean)
									.join(" ") || "-",
						},
						{
							label: T()("diagnostics.server.time"),
							value: dateHelpers.formatFullDate(props.data.server.time, {
								includeTime: true,
							}),
						},
						{
							label: T()("common.timezone"),
							value: props.data.server.timezone,
						},
						{
							label: T()("diagnostics.server.clock"),
							value: clock(),
						},
					]}
				/>
				<Show
					when={
						props.clockSkew !== null &&
						Math.abs(props.clockSkew) >= CLOCK_WARNING_SECONDS
					}
				>
					<StateNote variant="danger" class="mt-4">
						{T()("diagnostics.server.clock.warning")}
					</StateNote>
				</Show>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default InstallSection;
