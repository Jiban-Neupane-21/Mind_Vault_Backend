import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware: Allows the server to parse JSON bodies from requests
app.use(express.json());

// Middleware: Allows your future frontend (e.g., localhost:3000) to communicate with this API
app.use(cors());

// Test route (Health check)
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Mind Vault API is live and healthy!'
  });
});

// Start listening for incoming requests
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});