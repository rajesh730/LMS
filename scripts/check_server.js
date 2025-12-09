const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'HEAD',
    timeout: 2000
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    process.exit(0);
});

req.on('error', (e) => {
    console.error(`PROBLEM: ${e.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.error('TIMEOUT');
    req.destroy();
    process.exit(1);
});

req.end();
