var express = require('express');
var router = express.Router();

const apiFetch = require('./common');  

// List Containers
router.get('/', async (req, res) => {
  //res.render('containers_home', { username: req.session.username });
  res.render('containers_demo', { username: req.session.username });
});

// List Containers
router.get('/list', async (req, res) => {
  const url = `https://graph.microsoft.com/v1.0/storage/fileStorage/containers?$select=id,displayName,description,containerTypeId,createdDateTime&$filter=containerTypeId eq ${process.env.CONTAINER_TYPE_ID}`;
  try {
    const userData = await apiFetch(req, url);
    res.render('containers_list', { containers: userData.value, orig_url: url, orig_results: userData.value });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// List Containers
router.get('/drive/:driveId', async (req, res) => {
  const url = `https://graph.microsoft.com/v1.0/storage/fileStorage/containers/${req.params.driveId}/drive`;
  try {
    const results = await apiFetch(req, url);
  res.render('containers_drive_info', { data: results, orig_url: url, orig_results: results });
    //res.json(results)
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

router.get('/create', (req, res) => {
  res.render('container_create', { username: req.session.username });
});

router.post('/create', async (req, res) => {
  const { displayName, description } = req.body;
  const containerTypeId = process.env.CONTAINER_TYPE_ID;
  const url = 'https://graph.microsoft.com/beta/storage/fileStorage/containers';
  const bodyData = { displayName, description, containerTypeId };

  try {
    results = await apiFetch(req, url, 'POST', bodyData);
    //res.redirect('/containers/list');
    res.render('success', { orig_url: url, orig_body: bodyData, orig_results: results, message: 'Container created successfully.', continueUrl: '/containers/list'});
  } catch (error) {
    res.status(500).send('Error creating container');
  }
});

// GET route to fetch container (drive) permissions
router.get('/perms/:driveId', async (req, res) => {
  const driveId = req.params.driveId;

  if (!driveId) {
    return res.status(400).send("Drive ID is required.");
  }

  const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers/${driveId}/permissions`;

  try {
    const results = await apiFetch(req, url, 'GET');
    console.log(JSON.stringify(results));
    res.render("container_perms", {  permissions: results, orig_url: url, orig_results: results});
    //res.json({ success: true, permissions: permissions, message: "Permissions retrieved successfully." });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).send("Failed to fetch permissions");
  }
});

// Refactored route to accept driveId as a URL parameter
router.get('/grant-container/:driveId', (req, res) => {
  const driveId = req.params.driveId;

  if (!driveId) {
    return res.status(400).send("Drive ID is required.");
  }

  res.render('grant-container', {
    driveId: driveId,
    email: '',
    username: req.session.username  // Include username in the rendering context
  });
});


router.post('/grant-container', async (req, res) => {
  const { driveId, email, role } = req.body;

  if (!driveId || !email || !role) {
    return res.status(400).send("Missing required fields");
  }

  const url = `https://graph.microsoft.com/v1.0/storage/fileStorage/containers/${driveId}/permissions`;

  const body = {
    "roles": [role],
    "grantedToV2": {
        "user": {
            "userPrincipalName": email
        }
    }
  };

  console.log(url);
  console.log(body);

  try {
    const response = await apiFetch(req, url, 'POST', body);
    res.render('success', { message: "Permission added successfully.", orig_url: url, orig_body: body, orig_results: response, continueUrl: '/containers/list', orig_req_id: req.session.ORIG_REQ_ID })
    //res.json({ success: true, permissions: response, message: "Permissions updated successfully." });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).send("Failed to update permissions");
  }
});

router.get('/delete/:containerId', async (req, res) => {
  const url = `https://graph.microsoft.com/beta/storage/fileStorage/containers//${req.params.containerId}`;

  try {
      await apiFetch(req, url, 'DELETE');
      res.redirect('/containers/list');
  } catch (error) {
      res.status(500).send('Error deleting container');
  }
});



module.exports = router;
