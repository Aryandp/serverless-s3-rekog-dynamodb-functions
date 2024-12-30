const multer = require('multer');
const { RekognitionClient, SearchFacesByImageCommand } = require('@aws-sdk/client-rekognition');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');

// Initialize Rekognition and DynamoDB clients using environment variables
const rekognitionClient = new RekognitionClient({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
});

const dynamoDBClient = new DynamoDBClient({
    region: process.env.REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
});

const COLLECTION_ID = process.env.COLLECTION_ID;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE;
const S3_BUCKET_NAME = process.env.BUCKET_NAME; // Assuming this is set in the .env file

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB size limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files (png, jpg, jpeg) are allowed'));
        }
        cb(null, true);
    },
});

// Search faces API
module.exports.searchFaces = [
    upload.single('file'), // Handle single image upload
    async (req, res) => {
        try {
            const { file } = req; // Extract uploaded file            
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { buffer } = file;

            // Call Rekognition to search for faces
            const searchCommand = new SearchFacesByImageCommand({
                CollectionId: COLLECTION_ID,
                Image: {
                    Bytes: buffer,
                },
                MaxFaces: 5, // Number of similar faces to retrieve
                FaceMatchThreshold: 90, // Confidence threshold
            });

            const rekognitionResult = await rekognitionClient.send(searchCommand);

            if (!rekognitionResult.FaceMatches || rekognitionResult.FaceMatches.length === 0) {
                return res.status(404).json({ message: 'No matching faces found' });
            }

            const faceIds = rekognitionResult.FaceMatches.map((match) => match.Face.FaceId);

            // Query DynamoDB for metadata associated with each FaceId
            const metadataPromises = faceIds.map(async (faceId) => {
                const queryCommand = new QueryCommand({
                    TableName: DYNAMODB_TABLE,
                    KeyConditionExpression: 'FaceId = :faceId',
                    ExpressionAttributeValues: {
                        ':faceId': { S: faceId },
                    },
                });

                const result = await dynamoDBClient.send(queryCommand);

                // Log the result to inspect its structure
                // console.log('DynamoDB Query Result:', JSON.stringify(result, null, 2));

                // Handle case where no items are returned
                if (!result.Items || result.Items.length === 0) {
                    console.warn(`No items found for FaceId: ${faceId}`);
                    return []; // Return an empty array if no items are found
                }

                // Safely extract metadata from result.Items
                const metadata = result.Items.map(item => {
                    // Log the item to inspect its structure
                    // console.log('DynamoDB Item:', JSON.stringify(item, null, 2));

                    // Check if required attributes are present
                    const fileName = item.ImageId ? item.ImageId.S : null; // Ensure FileName is defined
                    const faceId = item.FaceId ? item.FaceId.S : null; // Ensure FaceId is defined
                    const otherData = item.OtherData ? item.OtherData.S : null; // Optional attribute

                    // Generate S3 URL if FileName exists
                    const imageUrl = fileName ? `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${fileName}` : null;

                    // If FileName or FaceId is missing, log a warning
                    if (!fileName || !faceId) {
                        console.warn(`Missing required attributes for FaceId: ${faceId}, FileName: ${fileName}`);
                    }

                    return {
                        faceId,
                        imageUrl,
                        otherData,
                    };
                });

                return metadata;
            });

            const metadataResults = await Promise.all(metadataPromises);

            // Flatten metadata results and format response
            const metadata = metadataResults.flat().map((item) => ({
                faceId: item.faceId,
                imageUrl: item.imageUrl,
                otherData: item.otherData || null, // Replace with your DynamoDB attributes
            }));

            return res.status(200).json({
                message: 'Matching faces found',
                faces: metadata,
            });
        } catch (err) {
            console.error('Error searching faces:', err.message);
            return res.status(500).json({
                error: 'Error searching faces',
                details: err.message,
            });
        }
    },
];
