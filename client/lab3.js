document.addEventListener("DOMContentLoaded", function () {
  var map = L.map("map").setView([51.505, -0.09], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const countryDropdown = document.getElementById("countryDropdown");

  const listDropdown = document.getElementById("listDropdown");
  const newListNameInput = document.getElementById("newListName");
  const createListBtn = document.getElementById("createListBtn");
  const destinationListContainer = document.getElementById("list");

  let currentPage = 1;
  let totalResults = 0;
  let resultsPerPage = 3;

  let markers = [];
  let lists = [];

  function sanitizeInput(input) {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadAllLocations() {
    fetch("http://localhost:3000/api/locations")
      .then((response) => response.json())
      .then((locations) => {
        locations.forEach((location) => {
          const marker = L.marker([
            location.latitude,
            location.longitude,
          ]).addTo(map);

          marker.locationData = location;

          marker.bindPopup(createPopupContent(location));
          markers.push(marker);
        });
      })
      .catch((error) => console.error("Error fetching locations:", error));
  }

  function createPopupContent(location) {
    return `
      <b>${location.name}, ${location.region}</b><br>
      <p><strong>Tourists:</strong> ${location.tourists}</p>
      <p><strong>Currency:</strong> ${location.currency}</p>
      <p><strong>Religion:</strong> ${location.religion}</p>
      <p><strong>Famous Foods:</strong> ${location.food}</p>
      <p><strong>Language:</strong> ${location.language}</p>
      <p><strong>Best Time to Visit:</strong> ${location.bestTime}</p>
      <p><strong>Cost of Living:</strong> ${location.cost}</p>
      <p><strong>Safety:</strong> ${location.safety}</p>
      <p><strong>Cultural Significance:</strong> ${location.significance}</p>
      <p><strong>Description:</strong> ${location.description}</p>
    `;
  }

  window.addToList = function (destinationName) {
    const selectedListId = document.getElementById("addToListDropdown").value;
    if (!selectedListId) {
      alert("Please select a list to add the destination.");
      return;
    }

    const selectedList = lists.find((list) => list.id == selectedListId);

    const isAlreadyInList = selectedList.destinations.some(
      (destination) => destination.name === destinationName
    );

    if (isAlreadyInList) {
      alert(
        `"${destinationName}" is already in the list "${selectedList.name}".`
      );
      return;
    }

    const destination = { name: destinationName };

    fetch(`http://localhost:3000/api/lists/${selectedListId}/destinations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ destination }),
    })
      .then((response) => response.json())
      .then((updatedList) => {
        selectedList.destinations.push(destination);
        alert(`Added "${destinationName}" to list "${selectedList.name}".`);
        displayListDestinations(selectedListId);
      })
      .catch((error) => console.error("Error adding to list:", error));
  };

  loadAllLocations();

  fetch("http://localhost:3000/api/countries")
    .then((response) => response.json())
    .then((countries) => {
      countries.forEach((country) => {
        const option = new Option(country, country);
        countryDropdown.add(option);
      });
    })
    .catch((error) => console.error("Error fetching countries:", error));

  countryDropdown.addEventListener("change", function () {
    const selectedCountry = countryDropdown.value;
    const resultsPerPage = resultsPerPageDropdown.value;

    if (selectedCountry) {
      fetchResults(selectedCountry, resultsPerPage, 1);
      zoomToLocation(selectedCountry, "country");
    } else {
      clearMarkers();
      loadAllLocations();
      map.setView([51.505, -0.09], 5);
    }
  });

  resultsPerPageDropdown.addEventListener("change", function () {
    resultsPerPage = parseInt(resultsPerPageDropdown.value, 10);
    const selectedCountry = countryDropdown.value;
    if (selectedCountry) {
      fetchResults(selectedCountry, resultsPerPageDropdown.value, 1);
    }
  });

  function updateMapMarkers(country, city) {
    clearMarkers();

    fetch(
      `http://localhost:3000/api/filtered-locations?country=${encodeURIComponent(
        country
      )}&city=${encodeURIComponent(city)}`
    )
      .then((response) => response.json())
      .then((locations) => {
        locations.forEach((location) => {
          const marker = L.marker([
            location.latitude,
            location.longitude,
          ]).addTo(map);

          marker.bindPopup(createPopupContent(location));
          markers.push(marker);
        });
      })
      .catch((error) =>
        console.error("Error fetching filtered locations:", error)
      );
  }

  function clearMarkers() {
    markers.forEach((marker) => map.removeLayer(marker));
    markers = [];
  }

  function zoomToLocation(country) {
    fetch(
      `http://localhost:3000/api/filtered-locations?country=${encodeURIComponent(
        country
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        const locations = data.locations;
        if (locations.length) {
          const { latitude, longitude } = locations[0];
          map.setView([latitude, longitude], 6);
        }
      })
      .catch((error) =>
        console.error(`Error fetching location for zoom: ${country}`, error)
      );
  }

  function loadLists() {
    return fetch("http://localhost:3000/api/lists")
      .then((response) => response.json())
      .then((fetchedLists) => {
        lists = fetchedLists;
        const listDropdown = document.getElementById("listDropdown");

        while (listDropdown.firstChild) {
          listDropdown.removeChild(listDropdown.firstChild);
        }

        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a list";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        listDropdown.appendChild(placeholderOption);

        const createOption = document.createElement("option");
        createOption.value = "create";
        createOption.textContent = "+ Create New List";
        listDropdown.appendChild(createOption);

        lists.forEach((list) => {
          const option = document.createElement("option");
          option.value = list.id;
          option.textContent = list.name;
          listDropdown.appendChild(option);
        });
      })
      .catch((error) => console.error("Error loading lists:", error));
  }

  listDropdown.addEventListener("change", function () {
    const deleteListBtn = document.getElementById("deleteListBtn");
    const sortDropdown = document.getElementById("sortDropdown");

    if (listDropdown.value === "create") {
      newListNameInput.style.display = "inline";
      createListBtn.style.display = "inline";
      deleteListBtn.style.display = "none";
      sortDropdown.style.display = "none";
    } else {
      newListNameInput.style.display = "none";
      createListBtn.style.display = "none";
      deleteListBtn.style.display = "inline";
      sortDropdown.style.display = "inline";
      displayListDestinations(listDropdown.value);
    }
  });

  document.getElementById("deleteListBtn").addEventListener("click", () => {
    const selectedListId = listDropdown.value;
    if (selectedListId && selectedListId !== "create") {
      deleteList(selectedListId);
    } else {
      alert("Please select a valid list to delete.");
    }
  });

  function deleteList(listId) {
    fetch(`http://localhost:3000/api/lists/${listId}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then(() => {
        alert("List deleted successfully.");
        return loadLists();
      })
      .then(updateMarkerPopups)
      .catch((error) => console.error("Error deleting list:", error));
  }

  function displayListDestinations(listId, sortBy = "name") {
    fetch(`http://localhost:3000/api/lists/${listId}`)
      .then((response) => response.json())
      .then((list) => {
        destinationListContainer.innerHTML = "";

        list.destinations.sort((a, b) => {
          if (a[sortBy] < b[sortBy]) return -1;
          if (a[sortBy] > b[sortBy]) return 1;
          return 0;
        });

        list.destinations.forEach((destination) => {
          const listItem = document.createElement("li");
          listItem.className = "destination-item";
          listItem.innerHTML = `
            <h3>${destination.name}</h3>
            <p><strong>Country:</strong> ${destination.country}</p>
            <p><strong>Tourists:</strong> ${destination.tourists}</p>
            <p><strong>Currency:</strong> ${destination.currency}</p>
            <p><strong>Religion:</strong> ${destination.religion}</p>
            <p><strong>Famous Foods:</strong> ${destination.food}</p>
            <p><strong>Language:</strong> ${destination.language}</p>
            <p><strong>Best Time to Visit:</strong> ${destination.bestTime}</p>
            <p><strong>Cost of Living:</strong> ${destination.cost}</p>
            <p><strong>Safety:</strong> ${destination.safety}</p>
            <p><strong>Cultural Significance:</strong> ${destination.significance}</p>
            <p><strong>Description:</strong> ${destination.description}</p>
            <button class="delete-btn" onclick="deleteDestinationFromList('${listId}', '${destination.name}')">Delete</button>
          `;
          destinationListContainer.appendChild(listItem);
        });
      })
      .catch((error) =>
        console.error("Error fetching list destinations:", error)
      );
  }

  window.deleteDestinationFromList = function (listId, destinationName) {
    fetch(`http://localhost:3000/api/lists/${listId}/destinations`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ destinationName }),
    })
      .then((response) => response.json())
      .then((updatedList) => {
        alert(`Deleted "${destinationName}" from list.`);
        displayListDestinations(listId);
      })
      .catch((error) => console.error("Error deleting destination:", error));
  };

  listDropdown.addEventListener("change", function () {
    const deleteListBtn = document.getElementById("deleteListBtn");
    const sortSection = document.getElementById("sortSection");

    if (listDropdown.value === "create") {
      newListNameInput.style.display = "inline";
      createListBtn.style.display = "inline";
      deleteListBtn.style.display = "none";
      sortSection.style.display = "none";
    } else {
      newListNameInput.style.display = "none";
      createListBtn.style.display = "none";
      deleteListBtn.style.display = "inline";
      sortSection.style.display = "inline";
      displayListDestinations(listDropdown.value);
    }
  });

  createListBtn.addEventListener("click", function () {
    const newListName = newListNameInput.value.trim();
    const sanitizedListName = sanitizeInput(newListName);

    if (!sanitizedListName) {
      alert("Please enter a list name.");
      return;
    }

    const isDuplicateName = lists.some(
      (list) => list.name === sanitizedListName
    );
    if (isDuplicateName) {
      alert(`A list with the name "${sanitizedListName}" already exists.`);
      return;
    }

    fetch("http://localhost:3000/api/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: sanitizedListName }),
    })
      .then((response) => response.json())
      .then(() => loadLists())
      .then(loadAddListDropdown)
      .then(() => {
        newListNameInput.value = "";
        newListNameInput.style.display = "none";
        createListBtn.style.display = "none";
        alert(`List "${sanitizedListName}" created successfully.`);
      })
      .catch((error) => console.error("Error creating list:", error));
  });

  function updateMarkerPopups() {
    markers.forEach((marker) => {
      if (marker.locationData) {
        marker.setPopupContent(createPopupContent(marker.locationData));
      }
    });
  }

  loadLists();

  function fetchResults(country, resultsPerPage, page) {
    currentPage = page;
    clearMarkers();

    fetch(
      `http://localhost:3000/api/filtered-locations?country=${country}&limit=${resultsPerPage}&page=${page}`
    )
      .then((response) => response.json())
      .then((data) => {
        totalResults = data.totalResults;
        const locations = data.locations;

        displayLocations(locations);
        updateMapMarkers(locations);
        setupPaginationControls();
      })
      .catch((error) =>
        console.error("Error fetching filtered locations:", error)
      );
  }

  function updateMapMarkers(locations) {
    locations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude]).addTo(
        map
      );
      marker.bindPopup(createPopupContent(location));
      markers.push(marker);
    });
  }

  function displayLocations(locations) {
    const searchResultsList = document.getElementById("searchResultsList");
    searchResultsList.innerHTML = "";

    locations.forEach((location) => {
      const listItem = document.createElement("li");
      listItem.className = "search-result-item";
      listItem.innerHTML = `
        <div class="result-content">
          <strong>${location.name} (${location.region})</strong>
          <button class="addToListBtn">Add to List</button>
        </div>
      `;

      // Add event listener to the "Add to List" button for each search result
      listItem.querySelector(".addToListBtn").addEventListener("click", () => {
        const selectedListId = document.getElementById("addListDropdown").value;
        if (!selectedListId) {
          alert("Please select a list to add the destination.");
          return;
        }
        addToList(selectedListId, location);
      });

      searchResultsList.appendChild(listItem);
    });
  }

  function addToList(listId, location) {
    fetch(`http://localhost:3000/api/lists/${listId}/destinations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ destination: { name: location.name } }),
    })
      .then((response) => response.json())
      .then(() => {
        alert(`Added "${location.name}" to the selected list.`);
      })
      .catch((error) => console.error("Error adding to list:", error));
  }

  // Function to load lists into the add-to-list dropdown
  function loadAddListDropdown() {
    fetch("http://localhost:3000/api/lists")
      .then((response) => response.json())
      .then((fetchedLists) => {
        const addListDropdown = document.getElementById("addListDropdown");
        addListDropdown.innerHTML = ""; // Clear existing options

        // Add a placeholder option at the top
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a list";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        addListDropdown.appendChild(placeholderOption);

        // Populate dropdown with list options
        fetchedLists.forEach((list) => {
          const option = document.createElement("option");
          option.value = list.id;
          option.textContent = list.name;
          addListDropdown.appendChild(option);
        });
      })
      .catch((error) =>
        console.error("Error loading add-to-list dropdown:", error)
      );
  }

  loadAddListDropdown();

  function setupPaginationControls() {
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const currentPageDisplay = document.getElementById("currentPage");

    currentPageDisplay.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage * resultsPerPage >= totalResults;
  }

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchResults(countryDropdown.value, resultsPerPage, currentPage);
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    if (currentPage * resultsPerPage < totalResults) {
      currentPage++;
      fetchResults(countryDropdown.value, resultsPerPage, currentPage);
    }
  });

  document
    .getElementById("sortDropdown")
    .addEventListener("change", function () {
      const selectedListId = listDropdown.value;
      const sortBy = this.value;
      if (selectedListId) {
        displayListDestinations(selectedListId, sortBy);
      }
    });
});
