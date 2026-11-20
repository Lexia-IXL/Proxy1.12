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
        targetUrl = 'https://' + targetUrl;
    }

    try {
        // Fetch the original page
        const html = await axios.get(targetUrl);
        let content = html.data;

        // Use Cheerio to parse and rewrite links
        const $ = cheerio.load(content);

        // Rewrite all relative links to point back to this proxy
        $('a[href]').each((i, elem) => {
            let href = $(elem).attr('href');
            if (!href.startsWith('http')) {
                // If it's a relative link, resolve it against the base URL
                href = new URL(href, targetUrl).href;
            }
            // Rewrite to point to our proxy
            $(elem).attr('href', `/proxy/${encodePath(href)}`);
        });

        // Rewrite images
        $('img[src]').each((i, elem) => {
            let src = $(elem).attr('src');
            if (!src.startsWith('http')) {
                src = new URL(src, targetUrl).href;
            }
            $(elem).attr('src', `/proxy/${encodePath(src)}`);
        });

        // Rewrite scripts and stylesheets similarly
        $('script[src]').each((i, elem) => {
            let src = $(elem).attr('src');
            if (!src.startsWith('http')) src = new URL(src, targetUrl).href;
            $(elem).attr('src', `/proxy/${encodePath(src)}`);
        });

        $('link[rel="stylesheet"]').each((i, elem) => {
            let href = $(elem).attr('href');
            if (!href.startsWith('http')) href = new URL(href, targetUrl).href;
            $(elem).attr('href', `/proxy/${encodePath(href)}`);
        });

        res.send(content);
    } catch (error) {
        res.status(500).send(`Error fetching ${targetUrl}: ${error.message}`);
    }
});

// Handle the actual content retrieval for rewritten links
app.get('/content/:encodedUrl', async (req, res) => {
    const targetUrl = decodePath(req.params.encodedUrl);
    try {
        const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
        res.set({
            'Content-Type': response.headers['content-type'] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=3600'
        });
        res.send(response.data);
    } catch (error) {
        res.status(500).send('Failed to fetch resource');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy running at http://localhost:${PORT}`);
});
