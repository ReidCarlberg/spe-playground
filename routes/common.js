async function apiFetch(req, url, method = 'GET', body = null) {
  console.log('Request URL:', url);

  // Initialize headers with Authorization
  const headers = {
      'Authorization': `Bearer ${req.session.accessToken}`,
  };

  if (method === 'PUT' && body instanceof Buffer) {
      // For PUT requests with Buffer body, set Content-Type for binary data
      headers['Content-Type'] = 'application/octet-stream';
  } else if (method !== 'GET') {
      // For other non-GET requests with non-binary body, set Content-Type to 'application/json'
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
  }

  console.log('Request Body:', body);

  try {
      const options = { method, headers };
      if (body !== undefined && method !== 'GET') options.body = body;

      const response = await fetch(url, options);
      if (!response.ok) {
          // Attempt to read the response text for more detailed error info
          const errorText = await response.text();
          throw new Error(`API call failed with status: ${response.status}, status text: ${response.statusText}, error: ${errorText}`);
      }

      //console.log('Response Status:', response.status);

      //console.log('Response Headers:', response.headers);

      //console.log('Response Body:', response.body);

      const requestId = response.headers.get('request-id');
      if (requestId) {
          req.session.ORIG_REQ_ID = requestId; // Store the request ID in the session
          //response.locals.orig_req_id = requestId;
          //console.log('Stored request-id in session:', requestId);
      }

      //console.log(response);
      // Log response headers if they exist
      /*
      if (response.headers && response.headers.forEach) {
          console.log('Response Headers:');
          response.headers.forEach((value, key) => {
              console.log(`${key}: ${value}`);
          });
      }
        */
      if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/pdf')) {
        console.log('Response is a PDF');
        const arrayBuffer = await response.arrayBuffer(); // Get the response as an ArrayBuffer
        return Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer
      } else if (response.status === 204) {
        return {};
      } else {
        return await response.json();
      }
      // Handle no-content response
      return response.status === 204 ? {} : await response.json();
  } catch (error) {
      console.error('API Fetch error:', error);
      throw error; // Rethrow to handle in the calling function
  }
}



module.exports = apiFetch;
