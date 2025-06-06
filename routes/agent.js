const express = require('express');
const router = express.Router();
const apiFetch = require('./common'); // Use your existing API fetch helper

// GET route to render the form
router.get('/', async (req, res) => {
    try {
        // Fetch containers to populate the dropdown with required containerTypeId filter
        const url = `https://graph.microsoft.com/v1.0/storage/fileStorage/containers?$select=id,displayName,description,containerTypeId,createdDateTime&$filter=containerTypeId eq ${process.env.CONTAINER_TYPE_ID}`;
        const containerData = await apiFetch(req, url);
        //console.log(containerData); 
        res.render('agent_form', { containers: containerData.value });
    } catch (error) {
        console.error('Error fetching containers:', error);
        res.status(500).send('Error loading form');
    }
});

// POST route to execute the query
router.post('/query', async (req, res) => {
    const { queryString, containerId } = req.body;
    
    try {
        // Fetch the container properties to get the webUrl
        const containerUrl = `https://graph.microsoft.com/v1.0/storage/fileStorage/containers/${containerId}/drive`;
        const containerDetails = await apiFetch(req, containerUrl);
        const webUrl = containerDetails.webUrl;
        if (!webUrl) throw new Error('Web URL not found for container');

        const filterExpression = `(path:\"${webUrl}\")`;
        
        const requestBody = {
            queryString,
            filterExpression,
            resourceMetadata: ["FileExtension"],
            maximumNumberOfResults: 10
        };

        const url = 'https://graph.microsoft.com/beta/copilot/retrieval';
        const results = await apiFetch(req, url, 'POST', requestBody);
        res.render('agent_results', { results: JSON.stringify(results, null, 2) });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).send('Error executing query');
    }
});

module.exports = router;
