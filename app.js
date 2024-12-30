// Use require instead of import
const express = require('express');
const awsServerlessExpress = require('aws-serverless-express');
const s3Routes = require('./routes/s3Routes');

// Initialize the Express app
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Define a simple 'Hello World' route
// app.get('/', (req, res) => {
//     res.send('Hello World from Lambda with Express!');
// });

// Define routes for the app
app.use('/', s3Routes);

// Create the server using aws-serverless-express
const server = awsServerlessExpress.createServer(app);

// Export the Lambda handler function
exports.appHandler = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
};
