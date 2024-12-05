from datetime import datetime
import urllib.parse
import boto3 # type: ignore
from botocore.exceptions import ClientError # type: ignore
#from urllib.parse import urlparse
#from urllib.parse import unquote
import json
import ast
import time

# Initialize AWS clients
dynamodb_client = boto3.client('dynamodb')
textract_client = boto3.client('textract')
bedrock_client = boto3.client('bedrock-runtime')

# DynamoDB Table Name
ANALYSIS_TABLE = "EstimatesAnalysis"

def lambda_handler(event, context):
    try:
        # Extract project_version and file details from the event
        body = json.loads(event['body'])  # Function URL uses 'body' to pass the payload
        email = body['email']
        project_version = body['project_version']
        
        #email = event['email']
        #project_version = event['project_version']

        if not email or not project_version:
            return {
            "statusCode": 400,
            "body": "Missing required parameters: email and project_version"
            }
        #bucket_name = event['bucket']
        #file_key = event['file_key']
        """
        return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
                },
                #'body': json.dumps(existing_analysis)
                'body': json.dumps('Hello')
                #})
            }
        """
        # Step 1: Check if analysis already exists
                
        existing_analysis = check_existing_analysis(project_version)
        print(f"Existing analysis found outer: {existing_analysis}")
        if existing_analysis != "Not Found":  # Check against 'Not Found'
            print(f"Existing analysis found inner: {existing_analysis}")
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps(existing_analysis)
                #'body': json.dumps('hello')
            }
        
           
        # Fetch bucket and file key
        s3_details = get_s3_details(email, project_version)
        bucket_name = s3_details["bucket"]
        file_key = s3_details["file_key"]
        print(f"bucket: {bucket_name}")
        print(f"file_key: {file_key}")

        # Step 2: Extract text from S3 file using Textract
        #document_text = extract_text_from_s3(bucket_name, file_key)
        #print(f"document_text: {document_text}")

        job_id = start_textract_analysis(bucket_name, file_key)
        #document_text = get_textract_results(job_id)
        try:
            document_text = get_textract_results(job_id)
            print("Extracted text:", document_text)
        except Exception as e:
            print(f"Error fetching Textract results: {e}")

        # Step 3: Perform analysis using Bedrock
        #response_string = perform_bedrock_analysis(document_text)
        analysis_result = perform_bedrock_analysis(document_text)
        #print(f"response_string: {response_string}")

        # # Step 4: Convert Bedrock result into json format
        #analysis_result = parse_response(response_string)
        #print(analysis_result)

        # Step 5: Write analysis back to DynamoDB
        save_analysis_to_dynamodb(project_version, analysis_result)
        #time.sleep(20)
        existing_analysis = check_existing_analysis(project_version)
        if existing_analysis != "Not Found":  # Check against 'Not Found'
            print(f"Existing analysis found inner: {existing_analysis}")
            return {
                'statusCode': 200,
                'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps(existing_analysis)
                #'body': json.dumps('hello')
            }
            
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({"Error": str(e)})
        }

def check_existing_analysis(project_version):
    """
    Checks if analysis data exists in DynamoDB for the given project_version.
    """
    response = dynamodb_client.get_item(
        TableName=ANALYSIS_TABLE,
        Key={'project_version': {'S': project_version}},
        ProjectionExpression='analysis_result'  # Only fetch 'analysis_result' attribute
    )
    #print(response.get('Item'))
    processed_item = response.get('Item', {}).get('analysis_result', {}).get('S')
     
    return json.dumps(processed_item) if processed_item else "Not Found"
    
def get_s3_details(email, project_name_version):
    """
    Fetches the S3 bucket and file key from DynamoDB for the given email and project version.
    """
    # DynamoDB query to fetch the file_url
    table_name = "awscalcculatorhistorytracker"
    response = dynamodb_client.query(
        TableName=table_name,
        KeyConditionExpression="email = :email AND project_name_version = :project_version",
        ExpressionAttributeValues={
            ":email": {"S": email},
            ":project_version": {"S": project_name_version}
        }
    )

    # Check if a record is found
    if "Items" not in response or not response["Items"]:
        raise ValueError("No record found for the provided email and project version.")
    
    # Extract the file_url from the response
    file_url = response["Items"][0]["file_url"]["S"]

    # Parse the URL to extract bucket name and key
    parsed_url = urllib.parse.urlparse(file_url)
    bucket = parsed_url.netloc.split('.')[0]  # Extract bucket from hostname
    encoded_file_key = parsed_url.path.lstrip('/')  # Remove leading slash from path
    file_key = urllib.parse.unquote(encoded_file_key)
    print(f"parsed_url: {parsed_url}")
    
    return {"bucket": bucket, "file_key": file_key}

def start_textract_analysis(bucket_name, file_key):
    response = textract_client.start_document_analysis(
        DocumentLocation={'S3Object': {'Bucket': bucket_name, 'Name': file_key}},
        FeatureTypes=["TABLES", "FORMS", "LAYOUT"]
    )
    return response['JobId']

def get_textract_results(job_id):
    """
    Polls Textract's GetDocumentAnalysis to fetch results for a completed job.
    Handles paginated results using NextToken.
    """
    extracted_text = []
    next_token = None

    while True:
        # Poll for job status and fetch results
        response = textract_client.get_document_analysis(
            JobId=job_id,
            NextToken=next_token
        ) if next_token else textract_client.get_document_analysis(JobId=job_id)

        # Check job status
        status = response['JobStatus']
        if status == 'SUCCEEDED':
            # Extract text from the blocks
            for block in response['Blocks']:
                if block['BlockType'] == 'LINE':
                    extracted_text.append(block['Text'])

            # Check for pagination
            next_token = response.get('NextToken')
            if not next_token:
                break  # Exit when all pages are processed
        elif status == 'FAILED':
            raise Exception(f"Textract job failed: {response.get('StatusMessage')}")
        else:
            print("Waiting for the job to complete...")
            time.sleep(5)  # Wait before polling again

    return " ".join(extracted_text)


"""
def extract_text_from_s3(bucket, file_key):
    
    Extracts text from a file in S3 using Amazon Textract.
    
    response = textract_client.analyze_document(
        Document={'S3Object': {'Bucket': bucket, 'Name': file_key}},
        FeatureTypes=["TABLES", "FORMS", "LAYOUT"]
    )
    extracted_text = []
    for block in response['Blocks']:
        if block['BlockType'] == 'LINE':
            extracted_text.append(block['Text'])
    return " ".join(extracted_text)
"""

def perform_bedrock_analysis(document_text):
    """
    Sends the extracted text to Bedrock for analysis.
    """
    if not isinstance(document_text, str):
        raise ValueError("document_text must be a string")

    prompt = f"""
    You are an AWS cost optimization expert. Analyze the following AWS cost estimate:

    {document_text}
    First section should provide summary on the services requested in the estimate. 
    what services and how many quantities. 
    Section names should be bold for readability.
    Identify the most costly service and specify the same.
    Second section should to Provide key insights, optimization strategies, and recommendations for cost savings.
    Ensure each point is presented with one blank line in between for proper readability.
    """
    model_id = "amazon.titan-text-premier-v1:0"  # Adjust as per your requirements
    
    payload = {"inputText": prompt}

    try:
        # Invoke the Bedrock model
        response = bedrock_client.invoke_model(
            modelId=model_id,
            body=json.dumps(payload),
            accept="application/json",
            contentType="application/json"
        )

        # Read the response body as a string
        response_body = response['body'].read().decode('utf-8')
        #print("Response body:", response_body)

        # Parse JSON and extract output
        result = json.loads(response_body)
        #print("Parsed JSON:", result)
        #print("Keys in result:", result.keys())
        results = result.get('results', [])
        if results:
            return results[0].get('outputText', 'No output text found in the response.')
        return 'No output text found in the response.'

    except Exception as e:
        print(f"Error invoking Bedrock model: {e}")
        raise

def parse_response(response_string):
    """
    Parses a response string containing a Python-like dictionary,
    returning a JSON-formatted string.
    """
    try:
        # Directly use ast.literal_eval to parse the string as a dictionary
        parsed_dict = ast.literal_eval(response_string.strip())
        
        # Convert to JSON for consistent output
        return json.dumps(parsed_dict)
    except Exception as e:
        raise ValueError(f"Failed to parse response: {e}")

def save_analysis_to_dynamodb(project_version, analysis_result):
    """
    Saves the analysis result to DynamoDB.
    """
    # Convert analysis_result to a string if it's a complex object (like a dictionary)
    if isinstance(analysis_result, dict):
        analysis_result = json.dumps(analysis_result)

    dynamodb_client.put_item(
        TableName=ANALYSIS_TABLE,
        Item={
            'project_version': {'S': project_version},
            'analysis_result': {'S': analysis_result},
            'timestamp': {'S': datetime.now().isoformat()}
        }
    )
