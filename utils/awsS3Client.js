const { S3Client } = require("@aws-sdk/client-s3");

// Configure the S3 Client
const s3 = new S3Client({
    region: process.env.REGION, // Your AWS Region
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID, // Your AWS Access Key ID
        secretAccessKey: process.env.SECRET_ACCESS_KEY, // Your AWS Secret Access Key
    },
});

module.exports = s3;
