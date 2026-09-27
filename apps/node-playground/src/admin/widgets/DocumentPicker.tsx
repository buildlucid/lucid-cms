import { Select } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import type { AgentWidgetProps } from "@lucidcms/admin/types";
import {
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
} from "solid-js";
import type { z } from "zod";
import type { documentPickerData } from "../../tools/select-document.js";

const DocumentPicker = (
	props: AgentWidgetProps<undefined, z.infer<typeof documentPickerData>>,
) => {
	// ----------------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const id = createUniqueId();
	const [search, setSearch] = createSignal("");
	const [selected, setSelected] = createSignal<number>();

	// ----------------------------------------
	// Memos
	const active = createMemo(() =>
		props.interaction?.status === "active" ? props.interaction : undefined,
	);
	const options = createMemo(() =>
		props.data.documents
			.filter((document) =>
				document.label.toLowerCase().includes(search().toLowerCase()),
			)
			.map((document) => ({ value: document.id, label: document.label })),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const documentId = selected();
		active()?.setResponse(
			documentId === undefined ? undefined : { documentId },
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Select
			id={id}
			name="document"
			label={t("playground.picker.label")}
			value={selected()}
			onChange={(value) =>
				setSelected(typeof value === "number" ? value : undefined)
			}
			options={options()}
			search={{
				value: search(),
				onChange: setSearch,
				placeholder: t("playground.picker.search"),
			}}
			required
			disabled={!active() || active()?.submitting}
		/>
	);
};

export default DocumentPicker;
