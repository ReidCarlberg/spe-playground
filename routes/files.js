var express = require('express');
var router = express.Router();

// Configure multer for in-memory storage
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/', (req, res) => {
    res.redirect('/containers/');
});

// Route for getting a specific file/container list by ID
router.get('/list/:containerId/:folderId?', async (req, res) => {
    const { containerId, folderId = 'root' } = req.params; // Use 'root' if folderId is not provided
    const accessToken = req.session.accessToken; // Make sure this is set correctly
    const url = `https://graph.microsoft.com/v1.0/drives/${containerId}/items/${folderId}/children?$expand=listItem($expand=fields)`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            req.session.driveId = containerId;
            req.session.folderId = folderId;
            res.render('files_list', { items: data.value });
        } else {
            // Handle errors, such as by logging them and sending an error response:
            console.error('Failed to fetch files:', await response.text());
            res.status(response.status).send('Failed to fetch files');
        }
    } catch (error) {
        console.error('Error fetching files:', error);
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

    console.log(req.file);

    if (!req.file || Object.keys(req.file).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const fileToUpload = req.file;
    const fileName = encodeURIComponent(fileToUpload.originalname);
    const fileType = fileToUpload.mimetype;
    const fileContent = fileToUpload.buffer; // This should be a buffer

    // Determine the upload path based on session.folderId or use 'root'
    let folderId = req.session.folderId && req.session.folderId.trim() !== "" ? req.session.folderId : 'root';
    //const uploadPath = `https://graph.microsoft.com/v1.0/drives/${req.session.drive_id}/items/${folderId}/children/${fileName}:/content`;
    const uploadPath = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${folderId}:/${fileName}:/content`;

    console.log(uploadPath);

    try {
        const graphResponse = await fetch(uploadPath, {
            method: 'PUT',
            body: fileContent, // Directly send the file content as the body of the request
            headers: {
                'Authorization': `Bearer ${req.session.accessToken}`,
                'Content-Type': 'application/octet-stream',
            },
        });

        if (!graphResponse.ok) {
            throw new Error(`Failed to upload file: ${graphResponse.status} ${graphResponse.statusText} `);
        }

        // Redirect to the list view with appropriate containerId and folderId
        // Use 'root' if folderId is not specifically set in the session
        folderId = folderId !== 'root' ? `/${folderId}` : '';
        res.redirect(`/files/list/${req.session.driveId}${folderId}`);
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;



module.exports = router;