var express = require('express');
var router = express.Router();

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
            // Handle the successful response here. For example, send the data to the client:
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



module.exports = router;