const express = require('express');
const router = express.Router();

const apiFetch = require('./common');  

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
    const { searchQuery, searchType, searchMode } = req.body;  // Include searchMode in the destructuring

    let entityTypes = [];
    switch (searchType) {
        case 'Drive':
            entityTypes = ['drive'];
            break;
        case 'DriveItem':
            entityTypes = ['driveItem'];
            break;
        case 'Drive+DriveItem':
            entityTypes = ['drive', 'driveItem'];
            break;
        default:
            entityTypes = ['driveItem'];  // Default to 'driveItem'
    }

    // Determine the appropriate queryString based on searchMode
    let queryString;
    if (searchMode === 'exact') {
        // For exact matches, use the query as-is, without quotes
        queryString = `${searchQuery}`;
    } else {
        // For search terms, enclose the searchQuery in single quotes for fuzzy/term search
        queryString = `'${searchQuery}' AND ContainerTypeId:${process.env.CONTAINER_TYPE_ID}`;
    }

    const url = `https://graph.microsoft.com/v1.0/search/query`;
    const body = {
        requests: [
            {
                entityTypes: entityTypes,
                query: {
                    queryString: queryString
                },
                sharePointOneDriveOptions: {
                  includeHiddenContent: true
                },
                //fields: ["id", "name", "parentReference", "file", "folder", "webUrl", "createdDateTime", "lastModifiedDateTime", "size", "fileSystemInfo", "createdBy", "lastModifiedBy", "fileSystemInfo", "fileSystemInfo"]   
            },
        ],
    };

    try {
        const response = await apiFetch(req, url, 'POST', body);
        console.log(JSON.stringify(response));
        const searchResults = response.value; // Assuming the response structure includes a 'value' property
        res.render('search_results', {
            searchType: searchType,
            query: searchQuery,
            results: searchResults,
            orig_url: url,
            orig_body: body,
            orig_results: searchResults,
            orig_req_id: req.session.ORIG_REQ_ID,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).send('An error occurred while processing your search query.');
    }
});



router.get('/searchSample', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend


  const url = `https://graph.microsoft.com/v1.0/search/query`;

  const body = {
      requests: [
          {
              entityTypes: ["driveItem"],
              query: {
                  queryString: `ContainerTypeId:${process.env.CONTAINER_TYPE_ID} AND Reid3OWSTEXT:'reid3evergreen'`
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
       res.render('search_results', { query: searchQuery, results: searchResults,  orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});

router.get('/searchDrives', async (req, res) => {
  const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend

  //console.log(JSON.stringify(res.getHeaders()));

  const url = `https://graph.microsoft.com/v1.0/search/query`;

  const body = {
      requests: [
          {
              entityTypes: ["drive"],
              query: {
                  queryString: "CustomProp1OWSTEXT:prop1"
              },
              "sharePointOneDriveOptions": {
                "includeHiddenContent": true
              }
          },
      ],
  };

  try {
      const response = await apiFetch(req, url, 'POST', body); 

      const searchResults = response.value; // Adjust based on the actual structure of the response
      //console.log(JSON.stringify(response));
      //printObject(searchResults); // Assuming `printObject` is defined somewhere or replace with appropriate logic
      // Adjust rendering or JSON response based on your application needs
      res.render('search_results', { query: searchQuery, results: searchResults,  orig_url: url, orig_body: body, orig_results: searchResults });
  } catch (error) {
      console.error('Search error:', error);
      res.status(500).send('An error occurred while processing your search query.');
  }
});

router.get('/searchContainer', async (req, res) => {
    const { searchQuery } = req.body; // Make sure this aligns with how you're sending data from the frontend
  
  
    const url = `https://graph.microsoft.com/v1.0/drives/b!Y7r1Fy-ZAEGJWszw5VcUtf_qTdKhrp5KqXF2aMOX2zjPKVNfXF2lQJeJ5J10FtMp/root/search(q='High')`;
  
  
    try {
        const response = await apiFetch(req, url); 
  
        const searchResults = response.value; // Adjust based on the actual structure of the response
        console.log(JSON.stringify(searchResults));

        res.json(searchResults);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).send('An error occurred while processing your search query.');
    }
  });



module.exports = router;
