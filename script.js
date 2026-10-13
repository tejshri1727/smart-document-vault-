
const STORAGE_KEY = "smartVaultDocuments";
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = ["Vehicle", "Mobile", "Home Appliance"];

const TYPES = {
  Vehicle: [
    "RC", "Insurance", "PUC", "Vehicle Warranty",
    "Vehicle Bill", "Other"
  ],
  Mobile: ["Mobile Warranty", "Mobile Bill", "Other"],
  "Home Appliance": [
    "Refrigerator Warranty", "Washing Machine Warranty",
    "TV Warranty", "AC Warranty", "Microwave Warranty",
    "Other Appliance Warranty", "Appliance Bill", "Other"
  ]
};

function getDocuments() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Unable to read saved documents:", error);
    return [];
  }
}

function saveDocuments(documents) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    // Notify other components on the same page.
    document.dispatchEvent(new Event("vaultUpdated"));
    return true;
  } catch (error) {
    console.error("Unable to save documents:", error);
    alert("Could not save. Browser storage may be full.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Parse YYYY-MM-DD as a local calendar date.
function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function getStatus(expiry) {
  const date = parseDate(expiry);
  if (!date) return "No expiry date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.round((date - today) / DAY_MS);

  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring Soon";
  return "Active";
}

function displayDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN") : "Not provided";
}

function statusClass(status) {
  if (status === "Expired") return "expired";
  if (status === "Expiring Soon") return "soon";
  if (status === "Active") return "";
  return "neutral";
}

function renderDocumentCard(doc, showActions = true) {
  const status = getStatus(doc.expiry);

  return `
    <article class="document-card">
      <h3>${escapeHTML(doc.name)}</h3>
      <p><b>Category:</b> ${escapeHTML(doc.category)}</p>
      <p><b>Type:</b> ${escapeHTML(doc.type)}</p>
      <p><b>Brand / Vehicle:</b> ${escapeHTML(doc.brand || "Not provided")}</p>
      <p><b>Document No.:</b> ${escapeHTML(doc.number || "Not provided")}</p>
      <p><b>Purchase / Issue Date:</b> ${displayDate(doc.issue)}</p>
      <p><b>Expiry Date:</b> ${displayDate(doc.expiry)}</p>
      <span class="status ${statusClass(status)}">${status}</span>
      ${doc.fileName
        ? `<p><b>Selected file:</b> ${escapeHTML(doc.fileName)}</p>`
        : ""}
      ${showActions ? `
        <div class="document-actions">
          <button type="button" data-edit="${escapeHTML(doc.id)}">Edit</button>
          <button type="button" class="delete-btn"
            data-delete="${escapeHTML(doc.id)}">Delete</button>
        </div>
      ` : ""}
    </article>
  `;
}

function setupAddForm() {
  const form = document.getElementById("documentForm");
  if (!form) return;

  const category = document.getElementById("category");
  const type = document.getElementById("type");
  const nameLabel = document.getElementById("nameLabel");
  const brandLabel = document.getElementById("brandLabel");
  const numberLabel = document.getElementById("numberLabel");
  const expiry = document.getElementById("expiry");

  if (!category || !type || !expiry) return;

  function updateTypes() {
    const items = TYPES[category.value] || TYPES.Vehicle;
    type.replaceChildren();

    items.forEach(item => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      type.appendChild(option);
    });

    if (nameLabel) {
      nameLabel.textContent = category.value === "Vehicle"
        ? "Document Name" : "Product / Appliance Name";
    }

    if (brandLabel) {
      brandLabel.textContent = category.value === "Vehicle"
        ? "Vehicle Number" : "Brand and Model";
    }

    if (numberLabel) {
      numberLabel.textContent = category.value === "Mobile"
        ? "IMEI Number (optional)"
        : "Document / Serial Number (optional)";
    }

    expiry.required = !type.value.toLowerCase().includes("bill");
  }

  category.addEventListener("change", updateTypes);
  type.addEventListener("change", () => {
    expiry.required = !type.value.toLowerCase().includes("bill");
  });
  updateTypes();

  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("name");
    const brand = document.getElementById("brand");
    const number = document.getElementById("number");
    const issue = document.getElementById("issue");
    const fileInput = document.getElementById("documentFile");
    const file = fileInput?.files?.[0];

    if (!name?.value.trim()) {
      alert("Please enter a document or product name.");
      name?.focus();
      return;
    }

    if (expiry.required && !parseDate(expiry.value)) {
      alert("Please enter a valid expiry date.");
      expiry.focus();
      return;
    }

    if (issue?.value && !parseDate(issue.value)) {
      alert("Please enter a valid purchase / issue date.");
      issue.focus();
      return;
    }

    const record = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(36).slice(2),
      category: category.value,
      type: type.value,
      name: name.value.trim(),
      brand: brand?.value.trim() || "",
      number: number?.value.trim() || "",
      issue: issue?.value || "",
      expiry: expiry.value || "",
      fileName: file ? file.name : ""
    };

    const documents = getDocuments();
    documents.push(record);

    if (saveDocuments(documents)) {
      alert("Document details saved successfully!");
      window.location.href = "documents.html";
    }
  });
}

function editDocument(id) {
  const documents = getDocuments();
  const doc = documents.find(item => item.id === id);
  if (!doc) return alert("Document not found.");

  const name = prompt("Document / Product Name:", doc.name);
  if (name === null) return;
  if (!name.trim()) return alert("Name cannot be empty.");

  const categoryText = prompt(
    "Category: Vehicle, Mobile, or Home Appliance",
    doc.category
  );
  if (categoryText === null) return;

  const category = CATEGORIES.find(
    item => item.toLowerCase() === categoryText.trim().toLowerCase()
  );
  if (!category) return alert("Please enter a valid category.");

  const typeText = prompt(
    "Document Type:",
    doc.type
  );
  if (typeText === null) return;
  if (!typeText.trim()) return alert("Document type cannot be empty.");

  const brand = prompt("Brand / Vehicle:", doc.brand || "");
  if (brand === null) return;

  const number = prompt("Document / Serial Number:", doc.number || "");
  if (number === null) return;

  const issue = prompt("Purchase / Issue Date (YYYY-MM-DD):", doc.issue || "");
  if (issue === null) return;
  if (issue && !parseDate(issue)) {
    return alert("Invalid issue date. Use YYYY-MM-DD.");
  }

  const expiry = prompt("Expiry Date (YYYY-MM-DD, or blank):", doc.expiry || "");
  if (expiry === null) return;
  if (expiry && !parseDate(expiry)) {
    return alert("Invalid expiry date. Use YYYY-MM-DD.");
  }

  const updated = {
    ...doc,
    name: name.trim(),
    category,
    type: typeText.trim(),
    brand: brand.trim(),
    number: number.trim(),
    issue,
    expiry
  };

  const index = documents.findIndex(item => item.id === id);
  documents[index] = updated;

  if (saveDocuments(documents)) {
    refreshCurrentPage();
  }
}

function deleteDocument(id) {
  const documents = getDocuments();
  const doc = documents.find(item => item.id === id);
  if (!doc) return;

  if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;

  if (saveDocuments(documents.filter(item => item.id !== id))) {
    refreshCurrentPage();
  }
}

function setupDocumentsPage() {
  const list = document.getElementById("documentList");
  if (!list) return;

  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const categoryFilter = document.getElementById("categoryFilter");
  const params = new URLSearchParams(window.location.search);

  if (categoryFilter &&
      CATEGORIES.includes(params.get("category"))) {
    categoryFilter.value = params.get("category");
  }

  function render() {
    const query = (search?.value || "").toLowerCase().trim();
    const selectedCategory = categoryFilter?.value || "";
    const selectedStatus = filter?.value || "";

    const docs = getDocuments().filter(doc => {
      const text = [
        doc.name, doc.type, doc.brand, doc.number, doc.category
      ].join(" ").toLowerCase();

      return text.includes(query)
        && (!selectedCategory || doc.category === selectedCategory)
        && (!selectedStatus || getStatus(doc.expiry) === selectedStatus);
    });

    list.innerHTML = docs.length
      ? docs.map(doc => renderDocumentCard(doc)).join("")
      : `<div class="empty-state">No matching documents found.<br>
          <a href="add-document.html">Add a document</a></div>`;
  }

  search?.addEventListener("input", render);
  filter?.addEventListener("change", render);
  categoryFilter?.addEventListener("change", render);

  list.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editDocument(editButton.dataset.edit);
    if (deleteButton) deleteDocument(deleteButton.dataset.delete);
  });

  document.addEventListener("vaultUpdated", render);
  window.addEventListener("storage", render);
  render();
}

function setupVehiclePage() {
  const list = document.getElementById("vehicleList");
  if (!list) return;

  function render() {
    const docs = getDocuments().filter(doc => doc.category === "Vehicle");

    list.innerHTML = docs.length
      ? docs.map(doc => renderDocumentCard(doc)).join("")
      : `<div class="empty-state">No vehicle records yet.<br>
          <a class="btn" href="add-document.html">Add Vehicle Document</a></div>`;
  }

  list.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editDocument(editButton.dataset.edit);
    if (deleteButton) deleteDocument(deleteButton.dataset.delete);
  });

  document.addEventListener("vaultUpdated", render);
  window.addEventListener("storage", render);
  render();
}

function setupRemindersPage() {
  const list = document.getElementById("reminderList");
  if (!list) return;

  function render() {
    const docs = getDocuments().filter(doc =>
      ["Expired", "Expiring Soon"].includes(getStatus(doc.expiry))
    );

    list.innerHTML = docs.length
      ? docs.map(doc => renderDocumentCard(doc)).join("")
      : `<div class="empty-state">No expired or upcoming expiry dates found.</div>`;
  }

  list.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editDocument(editButton.dataset.edit);
    if (deleteButton) deleteDocument(deleteButton.dataset.delete);
  });

  document.addEventListener("vaultUpdated", render);
  window.addEventListener("storage", render);
  render();
}

function setupDashboard() {
  const total = document.getElementById("totalCount");
  const soon = document.getElementById("soonCount");
  const expired = document.getElementById("expiredCount");

  if (!total || !soon || !expired) return;

  function render() {
    const docs = getDocuments();

    total.textContent = docs.length;
    soon.textContent = docs.filter(
      doc => getStatus(doc.expiry) === "Expiring Soon"
    ).length;
    expired.textContent = docs.filter(
      doc => getStatus(doc.expiry) === "Expired"
    ).length;
  }

  document.addEventListener("vaultUpdated", render);
  window.addEventListener("storage", render);
  window.addEventListener("focus", render);
  render();
}

function refreshCurrentPage() {
  // Re-render after an edit/delete made with a prompt.
  document.dispatchEvent(new Event("vaultUpdated"));
}

document.addEventListener("DOMContentLoaded", () => {
  setupAddForm();
  setupDocumentsPage();
  setupVehiclePage();
  setupRemindersPage();
  setupDashboard();
});
