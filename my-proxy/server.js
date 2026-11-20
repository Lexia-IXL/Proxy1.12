const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = 3000;

// Helper function to encode/decode URLs for the path structure
// This mimics the /7f5m14/... style if you want, but we'll keep it simple with query params for now
function encodePath(url) {
    return Buffer.from(url).toString('base64url');
}

function decodePath(encoded) {
    return Buffer.from(encoded, 'base64url').toString('utf8');
}

app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="background:black; color:white; font-family:sans-serif; text-align:center; padding-top:50px;">
                <h1>My Proxy</h1>
                <input type="text" id="urlInput" placeholder="Enter URL (e.g., https://youtube.com)" style="padding:10px; width:300px;">
                <button onclick="loadSite()" style="padding:10px;">Go</button>
                <iframe id="proxyFrame" src="" style="width:100%; height:80vh; border:none; margin-top:20px;"></iframe>
                
                <script>
                    function loadSite() {
                        const url = document.getElementById('urlInput').value;
                        if(!url) return;
                        // Encode the URL to pass it securely
                        const encoded = encodeURIComponent(encodePath(url));
                        window.location.href = '/proxy/' + encoded;
                    }
                </script>
            </body>
        </html>
    `);
});

app.get('/proxy/:encodedUrl', async (req, res) => {
    let targetUrl = decodePath(req.params.encodedUrl);
    
    // Ensure protocol
    if (!targetUrl.startsWith('http')) {
        targetUrl = 'https://'
