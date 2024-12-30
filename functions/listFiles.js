const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const bucketName = process.env.BUCKET_NAME;

// Initialize the S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

// List all files from S3
module.exports.listFiles = async (req, res) => {
    try {
        // Check if bucketName is defined
        if (!bucketName) {
            return res.status(400).json({ error: 'Bucket name is missing in environment variables.' });
        }

        // Log the bucket name for debugging purposes
        console.log('Listing files from bucket:', bucketName);

        // S3 list objects parameters
        const params = {
            Bucket: bucketName, // Ensure Bucket is specified here
        };

        // Use the ListObjectsV2Command to list objects
        const command = new ListObjectsV2Command(params);
        const data = await s3.send(command);

        // If no objects are found
        if (!data.Contents || data.Contents.length === 0) {
            return res.status(404).json({ message: 'No files found in the bucket.' });
        }

        // Extract file details (key, size, lastModified, and URL)
        const files = data.Contents.map((file) => {
            const fileUrl = `https://${bucketName}.s3.amazonaws.com/${file.Key}`; // Construct the file URL
            return {
                key: file.Key,
                size: file.Size,
                lastModified: file.LastModified,
                url: fileUrl, // Include the URL
            };
        });

        // Return the list of files with URLs
        return res.status(200).json({ files: files });
    } catch (err) {
        // Log detailed error for debugging
        console.error('Error listing files:', err);

        // Return 500 status if there was an error
        return res.status(500).json({
            error: 'Error listing files',
            details: err.message,
        });
    }
};
