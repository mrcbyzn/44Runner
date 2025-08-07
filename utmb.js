require('dotenv').config();
const axios = require('axios');

const UTMB_RUNNER_ID = process.env.UTMB_RUNNER_ID;
const UTMB_RUNNER_NAME = process.env.UTMB_RUNNER_NAME;

async function getUtmbScore() {
    if (!UTMB_RUNNER_ID || !UTMB_RUNNER_NAME) {
        return null;
    }

    const url = `https://utmb.world/runner/${UTMB_RUNNER_ID}.${UTMB_RUNNER_NAME}.api`;

    try {
        const response = await axios.get(url);
        return {
            utmbIndex: response.data.utmbIndex,
            itraScore: response.data.itraScore, // It seems the API returns both
        };
    } catch (error) {
        console.error('Error fetching UTMB/ITRA score:', error.message);
        return null;
    }
}

module.exports = {
    getUtmbScore,
};
