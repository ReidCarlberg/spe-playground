const express = require('express');
const router = express.Router();

const apiFetch = require('./common');  // Ensure this points to your common.js file correctly

function printObject(obj, indent = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        console.log(`${indent}${key}: `);
        printObject(value, indent + '  '); // Recursive call with increased indentation
      } else {
        console.log(`${indent}${key}: ${value}`);
      }
    }
}

router.get('/', (req, res) => {
    // Include username in the rendering context
    res.render('search', { username: req.session.username });
});

router.post('/search', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend
  
  const url = `https://graph.microsoft.com/v1.0/search/query`;

  const body = {
      requests: [
          {
              entityTypes: ["driveItem"],
              query: {
                  queryString: `'${searchQuery}' AND ContainerTypeId:${process.env.CONTAINER_TYPE_ID}`
              },
              sharePointOneDriveOptions: {
                includeHiddenContent: true
              }
          },
      ],
  };

  try {
      const response = await apiFetch(req, url, 'POST', body);
      const searchResults = response.value; // Adjust based on the actual structure of the response
      console.log(searchResults);
      printObject(searchResults); // Assuming `printObject` is defined somewhere or replace with appropriate logic
      // Adjust rendering or JSON response based on your application needs
      res.render('search_results', { query: searchQuery, results: searchResults, orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});

router.get('/searchSample', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend


  const url = `https://graph.microsoft.com/beta/search/query`;

  const body = {
      requests: [
          {
              entityTypes: ["driveItem"],
              query: {
                  queryString: `ContainerTypeId:${process.env.CONTAINER_TYPE_ID} AND Reid3 eq 'reid3evergreen'`
              },
              sharePointOneDriveOptions: {
                includeHiddenContent: true
              }
          },
      ],
  };

  try {
      const response = await apiFetch(req, url, 'POST', body); 

      const searchResults = response.value; // Adjust based on the actual structure of the response
      console.log(searchResults);
      printObject(searchResults); // Assuming `printObject` is defined somewhere or replace with appropriate logic
      // Adjust rendering or JSON response based on your application needs
      res.render('search_results', { query: searchQuery, results: searchResults,  orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});

router.get('/searchDrives', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend


  const url = `https://graph.microsoft.com/beta/search/query`;

  const body = {
      requests: [
          {
              entityTypes: ["drive"],
              query: {
                  queryString: `ContainerTypeId:${process.env.CONTAINER_TYPE_ID} AND 'prod'`
              },
              sharePointOneDriveOptions: {
                includeHiddenContent: true
              }
          },
      ],
  };

  try {
      const response = await apiFetch(req, url, 'POST', body); 

      const searchResults = response.value; // Adjust based on the actual structure of the response
      console.log(searchResults);
      printObject(searchResults); // Assuming `printObject` is defined somewhere or replace with appropriate logic
      // Adjust rendering or JSON response based on your application needs
      res.render('search_results', { query: searchQuery, results: searchResults,  orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});




module.exports = router;
