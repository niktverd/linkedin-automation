import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
    LINKEDIN_EMAIL: process.env.LINKEDIN_EMAIL || '',
    LINKEDIN_PASSWORD: process.env.LINKEDIN_PASSWORD || '',
    SEARCH_CRITERIA: {
        network: [
            // 'F',
            // 'O',
            'S',
        ],
        keywords: 'investor',
        location: [
            103644278, // USA
            105015875, // France
            // // 100565514, // Belgium
            // 105646813, // Spain
            // 102299470, // England
            // 101282230, // Germany
            // 103350119, // Italy
            // 103644278, // United States
            // 101174742, // Canada
            // 101452733, // Australia
            // 102713980, // India
            // 102890883, // China
            // 101355337, // Japan
            // 106057199, // Brazil
            // 103323778, // Mexico
            // 102890719, // Netherlands
            // 102454443, // Singapore
            // 106693272, // Switzerland
            // 105117694, // Sweden
            // 105149562, // South Korea
            // 101728296, // Russia
            // 104305776, // United Arab Emirates (UAE)
        ],
        // MAX_INVITES: 10,
        // DELAY_BETWEEN_ACTIONS: 3000, // 3 seconds
    },
};
