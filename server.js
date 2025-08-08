require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Activity, Race, initializeDatabase, getTrainingStats, getYearlyStats, getWeeklyStats, getMonthlyStats } = require('./models/database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
initializeDatabase();

const { getRaceData } = require('./googleSheets');

// Sync races from Google Sheet to the database
async function syncRacesToDb() {
    try {
        const races = await getRaceData();
        for (const race of races) {
            const [activity, created] = await Activity.findOrCreate({
                where: { name: race.name, start_date: new Date(race.date) },
                defaults: {
                    name: race.name,
                    type: race.type || 'Race',
                    start_date: new Date(race.date),
                    distance: race.distance,
                    moving_time: race.moving_time,
                    total_elevation_gain: race.total_elevation_gain,
                    location_city: race.location_city,
                    location_state: race.location_state,
                    location_country: race.location_country,
                    description: race.description,
                    featured: race.featured === 'TRUE' || race.featured === 'YES',
                }
            });

            if (activity) {
                await Race.findOrCreate({
                    where: { activity_id: activity.id },
                    defaults: {
                        activity_id: activity.id,
                        // You can add race-specific fields here if they are in your sheet
                    }
                });
            }
        }
        console.log('Races synced successfully from Google Sheet to database.');
    } catch (error) {
        console.error('Error syncing races to database:', error);
    }
}

// API endpoint to get races from the database
app.get('/api/races', async (req, res) => {
    try {
        // Get races from the database
        const races = await Race.findAll({
            include: [{
                model: Activity,
                required: true
            }],
            order: [['Activity', 'start_date', 'DESC']]
        });
        res.json(races);
    } catch (error) {
        console.error('Error fetching races from database:', error);
        res.status(500).json({ error: 'Failed to fetch races from database' });
    }
});

// API endpoint to manually trigger a sync from Google Sheet
app.post('/api/sync-races', async (req, res) => {
    try {
        await syncRacesToDb();
        res.json({ message: 'Races synced successfully' });
    } catch (error) {
        console.error('Error syncing races:', error);
        res.status(500).json({ error: 'Failed to sync races' });
    }
});

// Initial sync on server start
syncRacesToDb();

const { getUtmbScore } = require('./utmb');

app.get('/api/utmb-score', async (req, res) => {
    try {
        const score = await getUtmbScore();
        res.json(score);
    } catch (error) {
        console.error('Error fetching UTMB/ITRA score:', error);
        res.status(500).json({ error: 'Failed to fetch UTMB/ITRA score' });
    }
});

app.get('/api/featured-race', async (req, res) => {
    try {
        const featuredRace = await Race.findOne({
            include: [{
                model: Activity,
                where: { featured: true },
                required: true
            }]
        });
        res.json(featuredRace);
    } catch (error) {
        console.error('Error fetching featured race:', error);
        res.status(500).json({ error: 'Failed to fetch featured race' });
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