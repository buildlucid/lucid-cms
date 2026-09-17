import type { FieldSlotComponent } from "@lucidcms/admin/types";

const MetaTitleLength: FieldSlotComponent = (props) => {
	// ----------------------------------
	// Derived state
	const length = () =>
		typeof props.field.value === "string" ? props.field.value.length : 0;

	// ----------------------------------
	// Render
	return (
		<p
			data-testid="admin-meta-title-length"
			class="mt-2 text-sm"
			classList={{
				"text-seo-good": length() >= 50 && length() <= 60,
				"text-subtitle": length() < 50 || length() > 60,
			}}
			role="status"
		>
			{length()} characters. Example target: 50–60 characters.
		</p>
	);
};

export default MetaTitleLength;
