import dotenv from 'dotenv';
import cron from 'node-cron';
import { removeOldInvitations, search } from './indexFunctions';
import { logger } from './utils';

dotenv.config();
cron.schedule('*/5 * * * *', () => {
    logger.log('Running bot task...');
    search();
});

cron.schedule('0 */3 1,15 * *', () => {
    logger.log('Running invitation cleanup...');
    removeOldInvitations();
});

