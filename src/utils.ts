/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
export const delay = (ms: number, comment?: string): Promise<void> => {
    console.log('Delay for:', ms, comment);
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const logger = {
    log: (...args: any) => {
        console.log(new Date().toLocaleString(), ...args);
    },
    error: (...args: any) => {
        console.error(new Date().toLocaleString(), ...args);
    },
};
