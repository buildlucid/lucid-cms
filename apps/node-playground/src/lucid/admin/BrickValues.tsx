import type { BrickSlotComponent } from "@lucidcms/admin/types";

const BrickValues: BrickSlotComponent = (props) => (
	<aside
		class="my-2 rounded-md border border-border bg-background-base p-4"
		data-testid="admin-brick-after"
	>
		<strong class="text-title">After fields: live read-only values</strong>
		<pre class="mt-2 max-h-60 overflow-auto text-xs text-body">
			{JSON.stringify(
				props.brick.fields.map((field) => ({
					key: field.key,
					type: field.type,
					value: field.value,
					errors: field.errors,
				})),
				null,
				2,
			)}
		</pre>
	</aside>
);

export default BrickValues;
