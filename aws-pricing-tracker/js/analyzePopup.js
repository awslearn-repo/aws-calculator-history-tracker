function openAnalyzePopup(email, project_name_version) {
    // Create a popup to display email and project_name_version
    console.log("project_name_version popup:", project_name_version);
    
    // Create a container for the popup
    const popup = document.createElement("div");
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.width = "60%";
    popup.style.maxWidth = "600px";
    popup.style.height = "70%";
    popup.style.maxHeight = "500px";
    popup.style.padding = "20px";
    popup.style.background = "white";
    popup.style.border = "1px solid black";
    popup.style.borderRadius = "8px";
    popup.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
    popup.style.zIndex = "1000";
    popup.style.overflowY = "auto"; // Enable vertical scrolling for large content

    popup.innerHTML = `
        <h3>Cost Estimate Analysis</h3>
        <p><strong>Project Version:</strong> ${project_name_version}</p>
        <div id="loading" style="margin-top: 15px;">Loading analysis...</div>
        <button id="closePopup" style="
            position: absolute; 
            top: 10px; 
            right: 10px; 
            background-color: red; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            padding: 5px 10px; 
            cursor: pointer;">Close</button>
    `;

    document.body.appendChild(popup);

    // Close button functionality
    document.getElementById("closePopup").onclick = () => {
        document.body.removeChild(popup);
    };

    // Call Lambda function
    const apiUrl = "https://n0y4qase98.execute-api.us-east-1.amazonaws.com/dev/AnalyzeEstimates"; // Replace with your Lambda Function URL

    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email,
            project_version: project_name_version,
        }),
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(errorText => {
                    throw new Error(`Error: ${response.status} ${response.statusText}. Details: ${errorText}`);
                });
            }
            return response.json(); // Return parsed JSON directly
        })
        .then(data => {
            // Update the popup with the returned data
            
            data = data 
               .replace(/\\n/g, "<br>") // Replace escaped new lines with HTML line breaks
               .replace(/\\+/g, "") // Remove escaped characters
               .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Convert text between ** to bold
               .slice(1, -1); // Remove first and last character
                                      
            document.getElementById("loading").innerHTML = `
                <h4>Analysis Result</h4>
                <pre style="
                    background-color: #f8f8f8; 
                    padding: 10px; 
                    border-radius: 4px; 
                    white-space: pre-wrap; /* Wrap long lines */
                    word-wrap: break-word; /* Break words if needed */
                    overflow-wrap: break-word; /* Support all word breaking */
                    max-height: 400px; /* Ensure a scrollable window for very long data */
                ">${JSON.stringify(data, null, 2)}</pre>
            `;
        })
        .catch(error => {
            console.error("Error occurred:", error);
            document.getElementById("loading").innerHTML = `
                <h4>Error</h4>
                <p style="color: red;">Failed to fetch analysis. Details: ${error.message}</p>
            `;
        });
}
