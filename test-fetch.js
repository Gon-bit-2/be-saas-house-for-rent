const http = require('http');

http.get('http://localhost:1174/marketplace/rooms', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    try {
      const json = JSON.parse(data);
      console.log('Data:', JSON.stringify(json, null, 2).slice(0, 1000) + '...');
    } catch (e) {
      console.log('Raw:', data.slice(0, 1000));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
