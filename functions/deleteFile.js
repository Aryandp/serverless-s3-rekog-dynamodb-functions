const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const bucketName = process.env.BUCKET_NAME;

// Initialize the S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

// Delete file from S3
module.exports.deleteFile = async (req, res) => {
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

        // Use DeleteObjectCommand to delete the file
        const command = new DeleteObjectCommand(params);
        await s3.send(command);

        return res.status(200).json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error('Error deleting file:', err.message);

        // Return an error response
        return res.status(500).json({
            error: 'Error deleting file',
            details: err.message,
        });
    }
};
