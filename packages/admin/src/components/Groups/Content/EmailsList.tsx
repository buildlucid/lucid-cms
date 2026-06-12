import {
	FaSolidAt,
	FaSolidBolt,
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidLayerGroup,
	FaSolidPaperPlane,
	FaSolidT,
	FaSolidTag,
} from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table/Table";
import DeleteEmail from "@/components/Modals/Email/DeleteEmail";
import ResendEmail from "@/components/Modals/Email/ResendEmail";
import PreviewEmailPanel from "@/components/Panels/Email/PreviewEmailPanel";
import EmailRow from "@/components/Tables/Rows/EmailRow";
import useRowTarget from "@/hooks/useRowTarget";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import T from "@/translations";

export const EmailsList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			preview: false,
			delete: false,
			resend: false,
		},
	});

	// ----------------------------------
	// Queries
	const emails = api.email.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: emails.isError,
				isSuccess: emails.isSuccess,
				isEmpty: emails.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: emails.data?.meta,
						}}
						options={{
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("empty.states.emails.title"),
					description: T()("empty.states.emails.description"),
				},
			}}
		>
			<Table
				key={"emails.list.v2"}
				rows={emails.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("common.status"),
						key: "currentStatus",
						icon: <FaSolidCircleCheck />,
						minWidth: 140,
					},
					{
						label: T()("common.subject"),
						key: "subject",
						icon: <FaSolidT />,
						minWidth: 320,
					},
					{
						label: T()("common.to"),
						key: "toAddress",
						icon: <FaSolidAt />,
						minWidth: 240,
					},
					{
						label: T()("email.templates.singular"),
						key: "template",
						icon: <FaSolidLayerGroup />,
						minWidth: 180,
					},
					{
						label: T()("common.type"),
						key: "type",
						icon: <FaSolidTag />,
						minWidth: 120,
					},
					{
						label: T()("common.priority"),
						key: "priority",
						icon: <FaSolidBolt />,
						minWidth: 120,
					},
					{
						label: T()("common.attempt.count"),
						key: "attemptCount",
						icon: <FaSolidPaperPlane />,
						sortable: true,
						minWidth: 140,
					},
					{
						label: T()("common.last.attempt"),
						key: "lastAttemptedAt",
						icon: <FaSolidCalendar />,
						sortable: true,
						minWidth: 170,
					},
				]}
				state={{
					isLoading: emails.isFetching,
					isSuccess: emails.isSuccess,
				}}
				options={{
					isSelectable: false,
				}}
			>
				{({ include, isSelectable, selected, setSelected }) => (
					<Index each={emails.data?.data || []}>
						{(email, i) => (
							<EmailRow
								index={i}
								email={email()}
								include={include}
								selected={selected[i]}
								rowTarget={rowTarget}
								options={{
									isSelectable,
								}}
								callbacks={{
									setSelected: setSelected,
								}}
							/>
						)}
					</Index>
				)}
			</Table>
			<PreviewEmailPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().preview,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("preview", state);
					},
				}}
			/>
			<DeleteEmail
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<ResendEmail
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().resend,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("resend", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
