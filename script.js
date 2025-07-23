const TRAFFIT_API_URL =
  "https://<company>.traffit.com/public/job_posts/published";
const API_PAGE_SIZE = 50;
const DISPLAY_PAGE_SIZE = 10;

const jobListingsContainer = document.getElementById("jobListings");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfoSpan = document.getElementById("pageInfo");
const searchQueryInput = document.getElementById("searchQueryInput");
const applySearchBtn = document.getElementById("applySearch");
const clearSearchBtn = document.getElementById("clearSearch");
const sortDirectionSelect = document.getElementById("sortDirection");

let allRawJobs = [];
let currentFilteredAndSortedJobs = [];
let currentPage = 1;

function showMessage(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = message;
    el.style.display = "block";
  }
}

function hideMessage(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = "none";
  }
}

function renderMessages() {
  hideMessage("loadingMessage");
  hideMessage("errorMessage");
  hideMessage("noResultsMessage");
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(
    currentFilteredAndSortedJobs.length / DISPLAY_PAGE_SIZE
  );
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages;
  pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
}

function getAdvertValue(valuesArray, fieldId) {
  const item = valuesArray?.find((v) => v.field_id === fieldId);
  return item?.value || null;
}

function getFirstDescriptionBlock(fullDescription) {
  if (!fullDescription) {
    return "";
  }
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = fullDescription;
  const firstParagraph = tempDiv.querySelector("p");
  if (firstParagraph) {
    return firstParagraph.textContent.trim();
  } else {
    return tempDiv.textContent.trim();
  }
}

function renderJobs() {
  renderMessages();
  jobListingsContainer.innerHTML = "";

  const startIndex = (currentPage - 1) * DISPLAY_PAGE_SIZE;
  const endIndex = startIndex + DISPLAY_PAGE_SIZE;
  const jobsToDisplay = currentFilteredAndSortedJobs.slice(
    startIndex,
    endIndex
  );

  if (jobsToDisplay.length === 0) {
    showMessage(
      "noResultsMessage",
      "No job listings found for the current criteria."
    );
  } else {
    jobsToDisplay.forEach((job) => {
      const jobTitle = job.options?._title || "Untitled Job";
      const jobLocation = job.options?._location || "N/A";
      const rateFrom = job.options?._rateFrom || null;
      const rateTo = job.options?._rateTo || null;

      const jobApplicationUrl = job.url || "#";

      const publishedDate = job.valid_start
        ? new Date(job.valid_start).toLocaleDateString()
        : "N/A";

      let newTag = "";
      if (job.valid_start) {
        const publishedDateTime = new Date(job.valid_start);
        const today = new Date();
        publishedDateTime.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - publishedDateTime.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 5 && diffDays >= 0) {
          newTag = ' <span class="newJobTag">New</span>';
        }
      }

      const fullDescription = getAdvertValue(job.advert?.values, "description");
      const firstBlockDescription =
        getFirstDescriptionBlock(fullDescription) ||
        "No description available.";

      let rateDisplay = "";
      if (rateFrom && rateTo) {
        rateDisplay = `<p><strong>Hourly Rate:</strong> ${rateFrom}-${rateTo} PLN/hour</p>`;
      } else if (rateFrom) {
        rateDisplay = `<p><strong>Hourly Rate From:</strong> ${rateFrom} PLN/hour</p>`;
      } else if (rateTo) {
        rateDisplay = `<p><strong>Hourly Rate To:</strong> ${rateTo} PLN/hour</p>`;
      }

      const jobItem = document.createElement("div");
      jobItem.classList.add("jobItem");
      jobItem.innerHTML = `
      <h3>${jobTitle}${newTag}</h3>
      <p><strong>Location:</strong> ${jobLocation}</p>
      ${rateDisplay}
      <p><strong>Description:</strong> ${firstBlockDescription.substring(
        0,
        250
      )}${firstBlockDescription.length > 250 ? "..." : ""}</p>
      <p><strong>Published:</strong> ${publishedDate}</p>
      <a href="${jobApplicationUrl}" target="_blank" class="jobLink">View Details & Apply</a>`;
      jobListingsContainer.appendChild(jobItem);
    });
  }
  updatePaginationButtons();
}

function applyFiltersAndSort() {
  let filteredJobs = [...allRawJobs];
  const query = searchQueryInput.value.toLowerCase().trim();

  if (query) {
    filteredJobs = filteredJobs.filter((job) => {
      const titleMatch =
        job.options?._title && job.options._title.toLowerCase().includes(query);
      const descriptionValue = getAdvertValue(
        job.advert?.values,
        "description"
      );
      const descriptionMatch =
        descriptionValue && descriptionValue.toLowerCase().includes(query);
      return titleMatch || descriptionMatch;
    });
  }

  const sortField = "published_at";
  const sortDirection = sortDirectionSelect.value;

  filteredJobs.sort((a, b) => {
    let valA = a.valid_start ? new Date(a.valid_start).getTime() : 0;
    let valB = b.valid_start ? new Date(b.valid_start).getTime() : 0;

    if (valA < valB) {
      return sortDirection === "ASC" ? -1 : 1;
    }
    if (valA > valB) {
      return sortDirection === "ASC" ? 1 : -1;
    }
    return 0;
  });

  currentFilteredAndSortedJobs = filteredJobs;
  currentPage = 1;
  renderJobs();
}

async function fetchAllJobs() {
  showMessage(
    "loadingMessage",
    "Loading all job listings (this may take a moment)..."
  );
  allRawJobs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const headers = {
      "X-Request-Page-Size": API_PAGE_SIZE.toString(),
      "X-Request-Current-Page": page.toString(),
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(TRAFFIT_API_URL, { headers: headers });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const jobs = await response.json();
      allRawJobs = allRawJobs.concat(jobs);

      if (jobs.length < API_PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error("Error fetching all job listings:", error);
      renderMessages();
      showMessage(
        "errorMessage",
        "Failed to load job listings. Please try again later."
      );
      hasMore = false;
      return;
    }
  }
  renderMessages();

  if (allRawJobs.length === 0) {
    showMessage("noResultsMessage", "No job listings found from the API.");
  }

  applyFiltersAndSort();
}

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderJobs();
  }
});

nextPageBtn.addEventListener("click", () => {
  const totalPages = Math.ceil(
    currentFilteredAndSortedJobs.length / DISPLAY_PAGE_SIZE
  );
  if (currentPage < totalPages) {
    currentPage++;
    renderJobs();
  }
});

applySearchBtn.addEventListener("click", () => {
  applyFiltersAndSort();
});

clearSearchBtn.addEventListener("click", () => {
  searchQueryInput.value = "";
  applyFiltersAndSort();
});

searchQueryInput.addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    applyFiltersAndSort();
  }
});

sortDirectionSelect.addEventListener("change", () => {
  applyFiltersAndSort();
});

fetchAllJobs();
