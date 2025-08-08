require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CREDENTIALS_PATH = './client_secret.json';

async function getRacePhotos(raceName) {
    if (!GOOGLE_DRIVE_FOLDER_ID) {
        // Silently fail if no folder ID is provided
        return null;
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('client_secret.json not found. Please follow the setup instructions in README.md');
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const formattedRaceName = raceName.replace(/\s+/g, '-').toLowerCase();

    try {
        const res = await drive.files.list({
            q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents`,
            fields: 'files(id, name, webViewLink)',
        });

        const files = res.data.files;
        if (files.length) {
            const photo = files.find(file => file.name.toLowerCase().startsWith(formattedRaceName));
            return photo ? photo.webViewLink : null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching race photos from Google Drive:', error);
        return null;
    }
}

async function getRaceData() {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEET_ID not found in .env file');
    }

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error('client_secret.json not found. Please follow the setup instructions in README.md');
    }

    const creds = require(CREDENTIALS_PATH);
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    await doc.useServiceAccountAuth(creds);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Races'];
    if (!sheet) {
        throw new Error('"Races" sheet not found in your Google Sheet. Please make sure you have a sheet with this exact name.');
    }

    const rows = await sheet.getRows();
    const raceData = [];
    for (const row of rows) {
        const photoUrl = await getRacePhotos(row.name);
        raceData.push({
            name: row.name,
            date: row.date,
            distance: row.distance,
            moving_time: row.moving_time,
            total_elevation_gain: row.total_elevation_gain,
            location_city: row.location_city,
            location_state: row.location_state,
            location_country: row.location_country,
            description: row.description,
            type: row.type,
            featured: row.featured,
            photoUrl: photoUrl,
        });
    }
    return raceData;
}

module.exports = {
    getRaceData,
    getRacePhotos,
};
