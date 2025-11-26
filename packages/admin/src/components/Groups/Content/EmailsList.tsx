import T from "@/translations";
import { type Component, Index } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import {
	FaSolidT,
	FaSolidCalendar,
	FaSolidEnvelope,
	FaSolidPaperPlane,
} from "solid-icons/fa";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table";
import EmailRow from "@/components/Tables/Rows/EmailRow";
import PreviewEmailPanel from "@/components/Panels/Email/PreviewEmailPanel";
import DeleteEmail from "@/components/Modals/Email/DeleteEmail";
import ResendEmail from "@/components/Modals/Email/ResendEmail";

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
					title: T()("no_emails"),
					description: T()("no_emails_description"),
				},
			}}
		>
			<Table
				key={"emails.list"}
				rows={emails.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("status"),
						key: "status",
						icon: <FaSolidT />,
					},
					{
						label: T()("subject"),
						key: "subject",
						icon: <FaSolidT />,
					},
					{
						label: T()("template"),
						key: "template",
						icon: <FaSolidT />,
					},
					{
						label: T()("to"),
						key: "to",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("from"),
						key: "from",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("attempt_count"),
						key: "attemptCount",
						icon: <FaSolidPaperPlane />,
						sortable: true,
					},
					{
						label: T()("type"),
						key: "type",
						icon: <FaSolidT />,
					},
					{
						label: T()("first_attempt"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
					{
						label: T()("last_attempt"),
						key: "lastAttemptedAt",
						icon: <FaSolidCalendar />,
						sortable: true,
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
