var express = require('express');
var router = express.Router();

// Containers
router.get('/', async (req, res) => {
    try {
      const graphResponse = await fetch('https://graph.microsoft.com/beta/storage/fileStorage/containers?$filter=containerTypeId eq ' + process.env.CONTAINER_TYPE_ID, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!graphResponse.ok) {
        throw new Error('Failed to fetch user profile from Microsoft Graph');
      }
  
      const userData = await graphResponse.json();
      res.render('containers', { value: userData.value });
      //res.json(userData);
      //console.log(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  router.get('/create', (req, res) => {
    res.render('container_create', {});
  });

  router.post('/create', async (req, res) => {
    // Extract data from the form submission
    const { displayName, description } = req.body;
    const containerTypeId = process.env.CONTAINER_TYPE_ID; // Ensure this is set in your .env file
  
    // Construct the request body
    const bodyData = {
      displayName: displayName,
      description: description,
      containerTypeId: containerTypeId
    };
  
    try {
      const graphResponse = await fetch('https://graph.microsoft.com/beta/storage/fileStorage/containers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`, // Ensure accessToken is available in session
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
  
      if (graphResponse.ok) {
        const responseData = await graphResponse.json();
        // Handle successful creation
        // You might want to redirect or send some success message
        res.redirect('/containers/');
      } else {
        // Handle errors
        console.error('Failed to create container:', await graphResponse.text());
        res.status(500).send('Failed to create container');
      }
    } catch (error) {
      console.error('Error creating container:', error);
      res.status(500).send('Error creating container');
    }
  });

  module.exports = router;




