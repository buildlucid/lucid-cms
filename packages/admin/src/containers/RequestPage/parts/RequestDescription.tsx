import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestDetail } from "@types";
import { FaSolidPen } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { richTextHasContent } from "@/components/RichText/helpers";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import { RequestRichTextContent } from "./RequestRichTextContent";
import { RequestRichTextEditor } from "./RequestRichTextEditor";

/**
 * The request's description. People who can edit the request write it in
 * the same box as comments, so they can mention people too. Saving it empty
 * clears it.
 */
export const RequestDescription: Component<{
	request: RequestDetail;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editing, setEditing] = createSignal(false);
	const [body, setBody] = createSignal<RichTextJSON>();

	// ----------------------------------------
	// Queries & Mutations
	const update = api.requests.useUpdateSingle({
		onSuccess: () => setEditing(false),
	});

	// ----------------------------------------
	// Memos
	const hasDescription = createMemo(() =>
		richTextHasContent(props.request.description ?? undefined),
	);

	// ----------------------------------------
	// Functions
	const startEditing = () => {
		setBody(props.request.description ?? undefined);
		update.reset();
		setEditing(true);
	};
	const save = () => {
		const value = body();
		update.action.mutate({
			id: props.request.id,
			body: {
				description: value && richTextHasContent(value) ? value : null,
			},
		});
	};
	//* editing ends when focus leaves without changes. The saved value is a
	//* store proxy, so compare text
	const closeIfUnchanged = () => {
		if (
			JSON.stringify(body() ?? null) ===
			JSON.stringify(props.request.description)
		) {
			setEditing(false);
		}
	};

	// ----------------------------------------
	// Render
	return (
		<section>
			<SectionHeading
				title={T()("requests.description.title")}
				actions={
					<Show when={props.request.permissions.edit && !editing()}>
						<Button
							variant="ghost"
							size="xs"
							shape="square"
							aria-label={T()("requests.description.edit")}
							title={T()("requests.description.edit")}
							onClick={startEditing}
						>
							<FaSolidPen size={10} />
						</Button>
					</Show>
				}
			/>
			<Show
				when={editing()}
				fallback={
					<Show
						when={hasDescription() ? props.request.description : undefined}
						fallback={
							<p class="text-sm text-muted">
								{T()("requests.description.empty")}
							</p>
						}
					>
						{(description) => (
							<RequestRichTextContent
								request={props.request}
								value={description()}
							/>
						)}
					</Show>
				}
			>
				<RequestRichTextEditor
					request={props.request}
					id="request-description"
					value={body()}
					onChange={setBody}
					onSubmit={save}
					submitting={update.action.isPending}
					submitLabel={T()("common.save")}
					placeholder={T()("requests.description.placeholder")}
					error={update.errors()?.message}
					allowEmpty={true}
					variant="inline"
					onFocusLeave={closeIfUnchanged}
					onEscape={() => setEditing(false)}
					onClose={() => setEditing(false)}
				/>
			</Show>
		</section>
	);
};
