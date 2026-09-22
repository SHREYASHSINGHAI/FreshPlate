const http = require('http');

const data = JSON.stringify({
  ingredients: [{ id: '1', name: 'chicken' }, { id: '2', name: 'rice' }],
  cuisine: 'Mexican',
  language: 'English',
  adults: 2,
  children: 0
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate-recipes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(`BODY: ${body.substring(0, 500)}...`));
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(data);
req.end();
