const { Sequelize, DataTypes } = require('sequelize');

// Initialize SQLite database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './strava_data.sqlite',
    logging: false // Set to true for SQL query logging
});

// Define Activity model
const Activity = sequelize.define('Activity', {
    strava_id: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sport_type: {
        type: DataTypes.STRING
    },
    workout_type: {
        type: DataTypes.INTEGER
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    moving_time: {
        type: DataTypes.INTEGER
    },
    elapsed_time: {
        type: DataTypes.INTEGER
    },
    distance: {
        type: DataTypes.FLOAT
    },
    total_elevation_gain: {
        type: DataTypes.FLOAT
    },
    average_speed: {
        type: DataTypes.FLOAT
    },
    max_speed: {
        type: DataTypes.FLOAT
    },
    average_heartrate: {
        type: DataTypes.FLOAT
    },
    max_heartrate: {
        type: DataTypes.FLOAT
    },
    elev_high: {
        type: DataTypes.FLOAT
    },
    elev_low: {
        type: DataTypes.FLOAT
    },
    description: {
        type: DataTypes.TEXT
    },
    calories: {
        type: DataTypes.FLOAT
    },
    location_country: {
        type: DataTypes.STRING
    },
    location_state: {
        type: DataTypes.STRING
    },
    location_city: {
        type: DataTypes.STRING
    },
    last_synced: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

// Define Race model (extends Activity)
const Race = sequelize.define('Race', {
    // Additional race-specific fields can be added here
    placement: {
        type: DataTypes.INTEGER
    },
    category: {
        type: DataTypes.STRING
    },
    race_type: {
        type: DataTypes.STRING
    }
});

// Create associations
Race.belongsTo(Activity, { foreignKey: 'activity_id' }); // activity_id will be created on Race model

// Helper function to sync activities from Strava
async function syncActivities(activities) {
    for (const activity of activities) {
        await Activity.upsert({
            strava_id: activity.id,
            name: activity.name,
            type: activity.type,
            sport_type: activity.sport_type,
            workout_type: activity.workout_type,
            start_date: activity.start_date_local, 
            moving_time: activity.moving_time,
            elapsed_time: activity.elapsed_time,
            distance: activity.distance,
            total_elevation_gain: activity.total_elevation_gain,
            average_speed: activity.average_speed,
            max_speed: activity.max_speed,
            average_heartrate: activity.average_heartrate,
            max_heartrate: activity.max_heartrate,
            elev_high: activity.elev_high,
            elev_low: activity.elev_low,
            description: activity.description,
            calories: activity.calories,
            location_country: activity.location_country,
            location_state: activity.location_state,
            location_city: activity.location_city,
            last_synced: new Date()
        });

        // If it's a race, create or update race record
        // workout_type 1 is Race, 2 is Long Run, 3 is Workout. Strava's API can vary.
        // It's safer to rely on activity.type === 'Race' or a specific workout_type if known.
        // Prompt specified workout_type 3, but previous file had 1. Using 1 as it's common for "Race".
        if (activity.type === 'Race' || activity.workout_type === 1) {
            await Race.upsert({
                activity_id: activity.id, // This correctly references Activity's strava_id
                // Add any race-specific data here from the activity if available
                // e.g., placement: activity.placement (if present in Strava data)
            });
        }
    }
}

// Initialize database
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Sync all models
        await sequelize.sync(); // Use { alter: true } if schema changes are expected during development
        console.log('Database models synchronized.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

// Training statistics queries
async function getTrainingStats(year = null) {
    try {
        const whereClause = year ? {
            type: 'Run',
            [Sequelize.Op.and]: [
                sequelize.where(sequelize.literal(`strftime('%Y', start_date)`), year.toString())
            ]
        } : {
            type: 'Run'
        };

        const stats = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('strava_id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [sequelize.fn('AVG', sequelize.col('distance')), 'avg_distance'] // AVG might be NULL if no activities
            ]
        });

        // Get unique days with runs
        const daysWithRuns = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.literal("strftime('%Y-%m-%d', start_date)"), 'run_date']
            ],
            group: [sequelize.literal("strftime('%Y-%m-%d', start_date)")]
        });
        
        const statResult = stats[0] ? stats[0].dataValues : {};
        const total_distance = parseFloat(statResult.total_distance || 0);
        const total_activities = parseInt(statResult.total_activities || 0);
        const total_vert = parseFloat(statResult.total_vert || 0);
        const avg_distance = parseFloat(statResult.avg_distance || 0);
        const total_days = daysWithRuns.length;

        return {
            total_distance: total_distance,
            total_activities: total_activities,
            total_vert: total_vert,
            avg_distance: avg_distance, // This is avg distance per activity, not per day
            total_days: total_days,
            avg_distance_per_day: total_days > 0 ? total_distance / total_days : 0 // This is avg distance per run day
        };
    } catch (error) {
        console.error('Error getting training stats:', error);
        throw error;
    }
}

// Get yearly breakdown
async function getYearlyStats() {
    try {
        const years = await Activity.findAll({
            attributes: [
                [sequelize.literal("strftime('%Y', start_date)"), 'year']
            ],
            where: {
                type: 'Run'
            },
            group: [sequelize.literal("strftime('%Y', start_date)")],
            order: [[sequelize.literal("strftime('%Y', start_date)"), 'DESC']]
        });

        const yearlyStats = [];
        for (const yearData of years) { // Renamed loop variable to avoid conflict
            const yearValue = yearData.getDataValue('year');
            if (yearValue) {
                const yearIntValue = parseInt(yearValue);
                const stats = await getTrainingStats(yearIntValue);
                yearlyStats.push({
                    year: yearIntValue,
                    ...stats
                });
            }
        }

        return yearlyStats;
    } catch (error) {
        console.error('Error getting yearly stats:', error);
        throw error;
    }
}

// Get weekly breakdown
async function getWeeklyStats(year = null) {
    try {
        const currentYear = new Date().getFullYear();
        const targetYear = year ? year.toString() : currentYear.toString();

        const whereClause = {
            type: 'Run',
            [Sequelize.Op.and]: [
                sequelize.where(sequelize.literal("strftime('%Y', start_date)"), targetYear)
            ]
        };

        const weeklyStatsResult = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.literal("strftime('%Y', start_date)"), 'year'],
                [sequelize.literal("strftime('%W', start_date)"), 'week'], // %W: week number (00-53), Monday as first day of week
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('strava_id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [sequelize.literal("COUNT(DISTINCT strftime('%Y-%m-%d', start_date))"), 'days_run'] // Count distinct days
            ],
            group: [
                sequelize.literal("strftime('%Y', start_date)"),
                sequelize.literal("strftime('%W', start_date)")
            ],
            order: [
                [sequelize.literal("strftime('%Y', start_date)"), 'DESC'],
                [sequelize.literal("strftime('%W', start_date)"), 'DESC']
            ]
        });

        return weeklyStatsResult.map(stat => {
            const dataValues = stat.dataValues;
            const days_run = parseInt(dataValues.days_run || 0);
            const total_distance = parseFloat(dataValues.total_distance || 0);
            return {
                year: parseInt(dataValues.year),
                week: parseInt(dataValues.week), // Week numbers from strftime('%W') are 00-53
                total_distance: total_distance,
                total_activities: parseInt(dataValues.total_activities || 0),
                total_vert: parseFloat(dataValues.total_vert || 0),
                days_run: days_run,
                avg_distance_per_day: days_run > 0 ? total_distance / days_run : 0
            };
        });
    } catch (error) {
        console.error('Error getting weekly stats:', error);
        throw error;
    }
}

// Get monthly breakdown
async function getMonthlyStats(year = null) {
    try {
        const currentYear = new Date().getFullYear();
        const targetYear = year ? year.toString() : currentYear.toString();

        const whereClause = {
            type: 'Run',
            [Sequelize.Op.and]: [
                sequelize.where(sequelize.literal("strftime('%Y', start_date)"), targetYear)
            ]
        };

        const monthlyStatsResult = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.literal("strftime('%Y', start_date)"), 'year'],
                [sequelize.literal("strftime('%m', start_date)"), 'month'], // %m: month number (01-12)
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('strava_id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [sequelize.literal("COUNT(DISTINCT strftime('%Y-%m-%d', start_date))"), 'days_run'] // Count distinct days
            ],
            group: [
                sequelize.literal("strftime('%Y', start_date)"),
                sequelize.literal("strftime('%m', start_date)")
            ],
            order: [
                [sequelize.literal("strftime('%Y', start_date)"), 'DESC'],
                [sequelize.literal("strftime('%m', start_date)"), 'DESC']
            ]
        });

        return monthlyStatsResult.map(stat => {
            const dataValues = stat.dataValues;
            const days_run = parseInt(dataValues.days_run || 0);
            const total_distance = parseFloat(dataValues.total_distance || 0);
            return {
                year: parseInt(dataValues.year),
                month: parseInt(dataValues.month), // Month numbers from strftime('%m') are 01-12
                total_distance: total_distance,
                total_activities: parseInt(dataValues.total_activities || 0),
                total_vert: parseFloat(dataValues.total_vert || 0),
                days_run: days_run,
                avg_distance_per_day: days_run > 0 ? total_distance / days_run : 0
            };
        });
    } catch (error) {
        console.error('Error getting monthly stats:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    Activity,
    Race,
    syncActivities,
    initializeDatabase,
    getTrainingStats,
    getYearlyStats,
    getWeeklyStats,
    getMonthlyStats
};
