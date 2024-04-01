var express = require('express');
var router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function apiFetch(req, url, method = 'GET', body = null) {
    console.log(url);

    // Initialize headers with Authorization
    const headers = {
        'Authorization': `Bearer ${req.session.accessToken}`,
    };

    if (method === 'PUT' && body instanceof Buffer) {
        // For PUT requests with Buffer body, set Content-Type for binary data
        headers['Content-Type'] = 'application/octet-stream';
    } else if (method !== 'GET') {
        // For other non-GET requests with non-binary body, set Content-Type to 'application/json' and stringify the body
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    try {
        const options = { method, headers };
        if (body !== undefined && method !== 'GET') options.body = body;

        const response = await fetch(url, options);
        if (!response.ok) {
            // Attempt to read the response text for more detailed error info
            const errorText = await response.text();
            throw new Error(`API call failed with status: ${response.status}, status text: ${response.statusText}, error: ${errorText}`);
        }
        // Handle no-content response
        return response.status === 204 ? {} : await response.json();
    } catch (error) {
        console.error('API Fetch error:', error);
        throw error; // Rethrow to handle in the calling function
    }
}

// Route Handlers
router.get('/', (req, res) => {
    res.redirect('/containers/');
});

router.get('/list/:containerId/:folderId?', async (req, res) => {
    const { containerId, folderId = 'root' } = req.params;
    const url = `https://graph.microsoft.com/v1.0/drives/${containerId}/items/${folderId}/children?$expand=listItem($expand=fields)`;

    try {
        const data = await apiFetch(req, url);
        req.session.driveId = containerId;
        req.session.folderId = folderId;
        res.render('files_list', { items: data.value });
    } catch (error) {
        res.status(500).send('Error fetching files');
    }
});

router.get('/upload', (req, res) => {
    res.render('file_upload', { title: 'Upload File' });
});

router.post('/upload-file', upload.single('file'), async (req, res) => {
    if (!req.session.isAuthenticated || !req.session.accessToken) {
        return res.status(401).send('You are not authenticated');
    }

    if (!req.file || Object.keys(req.file).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let folderId = req.session.folderId && req.session.folderId.trim() !== "" ? req.session.folderId : 'root';
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${folderId}:/${encodeURIComponent(req.file.originalname)}:/content`;

    try {
        await apiFetch(req, url, 'PUT', req.file.buffer);
        res.redirect(`/files/list/${req.session.driveId}/${folderId !== 'root' ? folderId : ''}`);
    } catch (error) {
        res.status(500).send('Error uploading file');
    }
});

router.get('/preview/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}/preview`;

    try {
        const data = await apiFetch(req, url, 'POST');
        if (data.getUrl) {
            res.redirect(data.getUrl);
        } else {
            res.status(404).send('Preview URL not found in the response.');
        }
    } catch (error) {
        res.status(500).send('Failed to retrieve preview URL');
    }
});

router.get('/edit/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}/createLink`;

    try {
        const data = await apiFetch(req, url, 'POST', { type: "edit", scope: "organization" });
        if (data.link && data.link.webUrl) {
            res.redirect(data.link.webUrl);
        } else {
            res.status(404).send('Failed to obtain an edit link.');
        }
    } catch (error) {
        res.status(500).send('Error creating edit link');
    }
});

router.get('/delete/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}`;

    try {
        await apiFetch(req, url, 'DELETE');
        res.redirect('/files/list/' + req.session.driveId);
    } catch (error) {
        res.status(500).send('Error deleting file');
    }
});

// /files/perms route
router.get('/perms/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/permissions`;

    try {
        const permissions = await apiFetch(req, url);
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).send('Error fetching permissions');
    }
});

module.exports = router;
