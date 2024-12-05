// Configure AWS SDK
AWS.config.update({
  region: "us-east-1",
});

const DEBUG_MODE = true; // Set to false to disable debug messages

function debugLog(...messages) {
    if (DEBUG_MODE) {
        console.log(...messages); // Spread operator allows multiple messages
    }
}

/*
These are the functions

1. handleAuthRedirect()
2. decodeJWT()
3. getEmailFromToken()
4. handleFormSubmit()
5. fetchEstimates()
6. renderEstimates()
7. waitForCredentialsAndEmail()

*/
// Outside - Exchange the authorization code for tokens
async function handleAuthRedirect() {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const authCode = urlParams.get('code');
  debugLog("queryString:", queryString);
  debugLog("urlParams:", urlParams);
  debugLog("authCode:", authCode);

  if (authCode) {
    // Exchange code for tokens. Replace your details as applicable for Cognito configuration
    const response = await fetch('https://nnnnnnnn.auth.us-east-1.amazoncognito.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: '8c8kssktr0fpreogn2t',   // Replace with your Cognito client ID
        code: authCode,
        redirect_uri: 'https://dnnnnnnnnnn.cloudfront.net/dashboard.html',  // Replace with your redirect URL
      }),
    });

    const data = await response.json();
    debugLog("id_token:", data.id_token);

    // Save tokens to localStorage
    localStorage.setItem('id_token', data.id_token);
    localStorage.setItem('access_token', data.access_token);

    // Configure AWS Cognito Identity Credentials using id_token
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      region: "us-east-1",  // Adjust to your AWS region
      IdentityPoolId: "us-east-1:a00d80ac--nnnnnn", // Replace with your Identity Pool ID
      Logins: {
         // Cognito User Pool provider name and token for authenticated access
        'cognito-idp.us-east-1.amazonaws.com/us-east-1nnnnnn': data.id_token, // Update with your actual User Pool ID
      },
    });

    // Explicitly fetch AWS credentials using the id_token
    try {
      // Explicitly fetch AWS credentials and wait until they are ready
      await AWS.config.credentials.getPromise();
      console.log("AWS credentials fetched successfully.");
      console.log("Current AWS credentials - inner:", AWS.config.credentials);
      credentials = AWS.config.credentials;  
      email = getEmailFromToken(data.id_token); 
      return { credentials, email };  // Return both credentials and email
    } catch (err) {
      console.error("Error fetching AWS credentials:", err);
      return;
    }
  } 
}

// Function to decode JWT
function decodeJWT(token) {
  const base64Url = token.split('.')[1]; // Get the payload part of the token
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

// Function to get email from the decoded id_token
function getEmailFromToken(id_Token) {
  //const idToken = localStorage.getItem('id_token');
  const idToken = id_Token;
  debugLog("idToken:", idToken);

  if (!idToken) {
    console.error("No ID token found in localStorage");
    return null;
  }
  
  const decodedToken = decodeJWT(idToken); // Decode the token
  const email = decodedToken.email; // Extract the email attribute

  if (email) {
    debugLog("User's email is:", email);
    return email;
  } else {
    console.error("Email not found in the token");
    return null;
  }
}


// Function to handle form submission with S3 file upload
async function handleFormSubmit(email) {
  const projectInput = document.getElementById("projectName").value;
  const linkInput = document.getElementById("awsLink").value;
  const descriptionInput = document.getElementById("description").value;
  const fileInput = document.getElementById("fileInput").files[0]; // File to upload
  const confirmationMessage = document.getElementById("confirmationMessage"); // Div for confirmation message
  
  console.log("Form Submit with credentials:", AWS.config.credentials);
  const docClient = new AWS.DynamoDB.DocumentClient();

  try {
    
    // Step 1: Query for existing project versions to generate next version
    const paramsQuery = {
      TableName: "awscalcculatorhistorytracker", 
      KeyConditionExpression: "email = :email AND begins_with(project_name_version, :project)",
      ExpressionAttributeValues: {
        ":email": email,
        ":project": projectInput
      }
    };

    const data = await docClient.query(paramsQuery).promise();
    let nextVersion = 1;  // Default version if no records exist

    // Determine the next version number
    if (data.Items.length > 0) {
      // Map and parse version numbers
      const versions = data.Items.map(item => {
        const versionPart = item.project_name_version.split('_').pop();
        const numericPart = versionPart.replace(/\D/g, ''); // Remove non-numeric characters, resulting in "001"
        debugLog("numericPart:", numericPart);
        return parseInt(numericPart, 10); // Convert to an integer
      }).filter(num => !isNaN(num)); // Filter out invalid numbers
    
    debugLog("versions:", versions);

      // Step 3: Find the highest version and increment by 1
      if (versions.length > 0) {
        nextVersion = Math.max(...versions) + 1;
      }
    }
    
    debugLog("nextVersion:", nextVersion);

    // Generate the new project version key
    const projectVersion = `${projectInput}_v${String(nextVersion).padStart(3, '0')}`;
    debugLog("projectVersion:", projectVersion);

    // Step 2: Upload file to S3
    const s3 = new AWS.S3();
    const s3Params = {
      Bucket: "<your bucket name>", // S3 bucket name
      Key: `${email}/${projectVersion}_${fileInput.name}`, // Unique file key (path)
      Body: fileInput,
      ContentType: fileInput.type
    };

    const s3Upload = await s3.upload(s3Params).promise();
    const fileUrl = s3Upload.Location; // URL to the uploaded file

    // Step 3: Insert data into DynamoDB
    const paramsPut = {
      TableName: "awscalcculatorhistorytracker",
      Item: {
        email: email,
        project_name_version: projectVersion,
        link: linkInput,
        description: descriptionInput,
        file_url: fileUrl, // Link to the S3 file
        timestamp: new Date().toISOString()
      }
    };

    // Insert the item into DynamoDB
    await docClient.put(paramsPut).promise();

    // Step 4: Display confirmation message
    confirmationMessage.textContent = "Record successfully updated!";
    confirmationMessage.style.color = "green";
    confirmationMessage.style.display = "block"; // Make it visible

    debugLog("Added item with S3 file link:", fileUrl);

  } catch (err) {
    console.error("Error handling form submission:", err);

    // Step 4: Display error message
    confirmationMessage.textContent = "Failed to update record.";
    confirmationMessage.style.color = "red";
    confirmationMessage.style.display = "block"; // Make it visible
  }
}

// Function to fetch estimates from DynamoDB
// Step 1: Fetch and Render Estimates

async function fetchEstimates(email) {
  console.log("Fetching estimates with credentials:", AWS.config.credentials);
  const docClient = new AWS.DynamoDB.DocumentClient();

  const params = {
      TableName: "awscalcculatorhistorytracker",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
          ":email": email
      }
  };

  try {
      const data = await docClient.query(params).promise();
      // Sort estimates by timestamp (latest first)
      const sortedEstimates = data.Items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      renderEstimates(email,sortedEstimates);
      
  } catch (error) {
      console.error("Error fetching estimates:", error);
  }
}

// Step 2: Render Estimates in the Left Panel

// Function to render estimates in the left panel with column headers
function renderEstimates(email,estimates) {
  const estimatesList = document.getElementById("estimates-list");
  estimatesList.innerHTML = ""; // Clear previous estimates
  debugLog("project_name_version in render estimate:", estimates.project_name_version);
  console.log("project_name_version in render estimate:", estimates.project_name_version);

  // Create and append column headers
  const headerRow = document.createElement("div");
  headerRow.className = "estimate-header";

  const projectNameHeader = document.createElement("span");
  projectNameHeader.textContent = "Project Name";
  //projectNameHeader.style.width = "20%";

  const descriptionHeader = document.createElement("span");
  descriptionHeader.textContent = "Description";
  //descriptionHeader.style.width = "20%";

  const calculatorLinkHeader = document.createElement("span");
  calculatorLinkHeader.textContent = "Calculator Link";
  //calculatorLinkHeader.style.width = "20%";

  const fileHeader = document.createElement("span");
  fileHeader.textContent = "File";
  fileHeader.style.width = "20%";

  const timestampHeader = document.createElement("span");
  timestampHeader.textContent = "Timestamp";
  //timestampHeader.style.width = "12%";

  const AnalyzeHeader = document.createElement("span");
  AnalyzeHeader.textContent = "Analyze";
  //AnalyzeHeader.style.width = "8%";

  headerRow.appendChild(projectNameHeader);
  headerRow.appendChild(descriptionHeader);
  headerRow.appendChild(calculatorLinkHeader);
  headerRow.appendChild(fileHeader);
  headerRow.appendChild(timestampHeader);
  headerRow.appendChild(AnalyzeHeader);

  estimatesList.appendChild(headerRow);

  // Iterate over estimates and append each as a row
  estimates.forEach(estimate => {
    const estimateRow = document.createElement("div");
    estimateRow.className = "estimate-item";

    // Create columns for each row
    const projectNameCol = document.createElement("span");
    projectNameCol.textContent = estimate.project_name_version; // Project name and version
    //projectNameCol.style.width = "20%";

    const descriptionCol = document.createElement("span");
    descriptionCol.textContent = estimate.description || "No description"; // Description
    //descriptionCol.style.width = "20%";

    const calculatorLinkCol = document.createElement("span");
    const calculatorLink = document.createElement("a");
    calculatorLink.href = estimate.link || "#"; // Calculator link
    calculatorLink.textContent = "Open Calculator";
    calculatorLink.target = "_blank"; // Ensure it opens in a new tab/window
    calculatorLink.rel = "noopener noreferrer"; // Security for external links
    calculatorLinkCol.appendChild(calculatorLink);
    //calculatorLinkCol.style.width = "20%";

    const fileCol = document.createElement("span");
    const fileLink = document.createElement("a");
    fileLink.href = estimate.file_url || "#"; // File URL
    fileLink.textContent = "Download File";
    fileLink.target = "_blank"; // Ensure it opens in a new tab/window
    fileLink.rel = "noopener noreferrer"; // Security for external links
    fileCol.appendChild(fileLink);
   // fileCol.style.width = "20%";

    const timestampCol = document.createElement("span");
    const date = new Date(estimate.timestamp); // Since your timestamp is already in ISO format
    timestampCol.textContent = date.toLocaleString(); // Human-readable timestamp
    //timestampCol.style.width = "12%";
    
    //const analyzeCol = document.createElement("span");
    project_name_version = estimate.project_name_version;
    debugLog("project_name_version near button:", estimate.project_name_version);

    const analyzeButton = document.createElement("button");
    analyzeButton.textContent = "Analyze";
    analyzeButton.classList.add("analyze-btn"); // Add a class for styling
    // Use a closure to capture the correct project name for each button
    analyzeButton.addEventListener('click', openAnalyzePopup.bind(null, email, project_name_version));

    //analyzeButton.onclick = () => openAnalyzePopup(email,project_name_version); // Attach an event listener
    //analyzeCol.appendChild(analyzeButton); // Append button to column
    //analyzeButton.style.width = "8%";

    /*const AnalyzeCol = document.createElement("span");
    AnalyzeCol.textContent = "Analyze"; // Human-readable timestamp
    AnalyzeCol.style.width = "8%"; */

    // Append columns to the row
    estimateRow.appendChild(projectNameCol);
    estimateRow.appendChild(descriptionCol);
    estimateRow.appendChild(calculatorLinkCol);
    estimateRow.appendChild(fileCol);
    estimateRow.appendChild(timestampCol);
    estimateRow.appendChild(analyzeButton);

    // Append row to the estimates list.
    estimatesList.appendChild(estimateRow);
  });
}

// Polling function to check if credentials and email are ready
function waitForCredentialsAndEmail() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (credentials && email) {
        clearInterval(checkInterval);  // Stop checking once variables are populated
        resolve({ credentials, email });
      }
    }, 100);  // Check every 100ms
  });
}

// Actual CODE starts here. Till now we defined functions.

// Call the auth handler once on page load

let email;  // Declare email outside
let credentials;  // Declare credentials variable outside

document.addEventListener('DOMContentLoaded', async function () {
  ({ credentials, email } = await handleAuthRedirect()); // Assign directly to global variables
  console.log("Current AWS credentials - outer:", credentials);
  console.log("Email - outer:", email);
});

// Example usage of the polling function
waitForCredentialsAndEmail().then(({ credentials, email }) => {
  console.log("Credentials and email are now ready:", credentials, email);
  // Proceed with other application logic here, like fetching estimates
  
console.log("Current AWS credentials - to be used in app later:", credentials);
console.log("Email - to be used in app later:", email);
debugLog("Email:", email);

// Proceed with fetching estimates now that credentials and email are available
fetchEstimates(email);  // Fetch estimates immediately

const submitButton = document.getElementById("submitButton");
submitButton.addEventListener("click", function (event) {
  event.preventDefault(); // Prevent default form submission
  handleFormSubmit(email); // Call the function to handle form submission
  setTimeout(() => { // Call the dfunction to render estimate with 1 second delay
     fetchEstimates(email);
      }, 1000);  // 1 second delay
  });
}); //waitForCredentialsAndEmail() call closes here
