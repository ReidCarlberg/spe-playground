const express = require('express');
const router = express.Router();
const msal = require('@azure/msal-node');
const fs = require('fs');
const path = require('path');
const apiFetch = require('./common');  // Ensure this points to your common.js file correctly

require('dotenv').config();

// Route for displaying message after operations
router.get('/', (req, res) => {
    const message = req.session.message;  // Retrieve message from session
    req.session.message = null;  // Clear the message from session after displaying it
    res.render('sharepoint_only', { message: message , username: req.session.username });
});

// SharePoint-only route with certificate-based authentication
router.get('/sharepoint-only', async (req, res) => {
  // Paths to certificate and key
  const keyPath = path.join(__dirname, process.env.CERTIFICATE_PATH);

  // Load the private key
  const privateKey = fs.readFileSync(keyPath, { encoding: 'utf8' });

  // MSAL configuration using environment variables
  const msalConfigLocal = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientCertificate: {
            thumbprint: process.env.CERTIFICATE_THUMBPRINT,
            privateKey: privateKey
        }
    }
  };

  const cca = new msal.ConfidentialClientApplication(msalConfigLocal);

  const authCodeUrlParameters = {
    scopes: [`${process.env.ROOT_URL}/.default`]
  };

  try {
      const response = await cca.acquireTokenByClientCredential(authCodeUrlParameters);
      console.log("Token acquired with certificate: ", response.accessToken);
      req.session.accessToken = response.accessToken;
      req.session.isAuthenticated = true;
      req.session.username = "SharePoint Only";
      req.session.message = 'Authenticated with SharePoint';
      res.redirect("/sharepoint/");
  } catch (error) {
      console.error("Error acquiring token: ", JSON.stringify(error));
      res.status(500).send("Failed to authenticate");
  }
});


// Route for registering container type using apiFetch
router.get('/register-container-type', async (req, res) => {
    const ContainerTypeId = process.env.CONTAINER_TYPE_ID;
    const url = `${process.env.ROOT_URL}_api/v2.1/storageContainerTypes/${ContainerTypeId}/applicationPermissions`;

    const body = {
      "value": [
          {
              "appId": process.env.CLIENT_ID,
              "delegated": ["full"],
              "appOnly": ["full"]
          }
      ]
    };
  
    try {
      const result = await apiFetch(req, url, 'PUT', body);
      req.session.message = 'Successfully registered container type';
      res.redirect('/sharepoint/');
    } catch (error) {
      console.error('Failed to update container permissions:', error);
      res.status(500).send('Failed to update container permissions');
    }
});



module.exports = router;
