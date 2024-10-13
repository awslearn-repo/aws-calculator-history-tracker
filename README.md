# AWS Calculator History Tracker

This project is a web application to manage and track AWS Pricing Calculator estimates over time. It enables users to log in, upload, and manage cost estimate versions, all while tracking history in an organized way.

**Features of AWS Pricing Calculator History Tracker**

**User Management**

Users will be able to sign up and manage their accounts securely using Amazon Cognito User Pools. Once logged in, you can access your personalized dashboard, where you can view and manage all the AWS Pricing Calculator links you've tracked, along with the associated information.

**Track Links with Project and Version Information**

Keep a detailed record of your AWS Pricing Calculator links organized by project. You can add descriptive information for each link, including version details (e.g., initial estimate, added production environment, etc.), making it easier to track different pricing scenarios over time.

**Upload and Download Files**

For each pricing estimate, you’ll have the ability to upload and download PDF, CSV, or JSON files. This ensures you maintain a snapshot of the original pricing data even if AWS service prices change. You can reference these files later for comparison or documentation purposes, preserving the historical cost estimates for your projects.

Here’s the project structure format for your **README.md** file:

## Project Structure

- **index.html**: Login page for user authentication.
- **dashboard.html**: Displays version history of AWS estimates post-login.
- **logout.html**: Logs the user out and redirects to the login page.
- **/js**: 
  - **app.js**: Handles DynamoDB operations (CRUD).
  - **auth.js**: Manages user login/logout with Amazon Cognito.
- **/assets**: 
  - **style.css**: Contains custom styles for the web app.


## License
MIT License
