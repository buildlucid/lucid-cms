import { Button, DocumentSidebarSection } from "@lucidcms/admin/components";
import { useDocumentEditor, useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { SlotComponent } from "@lucidcms/admin/types";
import { useMutation } from "@tanstack/solid-query";
import { TbOutlineTableExport } from "solid-icons/tb";
import { createMemo, Show } from "solid-js";
import { routes } from "../../../constants.js";
import parseExport from "../../utils/parse-export.js";
import type exportSubmissionsConfig from "./config.js";

/**
 * Downloads every stored submission of the open document's form as a CSV file. Shows once the
 * document says which form that is.
 */
const ExportSubmissions: SlotComponent<
	ReturnType<typeof exportSubmissionsConfig>
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const editor = useDocumentEditor();

	// ----------------------------------
	// Memos
	const form = createMemo(() => {
		const value = editor.fields.get(props.options.field, "text")?.value;
		return typeof value === "string" ? value.trim() : "";
	});

	// ----------------------------------
	// Mutations
	const exportCsv = useMutation(() => ({
		mutationFn: () =>
			request({
				url: `${routes.export}?form=${encodeURIComponent(form())}`,
				parse: parseExport,
				displayErrorToast: true,
			}),
		onSuccess: (data) => {
			//* the byte order mark makes spreadsheets read the file as UTF-8
			const url = URL.createObjectURL(
				new Blob([`﻿${data.csv}`], { type: "text/csv;charset=utf-8" }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = data.fileName;
			link.click();
			//* some browsers cancel the download if the URL goes before it starts
			window.setTimeout(() => URL.revokeObjectURL(url));
		},
	}));

	// ----------------------------------
	// Render
	return (
		<Show when={editor.documentId !== undefined && form() !== ""}>
			<DocumentSidebarSection
				title={t("plugin.forms.export.title")}
				icon={<TbOutlineTableExport size={12} />}
				preferenceKey={props.preferenceKey}
			>
				<p class="mb-3 text-xs text-muted">
					{t("plugin.forms.export.description")}
				</p>
				<Button
					variant="outline"
					size="sm"
					loading={exportCsv.isPending}
					onClick={() => exportCsv.mutate()}
				>
					{t("plugin.forms.export.action")}
				</Button>
			</DocumentSidebarSection>
		</Show>
	);
};

export default ExportSubmissions;
