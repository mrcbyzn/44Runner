# 44 Forward

## Description
44 Forward is a web application designed to display my running data. It allows me to import my running data from a google sheets file, view detailed race information, and monitor my statistics. The primary purpose of this project is to provide a centralized platform for me to display data and to share to others. Lie a personla business page.

## Features
- **Race Data Display:** View comprehensive details of past races, automatically identified from Strava activities.
- **Training Statistics:** Analyze training metrics, including yearly, monthly, and weekly breakdowns of distance, activity count, elevation gain, and days run.
- **Strava Integration:** Seamlessly import activities from Strava.
- **User Authentication:** Secure login and data synchronization via Strava OAuth 2.0.
- **Data Synchronization:** Keep your local data up-to-date with your Strava account.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** Sequelize (ORM), SQLite
- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Authentication:** OAuth 2.0 (Strava)

## Setup and Installation
To set up and run the project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd 44-forward
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory of the project and add the following variables:
    ```env
    STRAVA_CLIENT_ID=your_strava_client_id
    STRAVA_CLIENT_SECRET=your_strava_client_secret
    PORT=3000
    # SESSION_SECRET=your_session_secret # Recommended for future session management enhancements
    ```
    Replace `your_strava_client_id` and `your_strava_client_secret` with your actual Strava application credentials. `PORT` defaults to 3000 if not set.

4.  **Database Setup:**
    The database (`strava_data.sqlite`) is initialized automatically when the application starts. The `initializeDatabase()` function in `database.js` (called from `server.js`) handles the creation of the database file and synchronization of models if it doesn't exist.

5.  **Start the development server:**
    ```bash
    npm run dev
    ```
    Alternatively, you can use:
    ```bash
    npm start
    ```
    The application should now be running on `http://localhost:3000` (or your configured `PORT`).

## API Endpoints
The main API endpoints available in `server.js` are:

-   `GET /auth/strava`: Initiates the Strava OAuth 2.0 authentication process by redirecting the user to the Strava authorization page.
-   `GET /auth/strava/callback`: Handles the callback from Strava after authentication. It exchanges the authorization code for an access token, stores the token, and syncs recent Strava activities.
-   `GET /api/races`: Retrieves a list of all activities identified as races from the database. Race data includes details like name, date, time, distance, elevation, and more.
-   `POST /api/sync`: Manually triggers a synchronization of activities from Strava. Requires a valid access token (refreshes if necessary).
-   `GET /api/training/stats`: Retrieves overall training statistics. Can be filtered by year (e.g., `/api/training/stats?year=2023`).
-   `GET /api/training/yearly`: Retrieves a yearly breakdown of training statistics.
-   `GET /api/training/weekly`: Retrieves a weekly breakdown of training statistics. Can be filtered by year.
-   `GET /api/training/monthly`: Retrieves a monthly breakdown of training statistics. Can be filtered by year.
-   `GET /api/test`: A basic test endpoint to check if the server is running. Returns `{ success: true, message: 'Server is running' }`.

## Frontend Pages
The application serves static HTML files from the `public` directory (if configured, though current `server.js` uses `express.static('public')` which implies a `public` folder, but HTML files are at the root). The primary pages are:

-   `index.html`: The main landing page. It displays:
    -   A header with the application title.
    -   A section for "Races I Have Run" with a link to the full race history and a preview of recent races.
    -   An "About Me (The 'Runner')" section.
    -   A "Training Data" section with cards for weekly/monthly/yearly distance and other metrics (currently placeholder data, to be integrated with backend).
    -   A "Bucket List Events & Future Goals" section.
-   `races.html`: Displays a detailed history of all races, grouped by year. Fetches data from the `/api/races` endpoint.
-   `auth-success.html`: (Not directly browsable as a file but part of the flow) Users are redirected to this page after successful Strava authentication and initial data sync. This page should ideally inform the user of the successful connection.

Note: There is no dedicated `login.html` page. Login is handled by redirecting the user to Strava for authentication via the `/auth/strava` endpoint. The `public` folder for static assets like CSS or client-side JS is referenced in `server.js` but may not be fully utilized for HTML files which are at the root.
