const express = require('express');
const router = express.Router();

const apiFetch = require('./common');  // Ensure this points to your common.js file correctly



router.get('/list/:containerId', async (req, res) => {
    const containerId = req.params.containerId;
    const message = req.session.message;  // Retrieve message from session
    req.session.message = null;  // Clear the message from session after displaying it
    req.session.driveId = containerId;

    // Construct the URL for the Microsoft Graph API
    const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers/${containerId}/columns`;

    try {
        // Perform the API fetch to get the container columns
        const columnsData = await apiFetch(req, url);

        // Render the container_metadata view with the fetched columns data
        res.render('metadata_container', { 
            message: message,
            columns: columnsData.value,
            orig_url: url,
            orig_results: columnsData.value // Assuming the response structure contains an array of columns in a 'value' property
        });
    } catch (error) {
        console.error('Failed to fetch container columns:', error);
        // Render the error message on the same view or a dedicated error view
        res.render('metadata_container', { 
            message: `Error fetching container columns: ${error.message}`,
            columns: []
        });
    }
});

router.get('/new_column', async(req, res) => {
    res.render('metadata_container_add');
})

router.post('/submit_new_column', async (req, res) => {
    // Extract containerId from session
    const containerId = req.session.driveId;

    // Construct the POST URL using the containerId
    const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers/${containerId}/columns`;

    // Create the payload from the form data
    const formData = {
        description: req.body.description,
        enforceUniqueValues: 'false',
        hidden: req.body.hidden === 'true',
        indexed: req.body.indexed === 'true',
        name: req.body.name,
        displayName: req.body.displayName,
        text: {
            allowMultipleLines: req.body['text[allowMultipleLines]'] === 'true',
            maxLength: parseInt(req.body['text[maxLength]'])
        }
    };

    try {
        // Use apiFetch to send the POST request
        const result = await apiFetch(req, url, 'POST', formData);
        
        req.session.message = "Column Added";
        // Redirect or render a success message
        res.redirect('/metadata/list/' + containerId);  // Change this to where you want users to go after success
    } catch (error) {
        console.error('Failed to submit new metadata column:', error);
        // Handle errors by rendering or redirecting to an error page
        res.render('error', { error: error.message });
    }
});

module.exports = router;
