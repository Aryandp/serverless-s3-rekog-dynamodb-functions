const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const bucketName = process.env.BUCKET_NAME;

// Initialize the S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

// View file from S3
module.exports.viewFile = async (req, res) => {
    const { fileName } = req.params;

    // Validate the file name
    if (!fileName) {
        return res.status(400).json({ error: 'File name is required' });
    }

    try {
        const params = {
            Bucket: bucketName,
            Key: fileName,
        };

        // Use GetObjectCommand to retrieve the file
        const command = new GetObjectCommand(params);
        const response = await s3.send(command);

        // Stream the file content back to the response
        res.setHeader('Content-Type', response.ContentType || 'application/octet-stream'); // Ensure Content-Type is set
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`); // Optional: For inline display

        // Pipe the file's body directly to the response
        response.Body.pipe(res);
    } catch (err) {
        console.error('Error retrieving file:', err.message);

        // Handle specific errors
        if (err.name === 'NoSuchKey') {
            return res.status(404).json({ error: 'File not found in S3' });
        }

        return res.status(500).json({ error: 'Error retrieving file from S3', details: err.message });
    }
};
