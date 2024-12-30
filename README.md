# Serverless S3 Functions

This project implements a set of serverless functions using AWS Lambda, API Gateway, and S3, as part of a serverless architecture. It provides API endpoints for uploading files, searching faces in images, and managing files stored in an S3 bucket. Additionally, the project integrates AWS Rekognition for face recognition and uses DynamoDB for storing metadata.

## Features

- Upload files to an S3 bucket
- Perform face recognition on uploaded images using AWS Rekognition
- Search for faces in the stored images
- Delete files from the S3 bucket
- View files stored in the S3 bucket

## Technologies

- **AWS Lambda**: Serverless functions to process the API requests.
- **Amazon S3**: Object storage for storing images.
- **Amazon Rekognition**: Face recognition service for detecting and indexing faces in images.
- **Amazon DynamoDB**: NoSQL database to store metadata related to the uploaded images.
- **API Gateway**: REST API to interact with the functions.
- **Serverless Framework**: Used for deploying and managing the serverless infrastructure.




