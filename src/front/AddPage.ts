import van from "vanjs-core";
import type { ReceiptUpload } from "../back/db";
import { EditForm } from "./form/editing";
import { jumpPath } from "./utils";

const { div, h1 } = van.tags;

const AddPage = () => {
	const handleSave = async (receiptData: ReceiptUpload) => {
		const response = await fetch("/api/receipts", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(receiptData),
		});

		if (!response.ok) {
			const errData = await response.json();
			throw new Error(errData.message || "Failed to save receipt");
		}

		jumpPath("/dashboard");
	};

	return div(
		{ class: "md3-container" },
		div(
			{ class: "md3-top-app-bar" },
			h1({ class: "md3-top-app-bar-title" }, "Add New Receipt"),
		),
		div({ class: "md3-card md3-card-elevated" }, EditForm({}, handleSave)),
	);
};

export default AddPage;
