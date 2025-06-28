import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY, PREDICTION_MODEL } from "./config";

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Define the structure for a single item on the receipt
export interface ReceiptItem {
	name: string;
	count: number;
	price: number;
}

// Define the structure for the entire parsed receipt
export interface ParsedReceipt {
	items: ReceiptItem[];
	type: string; // e.g., 'grocery', 'restaurant', 'gas', 'retail'
	storeName: string | null; // The name of the store or vendor
	datetime: string; // Date in YYYY-MM-DD format
}

/**
 * Analyzes a receipt image using the Gemini API and extracts structured data.
 *
 * @param imageBase64 The base64 encoded string of the receipt image.
 * @param mimeType The MIME type of the image (e.g., 'image/png', 'image/jpeg').
 * @returns A promise that resolves to the parsed receipt data.
 * @throws An error if the API key is not set or if the API call fails.
 */
export async function analyzeReceipt(
	imageBase64: string,
	mimeType: string,
): Promise<ParsedReceipt> {
	const prompt = `
    Analyze the attached receipt image. Extract the following information and provide the output strictly in a JSON format that matches this TypeScript interface:

    interface ReceiptItem {
      name: string;
      count: number;
      price: number;
    }

    interface ParsedReceipt {
      items: ReceiptItem[];
      type: string; // e.g., 'grocery', 'restaurant', 'gas', 'retail'
      storeName: string | null; // The name of the store or vendor
      datetime: string;
    }

    - For 'items', if quantity is not explicitly mentioned for an item, assume it is 1. The 'price' should be the total price for that line item.
    - For 'datetime', please format it as YYYY-MM-DD HH:mm:ss.
  `;

	const result = await genAI.models.generateContent({
		model: PREDICTION_MODEL,
		contents: [
			{
				inlineData: {
					mimeType,
					data: imageBase64,
				},
			},
			{ text: prompt },
		],
	});
	let responseText = result.text || "";

	if (responseText.startsWith("```json")) {
		// Remove the leading ```json and trailing ```
		responseText = responseText.substring(7, responseText.lastIndexOf("```"));
	}

	try {
		// The response text should be a valid JSON string because of `responseMimeType`.
		return JSON.parse(responseText) as ParsedReceipt;
	} catch (e) {
		console.error("Failed to parse JSON response from Gemini:", responseText);
		throw new Error("The response from the AI was not valid JSON.");
	}
}
