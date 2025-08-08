const { Sequelize, DataTypes } = require('sequelize');

// Initialize SQLite database
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './strava_data.sqlite',
    logging: false // Set to true for SQL query logging
});

// Define Activity model
const Activity = sequelize.define('Activity', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
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
    start_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    moving_time: {
        type: DataTypes.INTEGER
    },
    distance: {
        type: DataTypes.FLOAT
    },
    total_elevation_gain: {
        type: DataTypes.FLOAT
    },
    description: {
        type: DataTypes.TEXT
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
    featured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

// Define Race model (extends Activity)
const Race = sequelize.define('Race', {
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
Race.belongsTo(Activity, { foreignKey: 'activity_id' });

// Initialize database
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Sync all models
        await sequelize.sync({ alter: true });
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
            start_date: {
                [Sequelize.Op.gte]: new Date(year, 0, 1),
                [Sequelize.Op.lt]: new Date(year + 1, 0, 1)
            }
        } : {
            type: 'Run'
        };

        const stats = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [sequelize.fn('AVG', sequelize.col('distance')), 'avg_distance']
            ]
        });

        // Get unique days with runs
        const daysWithRuns = await Activity.findAll({
            where: whereClause,
            attributes: [
                [sequelize.fn('DATE', sequelize.col('start_date')), 'run_date']
            ],
            group: [sequelize.fn('DATE', sequelize.col('start_date'))]
        });

        return {
            total_distance: stats[0].getDataValue('total_distance') || 0,
            total_activities: stats[0].getDataValue('total_activities') || 0,
            total_vert: stats[0].getDataValue('total_vert') || 0,
            avg_distance: stats[0].getDataValue('avg_distance') || 0,
            total_days: daysWithRuns.length,
            avg_distance_per_day: daysWithRuns.length > 0 ?
                (stats[0].getDataValue('total_distance') || 0) / daysWithRuns.length : 0
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
                [sequelize.fn('YEAR', sequelize.col('start_date')), 'year']
            ],
            where: {
                type: 'Run'
            },
            group: [sequelize.fn('YEAR', sequelize.col('start_date'))],
            order: [[sequelize.fn('YEAR', sequelize.col('start_date')), 'DESC']]
        });

        const yearlyStats = [];
        for (const year of years) {
            const yearValue = year.getDataValue('year');
            const stats = await getTrainingStats(yearValue);
            yearlyStats.push({
                year: yearValue,
                ...stats
            });
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
        const whereClause = year ? {
            type: 'Run',
            start_date: {
                [Sequelize.Op.gte]: new Date(year, 0, 1),
                [Sequelize.Op.lt]: new Date(year + 1, 0, 1)
            }
        } : {
            type: 'Run'
        };

        const weeklyStats = await Activity.findAll({
            where: whereClause,
            attributes: [
                [
                    sequelize.literal(`strftime('%Y', start_date)`),
                    'year'
                ],
                [
                    sequelize.literal(`strftime('%W', start_date)`),
                    'week'
                ],
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [
                    sequelize.literal(`COUNT(DISTINCT strftime('%Y-%m-%d', start_date))`),
                    'days_run'
                ]
            ],
            group: [
                sequelize.literal(`strftime('%Y', start_date)`),
                sequelize.literal(`strftime('%W', start_date)`)
            ],
            order: [
                [sequelize.literal(`strftime('%Y', start_date)`), 'DESC'],
                [sequelize.literal(`strftime('%W', start_date)`), 'DESC']
            ]
        });

        return weeklyStats.map(stat => ({
            year: parseInt(stat.getDataValue('year')),
            week: parseInt(stat.getDataValue('week')),
            total_distance: stat.getDataValue('total_distance') || 0,
            total_activities: stat.getDataValue('total_activities') || 0,
            total_vert: stat.getDataValue('total_vert') || 0,
            days_run: stat.getDataValue('days_run') || 0,
            avg_distance_per_day: stat.getDataValue('days_run') > 0 ?
                (stat.getDataValue('total_distance') || 0) / stat.getDataValue('days_run') : 0
        }));
    } catch (error) {
        console.error('Error getting weekly stats:', error);
        throw error;
    }
}

// Get monthly breakdown
async function getMonthlyStats(year = null) {
    try {
        const whereClause = year ? {
            type: 'Run',
            start_date: {
                [Sequelize.Op.gte]: new Date(year, 0, 1),
                [Sequelize.Op.lt]: new Date(year + 1, 0, 1)
            }
        } : {
            type: 'Run'
        };

        const monthlyStats = await Activity.findAll({
            where: whereClause,
            attributes: [
                [
                    sequelize.literal(`strftime('%Y', start_date)`),
                    'year'
                ],
                [
                    sequelize.literal(`strftime('%m', start_date)`),
                    'month'
                ],
                [sequelize.fn('SUM', sequelize.col('distance')), 'total_distance'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_activities'],
                [sequelize.fn('SUM', sequelize.col('total_elevation_gain')), 'total_vert'],
                [
                    sequelize.literal(`COUNT(DISTINCT strftime('%Y-%m-%d', start_date))`),
                    'days_run'
                ]
            ],
            group: [
                sequelize.literal(`strftime('%Y', start_date)`),
                sequelize.literal(`strftime('%m', start_date)`)
            ],
            order: [
                [sequelize.literal(`strftime('%Y', start_date)`), 'DESC'],
                [sequelize.literal(`strftime('%m', start_date)`), 'DESC']
            ]
        });

        return monthlyStats.map(stat => ({
            year: parseInt(stat.getDataValue('year')),
            month: parseInt(stat.getDataValue('month')),
            total_distance: stat.getDataValue('total_distance') || 0,
            total_activities: stat.getDataValue('total_activities') || 0,
            total_vert: stat.getDataValue('total_vert') || 0,
            days_run: stat.getDataValue('days_run') || 0,
            avg_distance_per_day: stat.getDataValue('days_run') > 0 ?
                (stat.getDataValue('total_distance') || 0) / stat.getDataValue('days_run') : 0
        }));
    } catch (error) {
        console.error('Error getting monthly stats:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    Activity,
    Race,
    initializeDatabase,
    getTrainingStats,
    getYearlyStats,
    getWeeklyStats,
    getMonthlyStats
};
