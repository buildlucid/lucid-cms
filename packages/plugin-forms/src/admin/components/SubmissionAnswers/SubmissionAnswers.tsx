import { Button, Field } from "@lucidcms/admin/components";
import { useDocumentEditor, useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { SlotComponent } from "@lucidcms/admin/types";
import { useMutation } from "@tanstack/solid-query";
import { TbOutlineDownload } from "solid-icons/tb";
import { createMemo, For, Show } from "solid-js";
import { routes } from "../../../constants.js";
import readSubmissionValues from "../../../shared/read-submission-values.js";
import stringifyValue from "../../../shared/stringify-value.js";
import type { SubmissionFile } from "../../../types.js";
import parseFileDownload from "../../utils/parse-file-download.js";
import type submissionAnswersConfig from "./config.js";

/**
 * Lists a submission's answers under the labels their fields had when the form was sent. Files
 * download through the plugin's route, as they are private media outside the library.
 */
const SubmissionAnswers: SlotComponent<
	ReturnType<typeof submissionAnswersConfig>
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const editor = useDocumentEditor();

	// ----------------------------------
	// Memos
	const values = createMemo(() => readSubmissionValues(props.field.value));
	const rows = createMemo(() =>
		(values()?.fields ?? []).map((field) => ({
			label: field.label,
			answer: stringifyValue(values()?.data[field.name]),
			files: (values()?.files ?? []).filter(
				(file) => file.field === field.name,
			),
		})),
	);

	// ----------------------------------
	// Mutations
	const download = useMutation(() => ({
		mutationFn: (file: SubmissionFile) =>
			request({
				url: `${routes.files}/${editor.documentId}/files/${file.mediaId}/download`,
				method: "POST",
				parse: parseFileDownload,
				displayErrorToast: true,
			}),
		onSuccess: (data) => {
			window.location.href = data.url;
		},
	}));

	// ----------------------------------
	// Render
	return (
		<Field.Root field={props.field}>
			<Field.Label />
			<Show
				when={rows().length > 0}
				fallback={
					<p class="text-sm text-muted">{t("plugin.forms.answers.none")}</p>
				}
			>
				<dl class="overflow-hidden rounded-md border border-border">
					<For each={rows()}>
						{(row) => (
							<div class="grid grid-cols-1 gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-3 sm:gap-4">
								<dt class="text-sm font-medium text-subtitle">{row.label}</dt>
								<dd class="min-w-0 whitespace-pre-wrap break-words text-sm text-body sm:col-span-2">
									<Show when={row.files.length === 0}>
										{row.answer || (
											<span class="text-muted">
												{t("plugin.forms.answers.empty")}
											</span>
										)}
									</Show>
									<For each={row.files}>
										{(file) => (
											<Button
												variant="outline"
												size="xs"
												class="mr-2 mb-1"
												loading={
													download.isPending &&
													download.variables?.mediaId === file.mediaId
												}
												onClick={() => download.mutate(file)}
											>
												<TbOutlineDownload size={14} class="mr-1.5" />
												{file.fileName}
											</Button>
										)}
									</For>
								</dd>
							</div>
						)}
					</For>
				</dl>
			</Show>
		</Field.Root>
	);
};

export default SubmissionAnswers;
