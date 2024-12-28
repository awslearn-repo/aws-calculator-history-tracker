# AWS Cost Estimate Tracker (ACET)

The **AWS Pricing Calculator** is an online tool provided by Amazon Web Services (AWS) to estimate the cost of using various AWS services. Whether you're starting a small project or planning a large-scale deployment, this tool helps calculate monthly costs for a range of services - from simple EC2 instances to complex architectures using multiple AWS services.

While incredibly useful, the AWS Pricing Calculator has a few limitations:

## Limitations of AWS Pricing Calculator
- **Link Management**: Each time you create or update an estimate, a unique link is generated. Managing multiple links for different versions of a project (e.g., non-production vs. production environments) can become cumbersome.  
- **Changing Prices**: AWS service prices are not static. Estimates might change when AWS updates its pricing, causing confusion if you want to compare costs over time.  
- **Link Expiration**: Links expire after three years, leading to potential data loss unless you've saved a copy in another format (e.g., CSV, PDF, or JSON).

---

## Introducing AWS Cost Estimate Tracker (ACET)

The **AWS Cost Estimate Tracker (ACET)** solves the problem of managing and tracking multiple pricing calculator links. It offers a simple, efficient way to store and access past estimates, track changes, and compare service prices over time.  

APCT also incorporates **Generative AI (GenAI)** capabilities through AWS Bedrock, delivering actionable insights and recommendations based on your estimates.

---

## Features of APCT

### 1. **User Management**
- Secure account sign-up and management using **Amazon Cognito User Pools**.  
- Personalized dashboard to view and manage AWS Pricing Calculator links and associated data.  

### 2. **Track Links with Project and Version Information**
- Organize AWS Pricing Calculator links by project and add descriptive details (e.g., "initial estimate" or "production environment").  
- Track multiple pricing scenarios over time with version management.

### 3. **Upload and Download Files**
- Upload and store PDFs of pricing estimates.  
- Download these files later for comparison, documentation, or historical reference.  

### 4. **Generative AI Analysis**
- Leverage **AWS Bedrock** for actionable insights and cost-optimization recommendations.  
- Simplifies understanding of complex cost structures and helps identify savings opportunities.

---

## Solution Architecture

<img width="539" alt="system-architecture" src="https://github.com/user-attachments/assets/1ecfb898-f066-4615-b25a-e105d74b04cc">

<img width="492" alt="system-architecture-01" src="https://github.com/user-attachments/assets/11aa209c-6d81-41d1-923f-2284c26d0726">

### **Building Blocks**

1. **Webpage Hosted on S3**  
   - Static assets (HTML, CSS, JavaScript) are hosted on an **S3 bucket** with static website hosting enabled.  
   - Provides a cost-effective, scalable front-end solution.

2. **CloudFront Distribution**  
   - Improves performance and security with global content distribution.  
   - Originates from the S3 bucket for low-latency content delivery.

3. **User Management with Amazon Cognito**  
   - Manages authentication, MFA, and account recovery securely.  
   - Allows users to access a personalized dashboard post-login.

4. **DynamoDB as a Data Store**  
   - Stores:
     - AWS Pricing Calculator links  
     - Project descriptions and versioning information  
     - References to uploaded files (PDF, CSV, JSON). Currently only PDF file format is supported.   
   - Ensures fast, scalable data operations.  

5. **Amazon Textract**  
   - Extracts structured data (text, tables, key-value pairs) from uploaded PDFs for seamless analysis.

6. **Amazon Bedrock**  
   - Analyzes structured data to generate insights and cost-optimization strategies.  

6. **Lambda Function**  
   - Application logic to process estimates and generate analysis.  
---

## How to Use the Application

1. Complete your AWS project estimates using the **AWS Pricing Calculator**.  
2. Copy the sharable link and download the estimate as a PDF.  
3. Sign up or log in to ACET.  
4. Add your project estimate using a simple form. The project estimates will be displayed in real-time. Changes create a new version entry.  
5. Download PDFs or open the calculator links from your estimates.  
6. Click **Analyze** for actionable Generative AI insights.  

---

## Why ACET?

This tool is designed to make cost estimation and tracking seamless while enabling you to leverage AI-driven insights for AWS cost optimization. 
