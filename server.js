const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");

const server = jsonServer.create();
const router = jsonServer.router("./database.json");
const userdb = JSON.parse(fs.readFileSync("./users.json", "UTF-8"));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = "123456789";

const expiresIn = "1h";

const tokenBlacklist = new Set(); // Store revoked tokens
// TTL for blacklisted tokens (1 hour)
const TTL = 1 * 60 * 60 * 1000; // 1 hour

// Create a token from a payload
function createToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
}

// Check if the user exists in database
function isAuthenticated({ email, password }) {
  return userdb.users.findIndex((user) => user.email === email && user.password === password) !== -1;
}

// Register New User
server.post("/auth/register", (req, res) => {
  console.log("register endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;

  if (isAuthenticated({ email, password }) === true) {
    const status = 401;
    const message = "Email and Password already exist";
    res.status(status).json({ status, message });
    return;
  }

  fs.readFile("./users.json", (err, data) => {
    if (err) {
      const status = 401;
      const message = err;
      res.status(status).json({ status, message });
      return;
    }

    // Get current users data
    var data = JSON.parse(data.toString());

    // Get the id of last user
    var last_item_id = data.users[data.users.length - 1].id;

    //Add new user
    data.users.push({ id: last_item_id + 1, email: email, password: password }); //add some data
    var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {
      // WRITE
      if (err) {
        const status = 401;
        const message = err;
        res.status(status).json({ status, message });
        return;
      }
    });
  });

  // Create token for new user
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });
});

// Login to one of the users from ./users.json
server.post("/auth/login", (req, res) => {
  console.log("login endpoint called; request body:");
  console.log(req.body);
  const { email, password } = req.body;
  if (!isAuthenticated({ email, password })) {
    return res.status(401).json({ status: 401, message: "Incorrect email or password" });
  }
  const access_token = createToken({ email, password });
  console.log("Access Token:" + access_token);
  res.status(200).json({ access_token });

  // Clean expired tokens from the blacklist
  console.log("cleaning stressed filled days");
  cleanExpiredTokens();
});

// Logout: Invalidate the token
server.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ status: 401, message: "No token provided" });
  }

  try {
    // Verify token before processing logout
    const verifyTokenResult = verifyToken(token);

    if (verifyTokenResult instanceof Error) {
      return res.status(401).json({ status: 401, message: "Invalid access token" });
    }

    // Add the token to the blacklist with the current timestamp to invalidate it
    tokenBlacklist.add({ token, timestamp: Date.now() });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    return res.status(401).json({ status: 401, message: "Error: access_token is revoked" });
  }
});

server.use(/^(?!\/auth).*$/, (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ status: 401, message: "Error in authorization format" });
  }

  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ status: 401, message: "Token has been revoked" });
  }

  try {
    const verifyTokenResult = verifyToken(token);

    if (verifyTokenResult instanceof Error) {
      return res.status(401).json({ status: 401, message: "Invalid access token" });
    }

    next();
  } catch (err) {
    res.status(401).json({ status: 401, message: "Error: access_token is revoked" });
  }
});

function isTokenBlacklisted(token) {
  // Check if the token exists in the blacklist and hasn't expired
  return [...tokenBlacklist].some(({ token: blacklistedToken, timestamp }) => {
    const now = Date.now();
    if (now - timestamp > TTL) {
      tokenBlacklist.delete({ token: blacklistedToken, timestamp }); // Remove expired token
      return false;
    }
    return blacklistedToken === token;
  });
}

// Function to clean expired tokens from the blacklist
function cleanExpiredTokens() {
  const now = Date.now();

  // Iterate over the blacklisted tokens and remove expired ones
  for (const { token, timestamp } of tokenBlacklist) {
    if (now - timestamp > TTL) {
      tokenBlacklist.delete({ token, timestamp });
    }
  }
}

server.use(router);

server.listen(8000, () => {
  console.log("Run Auth API Server");
});
