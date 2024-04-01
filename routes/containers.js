var express = require('express');
var router = express.Router();

// Simplified API fetch utility function
async function apiFetch(req, url, method = 'GET', body = null) {
    const headers = {
        'Authorization': `Bearer ${req.session.accessToken}`,
        'Content-Type': 'application/json',
    };

    if (body && method !== 'GET') {
        body = JSON.stringify(body);
    } else {
        body = undefined;
    }

    try {
        const response = await fetch(url, { method, headers, body });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed with status: ${response.status}, status text: ${response.statusText}, error: ${errorText}`);
        }
        return response.status === 204 ? {} : await response.json(); // Handle no-content response
    } catch (error) {
        console.error('API Fetch error:', error);
        throw error; // Rethrow to handle in the calling function
    }
}

// List Containers
router.get('/', async (req, res) => {
  const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers?$filter=containerTypeId eq ${process.env.CONTAINER_TYPE_ID}`;
  try {
    const userData = await apiFetch(req, url);
    res.render('containers', { value: userData.value });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

router.get('/create', (req, res) => {
  res.render('container_create', {});
});

router.post('/create', async (req, res) => {
  const { displayName, description } = req.body;
  const containerTypeId = process.env.CONTAINER_TYPE_ID;
  const url = 'https://graph.microsoft.com/beta/storage/fileStorage/containers';
  const bodyData = { displayName, description, containerTypeId };

  try {
    await apiFetch(req, url, 'POST', bodyData);
    res.redirect('/containers/');
  } catch (error) {
    res.status(500).send('Error creating container');
  }
});

module.exports = router;
