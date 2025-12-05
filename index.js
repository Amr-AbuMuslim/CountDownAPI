const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { log } = require("console");

const app = express();
app.use(cors());
app.use(express.json());

// Ensure data file exists
// Paths
const DATA_FILE = path.join(__dirname, "data", "CountdownData.json");

if (!fs.existsSync(DATA_FILE)) {
  const initialData = { targetNights: 700, entries: [] };
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); // Ensure folder exists
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  console.log("Created initial CountdownData.json");
}

// Utility function to read data
const readData = () => {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    // Ensure entries array exists
    if (!parsed.entries || !Array.isArray(parsed.entries)) {
      parsed.entries = [];
    }

    // Ensure targetNights exists
    if (typeof parsed.targetNights !== "number") {
      parsed.targetNights = 700;
    }

    return parsed;
  } catch (err) {
    console.error("Error reading data:", err);
    return { targetNights: 700, entries: [] };
  }
};


// Utility function to save data
const saveData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving data:", err);
  }
};

// GET all countdown data
app.get("/countdown", (req, res) => {
  const data = readData();
  res.json(data);
});
// POST new entry
app.post("/countdown", (req, res) => {
  try {
    const { salesAgent, dealDate, companyName, totalNights } = req.body;

    if (!salesAgent || !dealDate || !companyName || !totalNights) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const data = readData();

    // Convert dealDate to UTC
    const utcDealDate = new Date(dealDate).toISOString();

    const newEntry = {
      id: `cd-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(), // Automatically UTC
      salesAgent,
      dealDate: utcDealDate,
      companyName,
      totalNights
    };

    data.entries.push(newEntry);
    saveData(data);

    res.json(newEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save new entry" });
  }
});


// PUT update entry
app.put("/countdown/:id", (req, res) => {
  try {
    const data = readData();
    const index = data.entries.findIndex((e) => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Entry not found" });

    data.entries[index] = { ...data.entries[index], ...req.body };
    saveData(data);
    res.json(data.entries[index]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update entry" });
  }
});

// DELETE entry
app.delete("/countdown/:id", (req, res) => {
  try {
    const data = readData();
    const originalLength = data.entries.length;
    data.entries = data.entries.filter((e) => e.id !== req.params.id);

    if (data.entries.length === originalLength) {
      return res.status(404).json({ error: "Entry not found" });
    }

    saveData(data);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
