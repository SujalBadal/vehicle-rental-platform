require("dotenv").config();

const app = require("./app");
const connectToDatabase = require("./config/database");

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
      throw new Error("Set CLIENT_URL to the production frontend origin.");
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes("replace-this")) {
      throw new Error("Set JWT_SECRET in server/.env to a random value at least 32 characters long.");
    }

    await connectToDatabase();

    app.listen(port, () => {
      console.log(`Server is listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Could not start the server:", error.message);
    process.exit(1);
  }
}

startServer();
