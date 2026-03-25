const axios = require('axios');

const apiKey = "A8DcCOWGvAcUuF8HX0nvWOmijlXs2stOV13fbXGFJei7LbojDQ2GPF3uVZmQ";
const phone = "7989938837"; // A test number

const testFast2SMS = async () => {
    console.log("Testing Fast2SMS after security update...");
    try {
        const response = await axios({
            method: 'POST',
            url: 'https://www.fast2sms.com/dev/bulkV2',
            headers: {
                authorization: apiKey,
                'Content-Type': 'application/json',
            },
            data: {
                route: 'otp',
                variables_values: '123456',
                numbers: phone,
            }
        });
        console.log('API Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('API Error:', JSON.stringify(error.response?.data || error.message, null, 2));
    }
};

testFast2SMS();
