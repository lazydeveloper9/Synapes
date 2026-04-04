const jwt = require('jsonwebtoken');

// Must match the secret used in your auth.js routes
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_super_secret_key';

const authenticateToken = (req, res, next) => {
  // 1. Get the Authorization header
  const authHeader = req.headers['authorization'];
  
  // 2. Extract the token (Format is usually "Bearer <token>")
  const token = authHeader && authHeader.split(' ')[1];

  // 3. If no token is found, reject the request
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // 4. Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 5. Attach the decoded payload (userId, email) to the request object
    req.user = decoded;
    
    // 6. Move to the next middleware or the actual route handler
    next();
  } catch (error) {
    // Distinguish between expired tokens and invalid/tampered tokens
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

module.exports = authenticateToken;