const puter = require('@heyputer/puter.js');
const fs = require('fs');

async function test() {
    try {
        const response = await puter.ai.chat("Hello, how are you?", { model: 'claude-3-5-sonnet' });
        fs.writeFileSync('test_log.txt', "Success: " + JSON.stringify(response));
    } catch (error) {
        const errObj = {
            message: error.message,
            stack: error.stack,
            stringified: JSON.stringify(error, Object.getOwnPropertyNames(error))
        };
        fs.writeFileSync('test_log.txt', "Error: " + JSON.stringify(errObj, null, 2));
    }
}

test();
