import dotenv from 'dotenv';
import cron from 'node-cron';
import {LinkedInBot} from './linkedinBot';
import { logger } from './utils';

// Load environment variables
dotenv.config();

async function main(runForce = false) {
    if (!runForce) {
        const random = Math.random();
        logger.log('going to start with random', random);
        if (random < 0.95 && random > 0.55) {
            logger.log('random is not enough to start');
            return;
        } else if (random < 0.50 && random > 0.25) {
            logger.log('random is not enough to start');
            return;
        } else if (random < 0.2) {
            logger.log('random is not enough to start');
            return;
        }
    } else {
        logger.log('running force');
    }

    
    const bot = new LinkedInBot();
    
    try {
        const parameters = bot.getParameters();
        await bot.init(Boolean(process.env.HEADFULL));
        await bot.searchPeople(parameters.page);
    } catch (error) {
        const parameters = bot.getParameters();
        bot.saveParameters({
            error: true,
            page: parameters.page,
            parameters,
        });
        logger.error('Error:', error);
        const emptyBot = new LinkedInBot();
        await emptyBot.openEmptyBrowser();
    } finally {
        if (bot) {
            await bot.close();
        }
    }
}

// Run immediately on startup
main(true);

// Schedule the task to run every 5 minutes
cron.schedule('*/5 * * * *', () => {
    logger.log('Running bot task...');
    main();
});
