
const envRegex = /^PORT\s*=\s*(\d{4,5})/m;
const springPropertyRegex = /^server\.port\s*=\s*(\d{4,5})/m;
const springYmlRegex = /^\s*port\s*:\s*(\d{4,5})/m;

const testCases = [
    { name: 'ENV PORT=80', regex: envRegex, text: 'PORT=80', expected: null },
    { name: 'ENV PORT=3000', regex: envRegex, text: 'PORT=3000', expected: '3000' },
    { name: 'Spring Port 80', regex: springPropertyRegex, text: 'server.port=80', expected: null },
    { name: 'Spring Port 8080', regex: springPropertyRegex, text: 'server.port=8080', expected: '8080' },
    { name: 'YML Port 80', regex: springYmlRegex, text: '  port: 80', expected: null },
    { name: 'YML Port 8080', regex: springYmlRegex, text: '  port: 8080', expected: '8080' },
];

testCases.forEach(tc => {
    const match = tc.text.match(tc.regex);
    const result = match ? match[1] : null;
    console.log(`${tc.name}: ${result === tc.expected ? 'PASS' : 'FAIL'} (Got: ${result})`);
});
