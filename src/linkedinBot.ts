import fs, {readFileSync, writeFileSync} from 'fs';
import path from 'path';

import type {Browser, ElementHandle, Page} from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

import {CONFIG} from './config';
import type {Parameters} from './types';
import {delay, logger} from './utils';

// Add stealth plugin
puppeteer.use(stealthPlugin());
type SaveArgs = {
    parameters: Parameters;
    error: boolean;
    page: number;
};

type StatusArgs = {
    status: 'running' | 'stopped';
};

export class LinkedInBot {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private readonly userDataDir = path.join(process.cwd(), 'browser_data');
    private invitesGoal = 3;
    private sentInvites = 0;

    async openEmptyBrowser() {
        // Create directory if it doesn't exist
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, {recursive: true});
        }

        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            userDataDir: this.userDataDir,
            args: [
                '--start-maximized',
                '--disable-notifications',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

        this.page = await this.browser.newPage();
    }

    async init(forceHeadfull = false) {
        // Create directory if it doesn't exist
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, {recursive: true});
        }

        this.setLocation();

        const params = this.getParameters();

        const {status} = this.getStatus() || {};

        if (status === 'running') {
            this.saveParameters({
                error: true,
                page: params.page,
                parameters: params,
            });

            throw new Error('Another process in progress');
        }

        this.saveStatus({status: 'running'});

        this.browser = await puppeteer.launch({
            headless: !(Boolean(params.runsWithError) || forceHeadfull),
            defaultViewport: null,
            userDataDir: this.userDataDir,
            args: [
                '--start-maximized',
                '--disable-notifications',
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

        this.page = await this.browser.newPage();

        // Add random user agent
        await this.page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        );

        // Add additional page configurations
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
        });

        await this.page.goto('https://www.linkedin.com/login');
        const currentUrl = this.page.url();
        if (currentUrl.includes('/login')) {
            await this.login();
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    async searchPeople(page = 1) {
        logger.log('Running with page:', page);

        const searchParams = CONFIG.SEARCH_CRITERIA;

        if (!this.page) throw new Error('Browser not initialized');

        try {
            // Construct the search URL
            const searchUrl = 'https://www.linkedin.com/search/results/people/?';
            const params = new URLSearchParams();

            params.append('page', page.toString());

            if (searchParams.keywords) {
                params.append('keywords', searchParams.keywords);
            }

            if (searchParams.location) {
                // LinkedIn uses geoUrn for location filtering
                // Note: You might need to maintain a mapping of locations to their URNs
                const location = this.getLocation();
                params.append('geoUrn', `["${location.join('","')}"]`);
            }

            if (searchParams.network) {
                params.append('network', `["${searchParams.network.join('","')}"]`);
            }

            params.append('origin', 'FACETED_SEARCH');

            let paramsString = params.toString();
            paramsString = paramsString.replaceAll('%5B', '[');
            paramsString = paramsString.replaceAll('%5D', ']');

            // Navigate to the constructed search URL
            await this.page.goto(`${searchUrl}${paramsString}`);

            // Wait for results to load
            const resultContainer = await this.page.waitForSelector('.search-results-container');

            const list = (await resultContainer?.$$('li')) || [];

            logger.log('length', list.length);

            for (const li of list) {
                await this.pressEsc();
                await delay(1000, 'cycle for list');
                const buttons = (await li.$$('button.artdeco-button--secondary')) || [];

                let button;

                for (const b of buttons) {
                    const innerText = await b.evaluate((elem) => {
                        // eslint-disable-next-line no-console
                        console.log(elem);
                        return elem.innerText;
                    });
                    if (innerText.includes('Установить контакт')) {
                        button = b;
                        break;
                    }
                }

                if (button) {
                    await delay(3000, 'before click button');
                    try {
                        await this.sendInvite(button);
                    } catch (error) {
                        logger.log(error);
                    }
                }
            }

            logger.log('List is completed. Amout of sent invitation: ', this.sentInvites);
            if (list.length && this.sentInvites < this.invitesGoal) {
                logger.log('Run with page: ', page + 1);
                this.saveParameters({
                    page: page + 1,
                    error: false,
                    parameters: this.getParameters(),
                });
                await this.searchPeople(page + 1);
            }

            logger.log('People search completed successfully');
            this.saveStatus({status: 'stopped'});
            this.setLocation();
        } catch (error) {
            this.saveParameters({page: page, error: true, parameters: this.getParameters()});
            logger.error('People search failed:', error);
            throw error;
        }
    }

    async sendInvite(button: ElementHandle<HTMLButtonElement>) {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        await button.click();

        const container = await this.page.waitForSelector('div.send-invite');
        if (container) {
            await delay(1000, 'loading invite container');

            const emailInput = await this.page
                .waitForSelector('input[name="email"]', {
                    timeout: 1000,
                })
                .catch(() => null);

            // If email input exists, skip this invitation
            if (emailInput) {
                await this.pressEsc();
                return;
            }

            const withoutPersonalizationButton = await this.page.waitForSelector(
                'button.artdeco-button--primary',
            );
            // eslint-disable-next-line no-console
            await withoutPersonalizationButton?.evaluate((element) => console.log(element));
            await delay(3000, 'before send invite');
            if (withoutPersonalizationButton) {
                await withoutPersonalizationButton.click();
            }
        }

        this.sentInvites += 1;
    }

    async pressEsc() {
        if (!this.page) {
            throw new Error('Browser not initialized');
        }

        await delay(120, 'escape 1');
        await this.page.keyboard.press('Escape');
        await delay(120, 'escape 2');
        await this.page.keyboard.press('Escape');
        await delay(120, 'escape 3');
        await this.page.keyboard.press('Escape');
    }

    getParameters() {
        let parameters: Parameters = {runsWithError: 0};

        try {
            const configPath = path.join(process.cwd(), 'browser_data', 'config.data.json');
            const textData = readFileSync(configPath, 'utf-8');
            parameters = JSON.parse(textData);

            return {
                runsWithError: parameters.runsWithError || 0,
                page: parameters[this.getPropertyKey()] || 1,
            };
        } catch (error) {
            logger.log(error);
        }

        return parameters;
    }

    saveParameters({parameters, error, page}: SaveArgs) {
        try {
            const data: Parameters = {
                ...parameters,
            };
            if (error) {
                data.runsWithError = parameters.runsWithError + 1;
            } else {
                data.runsWithError = 0;
            }

            if (page) {
                data[this.getPropertyKey()] = page;
            }

            const configPath = path.join(process.cwd(), 'browser_data', 'config.data.json');
            writeFileSync(configPath, JSON.stringify(data, null, 3), 'utf-8');
            return data;
            // eslint-disable-next-line @typescript-eslint/no-shadow
        } catch (error: unknown) {
            logger.log(error);
        }
        return parameters;
    }

    saveStatus(args: StatusArgs) {
        try {
            const configPath = path.join(process.cwd(), 'browser_data', 'status.data.json');
            writeFileSync(configPath, JSON.stringify(args, null, 3), 'utf-8');
            return args;
        } catch (error) {
            logger.log(error);
        }
        return args;
    }

    getStatus() {
        try {
            const configPath = path.join(process.cwd(), 'browser_data', 'status.data.json');
            const textData = readFileSync(configPath, 'utf-8');
            return JSON.parse(textData) as StatusArgs;
        } catch (error) {
            logger.log(error);
        }

        return undefined;
    }

    async removeOldInvites(page = 1) {
        logger.log('Running deletion:. Page: ', page);

        if (!this.page) throw new Error('Browser not initialized');

        try {
            const searchUrl = 'https://www.linkedin.com/mynetwork/invitation-manager/sent/?';

            const params = new URLSearchParams();
            params.append('page', page.toString());
            await this.page.goto(`${searchUrl}${params.toString()}`);
            await delay(3000, 'before reading list');

            const resultContainer = await this.page.waitForSelector('.mn-invitation-list');

            const url = this.page.url();
            if (page !== 1 && !url.includes('page=')) {
                return;
            }

            const list = (await resultContainer?.$$('li.invitation-card')) || [];

            logger.log('length', list.length);

            for (let i = list.length - 1; i >= 0; i--) {
                const li = list[i];
                await this.pressEsc();
                await delay(100, 'cycle for list');
                const timeBadgeContainer = await li.$('span.time-badge');
                const timeBadgeText = await timeBadgeContainer?.evaluate((elem) => elem.innerText);
                logger.log('timeBadgeText', timeBadgeText);

                if (timeBadgeText && timeBadgeText.includes('мес. назад')) {
                    await this.deleteOldInviteFlow(li);
                    logger.log(timeBadgeText);
                }
            }

            // logger.log('People search completed successfully');
            await this.removeOldInvites(page + 1);
            this.saveStatus({status: 'stopped'});
        } catch (error) {
            logger.error('People search failed:', error);
            throw error;
        }
    }

    private async deleteOldInviteFlow(card: ElementHandle<HTMLLIElement>) {
        if (!this.page || !card) {
            throw new Error('Browser not initialized');
        }

        const button = await card.waitForSelector('button.invitation-card__action-btn');
        if (button) {
            await delay(2000, 'before reject invitation');
            await button.click();

            await delay(5000, 'before reject invitation');

            const modal = await this.page.waitForSelector('div.artdeco-modal');
            const confirmButton = await modal?.waitForSelector('button.artdeco-button--primary');
            await delay(1000, 'before reject invitation');

            await confirmButton?.click();
        }
    }

    private getPropertyKey() {
        const {keywords, network} = CONFIG.SEARCH_CRITERIA;
        const location = this.getLocation();
        return [keywords, network.join(','), location.join(',')].join('_');
    }

    private async login() {
        if (!this.page) throw new Error('Browser not initialized');

        try {
            await this.page.waitForSelector('#username');

            await this.page.type('#username', CONFIG.LINKEDIN_EMAIL, {delay: 200});
            await this.page.type('#password', CONFIG.LINKEDIN_PASSWORD, {delay: 200});

            await this.page.click('[type="submit"]');

            await this.page.waitForNavigation();

            const profileButton = await this.page.waitForSelector(
                '[data-control-name="nav.settings_view_profile"]',
                {timeout: 5000},
            );
            if (!profileButton) throw new Error('Login failed');

            logger.log('Successfully logged in to LinkedIn');
        } catch (error) {
            logger.error('Login failed:', error);
            throw error;
        }
    }

    private setLocation() {
        const location = CONFIG.SEARCH_CRITERIA.location.filter(() => Math.random() > 0.8);
        const configPath = path.join(process.cwd(), 'browser_data', 'config.location.json');
        writeFileSync(configPath, JSON.stringify(location, null, 3), 'utf-8');
    }

    private getLocation() {
        try {
            const configPath = path.join(process.cwd(), 'browser_data', 'config.location.json');
            const dataText = readFileSync(configPath, 'utf-8');
            return JSON.parse(dataText);
        } catch (error) {
            logger.error(error);
            return CONFIG.SEARCH_CRITERIA.location[0];
        }
    }
}
