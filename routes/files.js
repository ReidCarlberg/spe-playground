var express = require('express');
var router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fs = require('fs');

const apiFetch = require('./common');  

router.get('/', (req, res) => {
    res.redirect('/containers/');
});

router.get('/list/:containerId/:folderId?', async (req, res) => {
    console.log("username: ", req.session.username);
    const { containerId, folderId = 'root' } = req.params;
    const url = `https://graph.microsoft.com/v1.0/drives/${containerId}/items/${folderId}/children?$expand=listItem($expand=fields)`;
    try {
        const data = await apiFetch(req, url);
        req.session.driveId=containerId;
        req.session.folderId=folderId;
        res.render('files_list', { items: data.value, orig_url: url, orig_results: data.value });
    } catch (error) {
        res.status(500).send('Error fetching files');
    }
});

router.get('/upload', (req, res) => {
    res.render('file_upload', { title: 'Upload File' });
});

router.post('/upload-file', upload.single('file'), async (req, res) => {

    if (!req.file || Object.keys(req.file).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let folderId = req.session.folderId && req.session.folderId.trim() !== "" ? req.session.folderId : 'root';
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${folderId}:/${encodeURIComponent(req.file.originalname)}:/content`;

    try {
        result = await apiFetch(req, url, 'PUT', req.file.buffer);
        //res.redirect(`/files/list/${req.session.driveId}/${folderId !== 'root' ? folderId : ''}`);

        res.render('success', {message: 'Uploaded', 
            continueUrl: `/files/list/${req.session.driveId}/${folderId !== 'root' ? folderId : ''}`,
            orig_url: url,
            orig_results: result
        });

    } catch (error) {
        res.status(500).send('Error uploading file');
    }
});

router.get('/upload-session', (req, res) => {
    res.render('file_upload_session', { title: 'Upload File' });
});

async function uploadFileInChunks(fileBuffer, uploadUrl, fileSize) {
    const chunkSize = 1024 * 1024 * 10; // 10 MB; adjust this based on your needs
    let start = 0;

    while (start < fileSize) {
        const end = Math.min(start + chunkSize, fileSize) - 1;
        const contentLength = end - start + 1;
        const chunk = fileBuffer.slice(start, end + 1);  // Slice the buffer to get the chunk

        const headers = {
            'Content-Length': contentLength,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`
        };

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: headers,
            body: chunk  // Use the buffer chunk directly
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
        }

        start += contentLength;
    }

    console.log('Upload completed successfully.');
}

router.post('/create-upload-session', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const driveId = req.session.driveId;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const fileBuffer = req.file.buffer;  // The buffer containing the file data

    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/root:/${fileName}:/createUploadSession`;
    const body = {
        "item": {
            "@microsoft.graph.conflictBehavior": "rename",
            "name": fileName
        }
    };

    try {
        const sessionResponse = await apiFetch(req, url, 'POST', body);
        if (sessionResponse.uploadUrl) {
            await uploadFileInChunks(fileBuffer, sessionResponse.uploadUrl, fileSize);
            res.render('success', {message: 'File Uploaded Successfully', orig_url: url, orig_body: body, orig_results: sessionResponse, continueUrl: '/files/list/' + driveId, orig_req_id: req.session.ORIG_REQ_ID});
        } else {
            throw new Error('Upload URL not found');
        }
    } catch (error) {
        console.error('Failed to upload file:', error);
        res.status(500).send("Failed to upload file");
    }
});


router.get('/create-new', async (req, res) => {
    res.render('file_create_new');
});

router.post('/create-new', async (req, res) => {
    if (!req.body.fileName) {
        return res.status(400).send('File name is required.');
    }

    const fileName = req.body.fileName;
    let folderId = req.session.folderId && req.session.folderId.trim() !== "" ? req.session.folderId : 'root';

    // Construct the URL for creating a new file in the specified folder
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${folderId}:/${encodeURIComponent(fileName)}:/content`;

    try {
        // Use apiFetch to create the file with null content (empty file)
        const result = await apiFetch(req, url, 'PUT', Buffer.from(''));
        
        // Using result.webUrl as the continueUrl
        res.render('success', {
            message: 'File created successfully',
            continueUrl: result.webUrl,  // This URL is the link to the created file
            orig_url: url,
            orig_results: result
        });
    } catch (error) {
        console.error('Error creating file:', error);
        res.status(500).send('Error creating file');
    }
});


router.get('/preview/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}/preview`;

    try {
        const data = await apiFetch(req, url, 'POST');
        if (data.getUrl) {
            res.redirect(data.getUrl + "&nb=true");
        } else {
            res.status(404).send('Preview URL not found in the response.');
        }
    } catch (error) {
        res.status(500).send('Failed to retrieve preview URL');
    }
});

router.get('/versions/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}/versions`;

    try {
        const data = await apiFetch(req, url);
        res.json(data);
    } catch (error) {
        res.status(500).send('Failed to retrieve preview URL');
    }
});

router.get('/pdf/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${req.params.itemId}/content?format=pdf`;

    try {
        const pdfBuffer = await apiFetch(req, url); // Get the PDF content as a Buffer
        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        res.send(pdfBuffer); // Send the Buffer directly to the client
    } catch (error) {
        console.log('Error fetching PDF content:', error);
        res.status(500).send('Failed to retrieve PDF content');
    }
});



router.get('/preview/:driveId/:itemId', async (req, res) => {
    const url = `https://graph.microsoft.com/v1.0/drives/${req.params.driveId}/items/${req.params.itemId}/preview`;

    try {
        const data = await apiFetch(req, url, 'POST');
        if (data.getUrl) {
            res.redirect(data.getUrl + "&nb=true");
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

router.get('/perms/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${fileId}/permissions`;

    try {
        const permissions = await apiFetch(req, url);
        res.json({ permissions: permissions });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).send('Error fetching permissions');
    }
});

router.get('/grant-invite/:fileId', (req, res) => {
    if (!req.session.driveId) {
        return res.status(400).send("Drive ID is missing in session.");
    }

    res.render('grant-invite', {
        fileId: req.params.fileId,
        driveId: req.session.driveId,
        email: '',
        username: req.session.username
    });
});

router.post('/grant-invite', async (req, res) => {
    const { fileId, driveId, email } = req.body;

    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/invite`;

    const body = {
        "requireSignIn": true,
        "sendInvitation": false,
        "roles": ["write"],
        "recipients": [{ "email": email }],
        "message": null
    };

    try {
        const response = await apiFetch(req, url, 'POST', body);
        res.json({ success: true, link: response.link, message: "Sharing link created successfully." });
    } catch (error) {
        console.error('Error creating sharing link:', error);
        res.status(500).send("Failed to create sharing link");
    }
});

router.get('/create-link/:fileId', (req, res) => {
    const { fileId } = req.params;
    res.render('create-link-form', {
        fileId: fileId,
        username: req.session.username
    });
});

router.post('/link/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { type, scope } = req.body;
    const driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/createLink`;

    const body = {
        type: type,  // "view" or "edit"
        scope: scope // "organization", "anonymous", or "users"
    };

    try {
        const response = await apiFetch(req, url, 'POST', body);
        // Assuming you want to show some results page or redirect to a success page
        res.render('link-created', { link: response.link, message: "Sharing link created successfully.", orig_url: url, orig_body: body, orig_results: response });
    } catch (error) {
        console.error('Error creating sharing link:', error);
        res.status(500).send("Failed to create sharing link");
    }
});


router.get('/link/:fileId', async (req, res) => {
    const { fileId } = req.params;
    driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/createLink`;

    /*
        type = view or edit
        scope = organization, anonymous, users
    */
    const body = {
        "type": "view",
        "scope": "organization"
    }

    try {
        const response = await apiFetch(req, url, 'POST', body);
        res.json({ success: true, link: response.link, message: "Sharing link created successfully.", username: req.session.username });
    } catch (error) {
        console.error('Error creating sharing link:', error);
        res.status(500).send("Failed to create sharing link");
    }    

});

router.get('/fields/:fileId', async (req, res) => {
    const { fileId } = req.params;
    driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/listitem/fields`;

    try {
        const response = await apiFetch(req, url);
        res.render('file_list_fields', { data: response, containerId: driveId, fileId: fileId });
        //res.json({ response });
    } catch (error) {
        console.error('Error creating sharing link:', error);
        res.status(500).send("Failed to create sharing link");
    }    

});

router.get('/fields/edit/:fileId', async (req, res) => {
    const fileId = req.params.fileId;
    const containerId = req.session.driveId;

    // Construct the URL for the Microsoft Graph API to fetch container columns
    const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers/${containerId}/columns`;

    try {
        // Perform the API fetch to get the container columns
        const columnsData = await apiFetch(req, url);

        // Render the edit_fields view with the fetched columns data
        res.render('file_edit_fields', {
            fields: columnsData.value,  // Assuming the response structure contains an array of columns in a 'value' property
            containerId: containerId,
            fileId: fileId
        });
    } catch (error) {
        console.error('Failed to fetch container columns:', error);
        // Render the error message on the same view or a dedicated error view
        res.render('file_edit_fields', {
            message: `Error fetching container columns: ${error.message}`,
            fields: []
        });
    }
});

router.post('/fields/update/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const { fieldName, fieldValue } = req.body;
    const driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/listitem/fields`;

    const body = {
        [fieldName]: fieldValue
    };

    try {
        const response = await apiFetch(req, url, 'PATCH', body);
        res.render('success', { message: 'Update successfull for ' + fieldName, orig_url: url, orig_body: body, orig_results: response, continueUrl: '/files/fields/' + fileId});
        //res.redirect('/fields/edit/' + fileId + '?success=true'); // Redirect back to the form with a success message
    } catch (error) {
        console.error('Error updating fields:', error);
        res.status(500).send("Failed to update fields");
    }    
});

router.get('/fields/setreid/:fileId', async (req, res) => {
    const { fileId } = req.params;
    driveId = req.session.driveId;
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/listitem/fields`;

    body = {
        "Reid1": "setReid1",
        "Reid2": "set Reid 2",
        "Reid3": "reid3evergreen"
    }

    try {
        const response = await apiFetch(req, url, 'PATCH', body);
        res.json({ success: true, data: response });
    } catch (error) {
        console.error('Error creating sharing link:', error);
        res.status(500).send("Failed to create sharing link");
    }    

});

router.get('/create-folder', (req, res) => {
    res.render('files_create_folder'); // Render the Jade template
});

router.post('/create-folder', async (req, res) => {
    const { folderName } = req.body; // Get the folder name from the form
    const driveId = req.session.driveId;
    parentItemId = req.session.folderId;

    if (!parentItemId) {
        parentItemId = 'root'; // If no parent folder is specified, create the folder in the root
    }
    // Construct the API URL
    const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentItemId}/children`;

    console.log('Creating folder:', url);

    // Construct the body of the POST request
    const body = {
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename"
    };

    try {
        // Make the POST request to the Microsoft Graph API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.session.accessToken}` // Assuming the access token is stored in session
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        console.log('Create folder result:', result);

        if (!response.ok) {
            throw new Error(result.error.message || 'Error creating folder');
        }

        // Redirect to the success page
        res.render('success', {
            orig_url: url,
            orig_body: body,
            orig_results: result,
            continueUrl: `/files/list/${driveId}`
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).send('Failed to create folder');
    }
});

router.get('/upload-multiple', (req, res) => {
    res.render('files_upload_multiple', { title: 'Upload Multiple Files' });
});

router.post('/upload-multiple-files', upload.array('files'), async (req, res) => {
    // Ensure files are present in the request
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let folderId = req.session.folderId && req.session.folderId.trim() !== "" ? req.session.folderId : 'root';

    try {
        // Loop through each file and upload them individually
        const uploadPromises = req.files.map(async (file) => {
            const url = `https://graph.microsoft.com/v1.0/drives/${req.session.driveId}/items/${folderId}:/${encodeURIComponent(file.originalname)}:/content`;
            return await apiFetch(req, url, 'PUT', file.buffer);
        });

        // Wait for all file uploads to complete
        const results = await Promise.all(uploadPromises);

        res.render('success', { 
            message: 'Files uploaded successfully', 
            continueUrl: `/files/list/${req.session.driveId}/${folderId !== 'root' ? folderId : ''}`,
            orig_results: results 
        });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).send('Error uploading files');
    }
});


module.exports = router;
