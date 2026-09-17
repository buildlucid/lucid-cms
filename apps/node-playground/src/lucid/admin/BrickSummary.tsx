import type { BrickSlotComponent } from "@lucidcms/admin/types";

const BrickSummary: BrickSlotComponent = (props) => (
	<aside
		class="extension-panel my-2 rounded-md bg-background-base p-4 text-body"
		data-testid="admin-brick-before"
	>
		<strong class="text-title">Before fields: {props.brick.key}</strong>
		<p class="mt-1 text-sm text-subtitle">
			Content locale: {props.contentLocale}
		</p>
	</aside>
);

export default BrickSummary;
