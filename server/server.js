const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));

const csvFilePath = path.join(__dirname, "data", "europe-destinations.csv");

app.get("/api/locations", (req, res) => {
  const locations = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      if (row["Latitude"] && row["Longitude"]) {
        locations.push({
          name: row["﻿Destination"],
          country: row["Country"],
          region: row["Region"],
          latitude: parseFloat(row["Latitude"]),
          longitude: parseFloat(row["Longitude"]),
          tourists: row["Approximate Annual Tourists"],
          currency: row["Currency"],
          religion: row["Majority Religion"],
          food: row["Famous Foods"],
          language: row["Language"],
          bestTime: row["Best Time to Visit"],
          cost: row["Cost of Living"],
          safety: row["Safety"],
          significance: row["Cultural Significance"],
          description: row["Description"],
        });
      }
    })
    .on("end", () => {
      res.json(locations);
    })
    .on("error", (error) => {
      res.status(500).json({ error: "Failed to read locations from CSV." });
    });
});

app.get("/api/filtered-locations", (req, res) => {
  const { country, limit = 5, page = 1 } = req.query;
  const filteredLocations = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      if (row["Country"] === country && row["Latitude"] && row["Longitude"]) {
        filteredLocations.push({
          name: row["﻿Destination"],
          country: row["Country"],
          region: row["Region"],
          latitude: parseFloat(row["Latitude"]),
          longitude: parseFloat(row["Longitude"]),
          tourists: row["Approximate Annual Tourists"],
          currency: row["Currency"],
          religion: row["Majority Religion"],
          food: row["Famous Foods"],
          language: row["Language"],
          bestTime: row["Best Time to Visit"],
          cost: row["Cost of Living"],
          safety: row["Safety"],
          significance: row["Cultural Significance"],
          description: row["Description"],
        });
      }
    })
    .on("end", () => {
      const startIndex = (page - 1) * limit;
      const paginatedResults = filteredLocations.slice(
        startIndex,
        startIndex + parseInt(limit)
      );

      res.json({
        totalResults: filteredLocations.length,
        locations: paginatedResults,
      });
    })
    .on("error", (error) => {
      res.status(500).json({ error: "Failed to read locations from CSV." });
    });
});

app.get("/api/countries", (req, res) => {
  const countries = new Set();

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      if (row.Country) {
        countries.add(row.Country);
      }
    })
    .on("end", () => {
      res.json(Array.from(countries));
    });
});

app.get("/api/cities", (req, res) => {
  const selectedCountry = req.query.country;
  const cities = new Set();

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      if (row["Country"] === selectedCountry && row["﻿Destination"]) {
        cities.add(row["﻿Destination"]);
      }
    })
    .on("end", () => {
      res.json(Array.from(cities));
    })
    .on("error", (error) => {
      res.status(500).json({ error: "Failed to read cities from CSV." });
    });
});

let lists = [];

app.post("/api/lists", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "List name is required" });
  }

  const newList = { id: lists.length + 1, name, destinations: [] };
  lists.push(newList);
  res.json(newList);
});

app.get("/api/lists", (req, res) => {
  res.json(lists);
});

app.get("/api/lists/:id", (req, res) => {
  const listId = parseInt(req.params.id);
  const list = lists.find((l) => l.id === listId);

  if (!list) {
    return res.status(404).json({ error: "List not found" });
  }
  res.json(list);
});

app.post("/api/lists/:id/destinations", (req, res) => {
  const listId = parseInt(req.params.id);
  const { destination } = req.body;

  if (!destination || !destination.name) {
    return res.status(400).json({ error: "Destination data is required" });
  }

  const list = lists.find((l) => l.id === listId);
  if (!list) {
    return res.status(404).json({ error: "List not found" });
  }

  let destinationFound = false;

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      if (row["﻿Destination"] === destination.name) {
        const fullDestination = {
          name: row["﻿Destination"],
          country: row["Country"],
          tourists: row["Approximate Annual Tourists"],
          currency: row["Currency"],
          religion: row["Majority Religion"],
          food: row["Famous Foods"],
          language: row["Language"],
          bestTime: row["Best Time to Visit"],
          cost: row["Cost of Living"],
          safety: row["Safety"],
          significance: row["Cultural Significance"],
          description: row["Description"],
          latitude: parseFloat(row["Latitude"]),
          longitude: parseFloat(row["Longitude"]),
        };

        list.destinations.push(fullDestination);
        destinationFound = true;
        res.json(list);
      }
    })
    .on("end", () => {
      if (!destinationFound) {
        res.status(404).json({ error: "Destination not found" });
      }
    })
    .on("error", (error) => {
      res.status(500).json({ error: "Error reading destination data" });
    });
});

app.put("/api/lists/:id", (req, res) => {
  const listId = parseInt(req.params.id);
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "List name is required" });
  }

  const list = lists.find((l) => l.id === listId);
  if (!list) {
    return res.status(404).json({ error: "List not found" });
  }

  list.name = name;
  res.json(list);
});

app.delete("/api/lists/:id", (req, res) => {
  const listId = parseInt(req.params.id);
  const listIndex = lists.findIndex((l) => l.id === listId);

  if (listIndex === -1) {
    return res.status(404).json({ error: "List not found" });
  }

  lists.splice(listIndex, 1);
  res.json({ message: "List deleted successfully" });
});

app.delete("/api/lists/:id/destinations", (req, res) => {
  const listId = parseInt(req.params.id);
  const { destinationName } = req.body;

  const list = lists.find((l) => l.id === listId);
  if (!list) {
    return res.status(404).json({ error: "List not found" });
  }

  const destinationIndex = list.destinations.findIndex(
    (d) => d.name === destinationName
  );

  if (destinationIndex === -1) {
    return res.status(404).json({ error: "Destination not found in the list" });
  }

  list.destinations.splice(destinationIndex, 1);
  res.json(list);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
