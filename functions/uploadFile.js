const multer = require('multer');
const unzipper = require('unzipper');
const { Readable } = require('stream');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const mime = require('mime-types');

// S3 bucket name from environment variables
const bucketName = process.env.BUCKET_NAME;

// Initialize the S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY,
    },
});

// Set up multer for handling file uploads with file size limit (10 MB)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB size limit
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/zip'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files (png, jpg, jpeg) or zip files are allowed'));
        }
        cb(null, true);
    },
});

// Helper function to upload a file to S3
const uploadFileToS3 = async (fileName, fileType, fileBuffer) => {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileBuffer,
        ContentType: fileType,
    };

    try {
        const command = new PutObjectCommand(params);
        await s3.send(command);
        return `https://${bucketName}.s3.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw error;
    }
};

// Function to get file extension from the file name
const getFileExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

// Upload single image or zip containing images to S3
module.exports.uploadToS3 = [
    upload.single('file'), // Handle single file upload
    async (req, res) => {
        try {
            const { file } = req; // Extract uploaded file
            if (!file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { originalname, mimetype, buffer } = file;
            const uploadedFiles = [];

            // Check if the uploaded file is a zip
            if (mimetype === 'application/zip') {
                console.log('Unzipping File:', originalname);

                const zipStream = Readable.from(buffer).pipe(unzipper.Parse({ forceStream: true }));
                for await (const entry of zipStream) {
                    const { path: extractedPath, type } = entry; // path = file name, type = 'File' or 'Directory'

                    if (type === 'File') {
                        const fileExtension = getFileExtension(extractedPath);
                        const allowedExtensions = ['.png', '.jpg', '.jpeg'];

                        // Check if the extracted file has an allowed image extension
                        if (!allowedExtensions.includes(fileExtension)) {
                            console.log('Skipping Non-Image File:', extractedPath);
                            entry.autodrain();
                            continue;
                        }

                        console.log('Processing Extracted File:', extractedPath);

                        const fileName = `Raviwiz_${Date.now()}_${path.basename(extractedPath)}`;
                        
                        // Get the MIME type from file extension (use mime-types library)
                        const fileType = mime.lookup(extractedPath) || 'application/octet-stream';
                        const fileBuffer = await entry.buffer(); // Read the file content

                        // Upload extracted file to S3
                        const fileUrl = await uploadFileToS3(fileName, fileType, fileBuffer);
                        uploadedFiles.push({ fileName, fileType, fileUrl });
                    } else {
                        console.log('Skipping Directory:', extractedPath);
                        entry.autodrain(); // Skip directories
                    }
                }
            } else {
                // Handle single image upload
                console.log('Uploading Single File:', originalname);

                const fileExtension = getFileExtension(originalname);
                const allowedExtensions = ['.png', '.jpg', '.jpeg'];

                // Check if the uploaded file has an allowed image extension
                if (!allowedExtensions.includes(fileExtension)) {
                    return res.status(400).json({ error: 'Only image files (png, jpg, jpeg) are allowed' });
                }

                // Get MIME type for single image file
                const fileType = mime.lookup(originalname) || mimetype;

                // Upload the file to S3
                const fileName = `Raviwiz_${Date.now()}_${originalname}`;
                const fileUrl = await uploadFileToS3(fileName, fileType, buffer);
                uploadedFiles.push({ fileName, fileType, fileUrl });
            }

            if (uploadedFiles.length === 0) {
                return res.status(400).json({ error: 'No valid image files found in the zip' });
            }

            return res.status(200).json({
                message: 'Files uploaded successfully',
                uploadedFiles: uploadedFiles,
            });
        } catch (err) {
            console.error('Error uploading files:', err.message);
            return res.status(500).json({
                error: 'Error uploading files',
                details: err.message,
            });
        }
    },
];
