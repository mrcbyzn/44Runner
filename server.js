require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Activity, Race, syncActivities, initializeDatabase, getTrainingStats, getYearlyStats, getWeeklyStats, getMonthlyStats } = require('./models/database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

// Strava OAuth Configuration
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/auth/strava/callback';

// Strava OAuth endpoints
app.get('/auth/strava', (req, res) => {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;
    res.redirect(authUrl);
});

app.get('/auth/strava/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: 'No authorization code received' });
    }

    try {
        // Exchange code for access token
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code'
        });

        const { access_token, refresh_token, expires_at } = response.data;

        // Store tokens
        process.env.STRAVA_ACCESS_TOKEN = access_token;
        process.env.STRAVA_REFRESH_TOKEN = refresh_token;
        process.env.STRAVA_TOKEN_EXPIRES_AT = expires_at;

        // Fetch and sync activities
        const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            },
            params: {
                per_page: 100
            }
        });

        // Sync activities to database
        await syncActivities(activitiesResponse.data);

        // Redirect to success page
        res.redirect('/auth-success.html');
    } catch (error) {
        console.error('Error in callback:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to exchange code for token' });
    }
});

// Helper function to refresh token if needed
async function refreshStravaToken() {
    try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            refresh_token: process.env.STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        });

        const { access_token, refresh_token, expires_at } = response.data;
        
        // Update environment variables
        process.env.STRAVA_ACCESS_TOKEN = access_token;
        process.env.STRAVA_REFRESH_TOKEN = refresh_token;
        process.env.STRAVA_TOKEN_EXPIRES_AT = expires_at;

        return access_token;
    } catch (error) {
        console.error('Error refreshing token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

// Strava: Get races from database
app.get('/api/races', async (req, res) => {
    try {
        // Get races from database
        const races = await Race.findAll({
            include: [{
                model: Activity,
                required: true
            }],
            order: [['Activity', 'start_date', 'DESC']]
        });

        // Format the response
        const formattedRaces = races.map(race => ({
            id: race.Activity.strava_id,
            name: race.Activity.name,
            start_date_local: race.Activity.start_date,
            moving_time: race.Activity.moving_time,
            distance: race.Activity.distance,
            total_elevation_gain: race.Activity.total_elevation_gain,
            average_speed: race.Activity.average_speed,
            max_speed: race.Activity.max_speed,
            average_heartrate: race.Activity.average_heartrate,
            max_heartrate: race.Activity.max_heartrate,
            elev_high: race.Activity.elev_high,
            elev_low: race.Activity.elev_low,
            type: race.Activity.type,
            sport_type: race.Activity.sport_type,
            workout_type: race.Activity.workout_type,
            description: race.Activity.description,
            calories: race.Activity.calories,
            location_country: race.Activity.location_country,
            location_state: race.Activity.location_state,
            location_city: race.Activity.location_city,
            placement: race.placement,
            category: race.category,
            race_type: race.race_type
        }));

        res.json(formattedRaces);
    } catch (error) {
        console.error('Error fetching races from database:', error);
        res.status(500).json({ error: 'Failed to fetch races from database' });
    }
});

// Endpoint to manually sync activities
app.post('/api/sync', async (req, res) => {
    try {
        let accessToken = process.env.STRAVA_ACCESS_TOKEN;
        const expiresAt = process.env.STRAVA_TOKEN_EXPIRES_AT;

        if (!accessToken) {
            return res.redirect('/auth/strava');
        }

        if (expiresAt && Date.now() >= (expiresAt * 1000 - 300000)) {
            accessToken = await refreshStravaToken();
        }

        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: {
                per_page: 100
            }
        });

        await syncActivities(response.data);
        res.json({ message: 'Activities synced successfully' });
    } catch (error) {
        console.error('Error syncing activities:', error);
        res.status(500).json({ error: 'Failed to sync activities' });
    }
});

// Training statistics endpoints
app.get('/api/training/stats', async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const stats = await getTrainingStats(year);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching training stats:', error);
        res.status(500).json({ error: 'Failed to fetch training statistics' });
    }
});

app.get('/api/training/yearly', async (req, res) => {
    try {
        const yearlyStats = await getYearlyStats();
        res.json(yearlyStats);
    } catch (error) {
        console.error('Error fetching yearly stats:', error);
        res.status(500).json({ error: 'Failed to fetch yearly statistics' });
    }
});

app.get('/api/training/weekly', async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const weeklyStats = await getWeeklyStats(year);
        res.json(weeklyStats);
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({ error: 'Failed to fetch weekly statistics' });
    }
});

app.get('/api/training/monthly', async (req, res) => {
    try {
        const year = req.query.year ? parseInt(req.query.year) : null;
        const monthlyStats = await getMonthlyStats(year);
        res.json(monthlyStats);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ error: 'Failed to fetch monthly statistics' });
    }
});

// Basic test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is running'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 