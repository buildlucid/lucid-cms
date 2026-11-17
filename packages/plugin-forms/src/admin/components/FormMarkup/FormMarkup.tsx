import { Button, CodeBlock, Modal, Tabs } from "@lucidcms/admin/components";
import { useDocumentEditor, useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { SlotComponent } from "@lucidcms/admin/types";
import { useQuery } from "@tanstack/solid-query";
import { TbOutlineCode } from "solid-icons/tb";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { formFields, routes } from "../../../constants.js";
import formatHtml from "../../utils/format-html.js";
import { drawExample, sendExample } from "../../utils/markup-examples.js";
import parseMarkup from "../../utils/parse-markup.js";
import type formMarkupConfig from "./config.js";

type View = "html" | "draw" | "send";

/**
 * A preview toolbar button that shows the HTML websites get for the open form, as last saved, with
 * examples of drawing it and of sending it from a site's own script.
 */
const FormMarkup: SlotComponent<ReturnType<typeof formMarkupConfig>> = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const editor = useDocumentEditor();
	const [open, setOpen] = createSignal(false);
	const [view, setView] = createSignal<View>("html");

	// ----------------------------------
	// Memos
	const key = createMemo(() => {
		const value = editor.fields.get(formFields.key, "text")?.value;
		return typeof value === "string" ? value.trim() : "";
	});

	// ----------------------------------
	// Queries
	//* the environment being viewed, or the one websites are given by default
	const query = createMemo(() => {
		const params = new URLSearchParams({
			form: key(),
			locale: editor.locale.current,
		});
		if (editor.environment) params.set("version", editor.environment);
		return params.toString();
	});
	const markup = useQuery(() => ({
		queryKey: ["plugin.forms.markup", query()],
		queryFn: () =>
			request({
				url: `${routes.markup}?${query()}`,
				parse: parseMarkup,
			}),
		enabled: open() && key() !== "",
		retry: false,
		//* read again each time the modal opens, as the form may have been saved since
		gcTime: 0,
	}));

	// ----------------------------------
	// Memos
	const code = createMemo(
		(): { value: string; language: string } | undefined => {
			switch (view()) {
				case "html":
					return markup.data
						? { value: formatHtml(markup.data.html), language: "html" }
						: undefined;
				case "draw":
					return { value: drawExample(key()), language: "typescript" };
				case "send":
					return { value: sendExample(key()), language: "typescript" };
			}
		},
	);

	// ----------------------------------
	// Render
	return (
		<>
			<Button
				type="button"
				variant="toolbar"
				size="xs"
				shape="square"
				tooltip={t("plugin.forms.markup.title")}
				aria-label={t("plugin.forms.markup.title")}
				onClick={() => setOpen(true)}
			>
				<TbOutlineCode size={12} />
			</Button>
			<Modal.Root open={open()} onOpenChange={setOpen} size="lg">
				<Modal.Header>
					<Modal.Title>{t("plugin.forms.markup.title")}</Modal.Title>
					<Modal.Description>
						{t("plugin.forms.markup.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<Tabs.Root
						value={view()}
						onChange={(value) => setView(value as View)}
						items={[
							{ value: "html", label: t("plugin.forms.markup.html") },
							{ value: "draw", label: t("plugin.forms.markup.draw") },
							{ value: "send", label: t("plugin.forms.markup.send") },
						]}
					/>
					<div class="mt-4 flex h-[min(60vh,36rem)] flex-col gap-3">
						<Switch>
							<Match when={code()}>
								{(shown) => (
									<CodeBlock
										value={shown().value}
										language={shown().language}
										class="min-h-0 flex-1"
									/>
								)}
							</Match>
							<Match when={markup.isLoading}>
								<div class="flex-1 animate-pulse rounded-md bg-input" />
							</Match>
							<Match when={true}>
								<div class="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-6 text-center">
									<p class="max-w-sm text-sm text-body">
										{t("plugin.forms.markup.unavailable")}
									</p>
								</div>
							</Match>
						</Switch>
						<Show when={view() === "send"}>
							<p class="shrink-0 text-sm text-muted">
								{t("plugin.forms.markup.send.note")}
							</p>
						</Show>
					</div>
				</Modal.Body>
			</Modal.Root>
		</>
	);
};

export default FormMarkup;
