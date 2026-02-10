document.addEventListener("DOMContentLoaded", () => {
  const appleList = document.getElementById("apple-list");
  const filterForm = document.getElementById("filter-form");
 
  const fetchApples = (query = "") => {
    appleList.innerHTML = "<li class='list-group-item'>Loading...</li>";
 
    fetch("https://appleexplorer.onrender.com/apples" + query)
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((data) => {
        appleList.innerHTML = "";
 
        if (data.length === 0) {
          appleList.innerHTML = "<li class='list-group-item'>No apples found.</li>";
          return;
        }
 
        data.forEach((apple) => {
          const li = document.createElement("li");
          li.classList.add("list-group-item");
 
          li.innerHTML = `
            <strong>Cultivar:</strong> ${apple.cultivarName || "N/A"}<br>
            <strong>Accession:</strong> ${apple.accession || "N/A"}<br>
            <strong>Harvest Date:</strong> ${apple.harvestDate || "N/A"}<br>
            <strong>Taste Notes:</strong> ${apple.tasteNotes || "N/A"}<br>
            <strong>Notes:</strong> ${apple.notes || "N/A"}<br>
            <strong>Origin:</strong> ${apple.origin?.country || "N/A"}, ${apple.origin?.province || ""}, ${apple.origin?.city || ""}<br>
            <strong>Genus:</strong> ${apple.profile?.genus || "N/A"}<br>
            <strong>Species:</strong> ${apple.profile?.species || "N/A"}<br>
            <strong>Pedigree:</strong> ${apple.profile?.pedigree || "N/A"}<br>
            <strong>Size:</strong> ${apple.attributes?.size || "N/A"}<br>
            <strong>Color:</strong> ${apple.attributes?.color || "N/A"}<br>
            <strong>Weight:</strong> ${apple.attributes?.weight || "N/A"}
          `;
 
          appleList.appendChild(li);
        });
      })
      .catch((error) => {
        console.error("Error fetching apples:", error);
        appleList.innerHTML = "<li class='list-group-item text-danger'>Failed to load apple data.</li>";
      });
  };
 
  // Initial fetch
  fetchApples();
 
  // Handle filter form submission
  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(filterForm);
      const query = new URLSearchParams(formData).toString();
      fetchApples("?" + query);
    });
  }
});