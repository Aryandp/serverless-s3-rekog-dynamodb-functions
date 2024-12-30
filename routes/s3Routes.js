// routes/s3Routes.js
const express = require('express');
const { searchFaces, } = require('../functions/searchFaces'); // Correct path to your functions
const { uploadToS3, } = require('../functions/uploadFile'); // Correct path to your functions
const { deleteFile, } = require('../functions/deleteFile'); // Correct path to your functions
const { viewFile, } = require('../functions/viewFile'); // Correct path to your functions
const { listFiles, } = require('../functions/listFiles'); // Correct path to your functions

const router = express.Router();

// POST route for file upload
router.post('/upload', uploadToS3);
router.post('/searchfaces', searchFaces);

// DELETE route for file deletion
router.delete('/delete/:fileName', deleteFile);

// GET route to view a file
router.get('/view/:fileName', viewFile);

// GET route to list all files
router.get('/files', listFiles);
// Define your test handler function
const testFun = (req, res) => {
    try {
        // Simulate some functionality
        res.status(200).json({ message: 'Test route is working' });
    } catch (err) {
        console.error('Error in /test route:', err.message);
        res.status(500).json({ error: 'An error occurred' });
    }
};

// Add the /test route
router.get('/test', testFun);

// Export the router
module.exports = router;
