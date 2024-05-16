const express = require('express');
const router = express.Router();

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

// Function to perform search using Microsoft Graph API
async function performSearch(query, accessToken) {
    const url = `https://graph.microsoft.com/v1.0/search/query`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  
    const body = {
      requests: [
        {
          entityTypes: ["driveItem"],
          query: {
            queryString: `${query} AND ContainerTypeId:${process.env.CONTAINER_TYPE_ID}`
          },
        },
      ],
    };
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        console.log(response.statusText);
        throw new Error(`Graph API call failed with status: ${response.status}, status text: ${response.statusText}`);
      }
  
      const data = await response.json();
      return data.value; // Adjust based on the actual structure of the response
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
}

router.get('/', (req, res) => {
    // Include username in the rendering context
    res.render('search', { username: req.session.username });
});

router.post('/search', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend
  
  if (!searchQuery) {
      return res.status(400).send('Search query is required.');
  }

  if (!req.session || !req.session.accessToken) {
      return res.status(401).send('You are not authenticated.');
  }

  const url = `https://graph.microsoft.com/v1.0/search/query`;
  const headers = {
      'Authorization': `Bearer ${req.session.accessToken}`,
      'Content-Type': 'application/json',
  };
  const body = {
      requests: [
          {
              entityTypes: ["driveItem"],
              query: {
                  queryString: `${searchQuery} AND ContainerTypeId:${process.env.CONTAINER_TYPE_ID}`
              },
          },
      ],
  };

  try {
      const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body),
      });

      if (!response.ok) {
          console.log(response.statusText);
          throw new Error(`Graph API call failed with status: ${response.status}, status text: ${response.statusText}`);
      }

      const data = await response.json();
      const searchResults = data.value; // Adjust based on the actual structure of the response
      console.log(searchResults);
      printObject(searchResults); // Assuming `printObject` is defined somewhere or replace with appropriate logic
      // Adjust rendering or JSON response based on your application needs
      res.render('search_results', { query: searchQuery, results: searchResults, username: req.session.username, orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});

module.exports = router;
