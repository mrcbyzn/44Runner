# 44 Forward

## Description
44 Forward is a web application designed to display my running data. It allows me to import my running data from a google sheets file, view detailed race information, and monitor my statistics. The primary purpose of this project is to provide a centralized platform for me to display data and to share to others. Lie a personla business page.

## Features
- **Race Data Display:** View comprehensive details of past races, powered by your own Google Sheet.
- **Training Statistics:** Analyze training metrics, including yearly, monthly, and weekly breakdowns of distance, activity count, elevation gain, and days run.
- **Google Sheets Integration:** Your race data is pulled directly from a Google Sheet that you control.

## Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** Sequelize (ORM), SQLite
- **Frontend:** HTML, Tailwind CSS, JavaScript
- **Google API:** google-spreadsheet, googleapis

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

3.  **Set up Google Sheets API Access:**
    This project uses a Google Sheet as a database for your race data. To get started, you will need to create a Google Cloud project, enable the Google Sheets API, and create a service account.

    1.  **Create a Google Cloud Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
    2.  **Enable APIs:** In your new project, go to the "APIs & Services" dashboard, click "+ ENABLE APIS AND SERVICES", and search for the following APIs. Enable both of them:
        - **Google Sheets API**
        - **Google Drive API**
    3.  **Create a Service Account:**
        - In the "APIs & Services" dashboard, go to "Credentials".
        - Click "+ CREATE CREDENTIALS" and select "Service account".
        - Give your service account a name (e.g., "44-forward-sheets-reader").
        - Grant the service account the "Viewer" role under "Project" > "Viewer".
        - Click "Done".
    4.  **Create Service Account Keys:**
        - Once the service account is created, click on it to manage its details.
        - Go to the "KEYS" tab and click "ADD KEY" > "Create new key".
        - Select "JSON" as the key type and click "CREATE". This will download a JSON file with your credentials.
    5.  **Save the Credentials:** Rename the downloaded JSON file to `client_secret.json` and place it in the root directory of this project.
    6.  **Share your Google Sheet:**
        - Create a new Google Sheet.
        - In the `client_secret.json` file, you will find a `client_email` address.
        - In your Google Sheet, click the "Share" button in the top right corner and share the sheet with the `client_email` address, giving it at least "Viewer" permissions.

4.  **Set up environment variables:**
    Create a `.env` file in the root directory of the project and add the following variables:
    ```env
    PORT=3000
    GOOGLE_SHEET_ID=your_google_sheet_id
    # Optional: for UTMB/ITRA score
    UTMB_RUNNER_ID=your_runner_id
    UTMB_RUNNER_NAME=your_runner_name
    # Optional: for Google Drive photos
    GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
    ```
    - Replace `your_google_sheet_id` with the ID of your Google Sheet. You can find this in the URL of your sheet (it's the long string of characters between `/d/` and `/edit`).
    - The other variables are optional and will be used for future features.

5.  **Database Setup:**
    The local SQLite database (`strava_data.sqlite`) is initialized automatically when the application starts. It will be populated with data from your Google Sheet.

6.  **Start the development server:**
    ```bash
    npm run dev
    ```
    Alternatively, you can use:
    ```bash
    npm start
    ```
    The application should now be running on `http://localhost:3000` (or your configured `PORT`).

## Google Sheet Structure
For the application to correctly parse your race data, your Google Sheet should have a sheet (tab) named "Races" with the following columns in this order:

- `name`: The name of the race.
- `date`: The date of the race (e.g., "2023-10-29").
- `distance`: The distance of the race in meters.
- `moving_time`: The duration of the race in seconds.
- `total_elevation_gain`: The total elevation gain in meters.
- `location_city`: The city where the race took place.
- `location_state`: The state or province.
- `location_country`: The country.
- `description`: A short description or notes about the race.
- `type`: The type of activity (e.g., "Race", "Run").
- `featured`: Mark a race as "featured" by putting a "TRUE" or "YES" in this column. This will be used to display the race on the home page.

## API Endpoints
The main API endpoints available in `server.js` are:

-   `GET /api/races`: Retrieves a list of all activities identified as races from your Google Sheet.
-   `GET /api/training/stats`: Retrieves overall training statistics. Can be filtered by year (e.g., `/api/training/stats?year=2023`).
-   `GET /api/training/yearly`: Retrieves a yearly breakdown of training statistics.
-   `GET /api/training/weekly`: Retrieves a weekly breakdown of training statistics. Can be filtered by year.
-   `GET /api/training/monthly`: Retrieves a monthly breakdown of training statistics. Can be filtered by year.
-   `GET /api/test`: A basic test endpoint to check if the server is running. Returns `{ success: true, message: 'Server is running' }`.

## Frontend Pages
The application serves static HTML files from the `public` directory. The primary pages are:

-   `index.html`: The main landing page.
-   `races.html`: Displays a detailed history of all races.
