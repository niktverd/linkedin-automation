export default defineConfig({
    expect: {
        timeout: 60000,
    },
    use: {
        actionTimeout: 60000,
        navigationTimeout: 60000,
    },
});
