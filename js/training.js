document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements for Mileage Card
    const mileageTitleEl = document.getElementById('mileageTitle');
    const mileageValueEl = document.getElementById('mileageValue');
    const mileageTrendEl = document.getElementById('mileageTrend');
    const mileageButtons = document.querySelectorAll('button[data-type="mileage"]');

    // --- Helper Functions ---
    async function fetchData(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                // If the response is not OK, try to parse error message if it's JSON
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    // Not a JSON error response, stick with status
                }
                console.error(`Error fetching ${endpoint}: ${errorMsg}`);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Network or other error fetching ${endpoint}:`, error);
            return null;
        }
    }

    function getCurrentYear() {
        return new Date().getFullYear();
    }

    // --- Mileage Card Logic ---
    async function updateMileageCard(period) {
        if (!mileageTitleEl || !mileageValueEl || !mileageTrendEl) {
            console.error('Mileage card DOM elements not found.');
            return;
        }

        let endpoint = '';
        let titlePrefix = '';
        const currentYear = getCurrentYear();

        switch (period) {
            case 'weekly':
                endpoint = `/api/training/weekly?year=${currentYear}`;
                titlePrefix = 'Weekly';
                break;
            case 'monthly':
                endpoint = `/api/training/monthly?year=${currentYear}`;
                titlePrefix = 'Monthly';
                break;
            case 'yearly':
                endpoint = `/api/training/stats?year=${currentYear}`; // For current year's total
                titlePrefix = 'Yearly';
                break;
            default:
                console.error('Invalid period for mileage card:', period);
                return;
        }

        mileageTitleEl.textContent = `${titlePrefix} Distance`;
        mileageValueEl.textContent = 'Loading...';
        mileageTrendEl.textContent = '';

        const data = await fetchData(endpoint);

        if (!data) {
            mileageValueEl.textContent = 'Error';
            mileageTrendEl.textContent = 'Could not load data.';
            return;
        }

        let totalDistance = 0;
        let activityCount = 0;
        let trendText = '';

        if (period === 'weekly') {
            if (data && data.length > 0) {
                // Assuming the API returns weeks sorted, take the first one (most recent)
                // Or, if it's for the *current* week, we might need to find it.
                // For now, let's assume the API /api/training/weekly?year=YYYY returns all weeks of that year
                // and we need to find the current/latest week.
                // This part needs clarification on API behavior or more complex logic to find "current" week.
                // SIMPLIFICATION: For now, sum all distances/activities for the year if multiple weeks are returned,
                // or use the first entry if it's just one week's summary.
                // A more robust solution would be for the API to return just the current week,
                // or for the frontend to calculate current week number and filter.
                // Let's assume for now it returns the most RECENT week's data if specific, or an array.
                // If `data` is an array of weekly stats:
                const latestWeekData = data[0]; // Assuming latest is first if sorted descendingly
                if (latestWeekData) {
                    totalDistance = latestWeekData.total_distance || 0;
                    activityCount = latestWeekData.total_activities || 0;
                    trendText = `${activityCount} activities this week`;
                     mileageTitleEl.textContent = `Week ${latestWeekData.week} Distance`;
                } else {
                     mileageTitleEl.textContent = `Weekly Distance`;
                }
            } else {
                 mileageTitleEl.textContent = `Weekly Distance`;
            }
        } else if (period === 'monthly') {
            if (data && data.length > 0) {
                // Similar to weekly, assuming latest month is first if sorted.
                const latestMonthData = data[0]; // Assuming latest is first
                 if (latestMonthData) {
                    totalDistance = latestMonthData.total_distance || 0;
                    activityCount = latestMonthData.total_activities || 0;
                    trendText = `${activityCount} activities this month`;
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    mileageTitleEl.textContent = `${monthNames[latestMonthData.month - 1]} ${latestMonthData.year} Distance`;
                } else {
                    mileageTitleEl.textContent = `Monthly Distance`;
                }
            } else {
                mileageTitleEl.textContent = `Monthly Distance`;
            }
        } else if (period === 'yearly') {
            // Data from /api/training/stats?year=YYYY
            totalDistance = data.total_distance || 0;
            activityCount = data.total_activities || 0;
            trendText = `${activityCount} activities this year`;
            mileageTitleEl.textContent = `${currentYear} Total Distance`;
        }

        mileageValueEl.textContent = `${(totalDistance / 1000).toFixed(1)} km`;
        mileageTrendEl.textContent = trendText;

        // Placeholder for chart data
        console.log(`Chart data for ${period} distance:`, { totalDistance, activityCount, periodData: data });
        // Here you would update an actual chart if you had one
    }

    mileageButtons.forEach(button => {
        button.addEventListener('click', function() {
            mileageButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateMileageCard(this.dataset.value);
        });
    });

    // --- Initial Load ---
    // Load weekly mileage data by default
    if (mileageButtons.length > 0) {
        mileageButtons[0].classList.add('active'); // Set 'W' as active initially
        updateMileageCard('weekly');
    }
    
    // Any other initializations for other cards would go here

    // DOM Elements for Metrics Card (if not already defined globally)
    // const metricTitleEl = document.getElementById('metricTitle'); // Likely already defined or should be
    // const metricValueEl = document.getElementById('metricValue'); // Likely already defined or should be
    // const metricTrendEl = document.getElementById('metricTrend'); // Likely already defined or should be
    const metricButtons = document.querySelectorAll('button[data-type="metric"]'); // Use this if 'metricButtons' wasn't globally defined for this card

    // --- Metrics Card Logic (Basic Title Update) ---
    function updateMetricCardTitle(metricType) {
        const metricTitleTargetEl = document.getElementById('metricTitle'); // Use specific target
        const metricValueTargetEl = document.getElementById('metricValue');
        const metricTrendTargetEl = document.getElementById('metricTrend');

        if (!metricTitleTargetEl || !metricValueTargetEl || !metricTrendTargetEl) {
            console.error('Metrics card DOM elements not found for update.');
            return;
        }

        let title = '';
        switch (metricType) {
            case 'load':
                title = 'Training Load';
                break;
            case 'heart':
                title = 'Heart Rate Data'; // Changed for clarity
                break;
            case 'streak':
                title = 'Current Streak';
                break;
            case 'fun':
                title = 'Fun Factor';
                break;
            default:
                title = 'Selected Metric';
        }
        metricTitleTargetEl.textContent = title;
        metricValueTargetEl.innerHTML = 'Data N/A <span class="text-2xl"></span>';
        metricTrendTargetEl.textContent = 'Not implemented';
    }

    metricButtons.forEach(button => {
        button.addEventListener('click', function() {
            metricButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateMetricCardTitle(this.dataset.value);
        });
    });

    // Initial setup for the metric card title
    if (metricButtons.length > 0) {
        let initiallyActiveMetric = 'load'; // Default
        const activeHTMLButton = document.querySelector('button[data-type="metric"].active');
        if (activeHTMLButton) {
            initiallyActiveMetric = activeHTMLButton.dataset.value;
        } else {
             metricButtons[0].classList.add('active'); // Make the first one active if none are
        }
        updateMetricCardTitle(initiallyActiveMetric); // Call to set initial title
    }
});
