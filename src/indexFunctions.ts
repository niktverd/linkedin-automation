import dotenv from 'dotenv';

import {LinkedInBot} from './linkedinBot';
import {logger} from './utils';

dotenv.config();

export const search = async (runForce = false) => {
    // eslint-disable-next-line no-negated-condition
    if (!runForce) {
        const random = Math.random();
        logger.log('going to start with random', random);
        if (random < 0.9) {
            logger.log('random is not enough to start');
            return;
        }
        //  else if (random < 0.50 && random > 0.25) {
        //     logger.log('random is not enough to start');
        //     return;
        // } else if (random < 0.2) {
        //     logger.log('random is not enough to start');
        //     return;
        // }
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
};

export const removeOldInvitations = async (runForce = false) => {
    // eslint-disable-next-line no-negated-condition
    if (!runForce) {
        const random = Math.random();
        logger.log('going to start with random', random);
        if (random < 0.95 && random > 0.55) {
            logger.log('random is not enough to start');
            return;
        } else if (random < 0.5 && random > 0.25) {
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
        await bot.init(Boolean(process.env.HEADFULL));
        await bot.removeOldInvites();
    } catch (error) {
        logger.error('Error:', error);
    } finally {
        if (bot) {
            await bot.close();
        }
    }
};
