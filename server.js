import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import apiRoutes from './routes/api.js'; // Adjust the path as needed

const app = express();

// Use middleware
const corsOptions = {
  origin: "*"
}
app.use(cors(corsOptions));
app.use(bodyParser.json()); // Parse incoming JSON requests

// Use the API routes for '/api' path
app.use('/api', apiRoutes);

// Start the server
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
