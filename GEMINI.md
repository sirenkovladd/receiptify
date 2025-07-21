
# Gemini Code Assistant Context

This document provides context for the Gemini code assistant to understand the Receiptify project.

## Project Overview

Receiptify is a web application for managing receipts. Users can upload receipt images, which are analyzed by an AI service to extract structured data. The application consists of a frontend and a backend, both written in TypeScript.

## Backend

The backend is built with Bun and serves a JSON API.

### Key Technologies

*   **Runtime:** [Bun](https://bun.sh/)
*   **Routing:** A custom router implementation in `src/back/router.ts` is used to define API endpoints. It maps URL patterns to handler functions.
*   **Database:** PostgreSQL is used for the database. The schema is defined and migrated in `src/back/db.ts`. The application uses the `bun:sqlite` module to interact with the database.
*   **Authentication:** Session-based authentication is implemented. The server creates a session token upon successful login, which is stored in an HTTP-only cookie. The `crypto` module (`src/back/crypto.ts`) is used to encrypt and decrypt session data.
*   **Receipt Analysis:** The Google Gemini API (`@google/genai`) is used to analyze receipt images. The `src/back/analyzer.ts` file contains the logic for sending requests to the Gemini API and parsing the response.

### Backend File Structure

*   `index.ts`: The entry point for the backend server.
*   `src/back/router.ts`: Defines the API routes and their handlers.
*   `src/back/db.ts`: Contains the database schema, migrations, and data models.
*   `src/back/analyzer.ts`: Handles receipt image analysis using the Gemini API.
*   `src/back/crypto.ts`: Provides encryption and decryption utilities for session management.
*   `src/back/config.ts`: Manages environment variables and configuration.

## Frontend

The frontend is a single-page application (SPA) built with VanJS.

### Key Technologies

*   **Framework:** [VanJS](https://vanjs.org/) is a lightweight, reactive UI framework.
*   **Routing:** [rou3](https://github.com/lume/rou3) is used for client-side routing. Routes are defined in `src/front/main.ts`.
*   **State Management:** VanJS's built-in reactive state (`van.state`) is used for managing application state.
*   **Styling:** A simple stylesheet in `src/front/main.css` is used for styling.

### Frontend File Structure

*   `src/front/main.ts`: The entry point for the frontend application. It initializes the router and renders the main application component.
*   `src/front/utils.ts`: Contains shared state and utility functions, such as `authUser`, `page`, and `jumpPath`.
*   `src/front/*.ts`: Each file in this directory typically represents a page or a major component of the application (e.g., `HomePage.ts`, `LoginPage.ts`, `DashboardPage.ts`).
*   `src/front/form/editing.ts`: A component for a form to edit receipt data.

## Development Environment

*   **Package Manager:** Bun is used for package management.
*   **TypeScript:** The project is written in TypeScript, configured via `tsconfig.json`.
*   **Containerization:** Docker and Docker Compose are used to run the application and the PostgreSQL database in containers. The configuration is in `docker-compose.yml`.
