import type { Component } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import Link from "@/components/Link/Link";
import RowIcon from "@/components/RowIcon/RowIcon";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import T from "@/translations";

/** A settings card saying AI features need a Lucid connection, linking to where it's managed. */
const AiConnectionNotice: Component<{
	/** What still works without the connection, and what doesn't. */
	description: string;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<InfoRow.Content padding="none">
			<div class="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
				<div class="flex min-w-0 items-center gap-4">
					<RowIcon>
						<ThemeLogoIcon class="size-4.5" alt="" />
					</RowIcon>
					<div class="min-w-0">
						<h3 class="flex items-center gap-2 text-sm font-medium">
							<StatusIndicator variant="neutral-subtle" />
							{T()("ai.connection.warning.title")}
						</h3>
						<p class="mt-0.5 text-sm">{props.description}</p>
					</div>
				</div>
				<Link
					href="/admin/system/operations"
					variant="outline"
					size="sm"
					class="self-start md:self-auto"
				>
					{T()("ai.connection.manage.action")}
				</Link>
			</div>
		</InfoRow.Content>
	);
};

export default AiConnectionNotice;
