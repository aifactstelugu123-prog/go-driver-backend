const axios = require('axios');

async function testLiveApi() {
    try {
        console.log('Testing Live API: https://go-driver-backend-1.onrender.com/api/auth/send-otp');
        const { data } = await axios.post('https://go-driver-backend-1.onrender.com/api/auth/send-otp', {
            email: 'aifactstelugu123@gmail.com'
        });
        console.log('✅ Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('❌ API Error:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testLiveApi();
