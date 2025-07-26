import van from "vanjs-core";
import type { ReceiptUpload } from "../back/db";
import { EditForm } from "./form/editing";
import { jumpPath, routerParam, selectedReceipt } from "./utils";

const { div, h1 } = van.tags;

const EditPage = () => {
	// TODO add delete button
	const status = van.state("Loading...");
	van.derive(() => {
		const id = routerParam.val.id;
		if (id && id !== selectedReceipt.val?.id) {
			selectedReceipt.val = null; // Reset before fetching
			status.val = "Loading...";
			fetch(`/api/receipts/${id}`)
				.then((response) => response.json())
				.then((data) => {
					selectedReceipt.val = data;
				})
				.catch((error) => {
					console.error("Failed to fetch receipt:", error);
					status.val = "Failed to load receipt.";
				});
		}
	});
	const handleSave = async (receiptData: ReceiptUpload) => {
		const id = routerParam.val.id;
		const response = await fetch(`/api/receipts/${id}`, {
			method: "POST",
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
			h1({ class: "md3-top-app-bar-title" }, "Edit Receipt")
		),
		div(
			{ class: "md3-card md3-card-elevated" },
			() => {
				if (selectedReceipt.val) {
					return EditForm(selectedReceipt.val, handleSave);
				}
				return div({ class: "md3-card" }, status);
			}
		)
	);
};

export default EditPage;
