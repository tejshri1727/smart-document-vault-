
import { auth, db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = ["Vehicle", "Mobile", "Home Appliance"];

const TYPES = {
  Vehicle: [
    "RC", "Insurance", "PUC", "Vehicle Warranty", "Vehicle Bill", "Other"
  ],
  Mobile: [
    "Mobile Warranty", "Mobile Bill", "Other"
  ],
  "Home Appliance": [
    "Refrigerator Warranty",
    "Washing Machine Warranty",
    "TV Warranty",
    "AC Warranty",
    "Microwave Warranty",
    "Other Appliance Warranty",
    "Appliance Bill",
    "Other"
  ]
};

let currentUser = null;
let documentsCache = [];
let initialized = false;
let loadError = false;

// ---------------- FIRESTORE ----------------

function documentsCollection() {
  if (!currentUser) {
    throw new Error("User is not logged in.");
  }

  return collection(db, "users", currentUser.uid, "documents");
}

async function getDocuments() {
  if (!currentUser) return [];

  try {
    const snapshot = await getDocs(documentsCollection());

    documentsCache = snapshot.docs.map(item => ({
      ...item.data(),
      id: item.id
    }));

    loadError = false;
    return documentsCache;
  } catch (error) {
    console.error("Firestore load error:", error);
    loadError = true;
    return [];
  }
}

async function addDocumentRecord(record) {
  const result = await addDoc(documentsCollection(), {
    ...record,
    createdAt: new Date().toISOString(),
    reminderSent: false
  });

  return result.id;
}

async function updateDocumentRecord(id, record) {
  await updateDoc(
    doc(db, "users", currentUser.uid, "documents", id),
    record
  );
}

async function deleteDocumentRecord(id) {
  await deleteDoc(
    doc(db, "users", currentUser.uid, "documents", id)
  );
}

// ---------------- HELPERS ----------------

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

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

  return date
    ? date.toLocaleDateString("en-IN")
    : "Not provided";
}

function statusClass(status) {
  if (status === "Expired") return "expired";
  if (status === "Expiring Soon") return "soon";
  if (status === "Active") return "";
  return "neutral";
}

// ---------------- DOCUMENT CARD ----------------

function renderDocumentCard(item, showActions = true) {
  const status = getStatus(item.expiry);

  return `
    <article class="document-card">
      <h3>${escapeHTML(item.name || "Untitled Document")}</h3>

      <p><b>Category:</b> ${escapeHTML(item.category || "")}</p>
      <p><b>Type:</b> ${escapeHTML(item.type || "")}</p>

      <p>
        <b>Brand / Vehicle:</b>
        ${escapeHTML(item.brand || "Not provided")}
      </p>

      <p>
        <b>Document No.:</b>
        ${escapeHTML(item.number || "Not provided")}
      </p>

      <p>
        <b>Purchase / Issue Date:</b>
        ${displayDate(item.issue)}
      </p>

      <p>
        <b>Expiry Date:</b>
        ${displayDate(item.expiry)}
      </p>

      <span class="status ${statusClass(status)}">
        ${status}
      </span>

      ${
        item.fileName
          ? `<p><b>Selected file:</b> ${escapeHTML(item.fileName)}</p>`
          : ""
      }

      ${
        showActions
          ? `
            <div class="document-actions">
              <button type="button" data-edit="${escapeHTML(item.id)}">
                Edit
              </button>

              <button
                type="button"
                class="delete-btn"
                data-delete="${escapeHTML(item.id)}"
              >
                Delete
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function notifyUpdates() {
  document.dispatchEvent(new Event("vaultUpdated"));
}

function showLoadError(list) {
  if (loadError && list) {
    list.innerHTML = `
      <div class="empty-state">
        Could not load documents. Please check your internet,
        login status and Firestore Rules, then refresh the page.
      </div>
    `;
    return true;
  }

  return false;
}

// ---------------- ADD DOCUMENT ----------------

function setupAddForm() {
  const form = document.getElementById("documentForm");
  if (!form) return;

  const category = document.getElementById("category");
  const type = document.getElementById("type");
  const expiry = document.getElementById("expiry");
  const issue = document.getElementById("issue");

  if (!category || !type || !expiry) return;

  function updateTypes() {
    const items = TYPES[category.value] || TYPES.Vehicle;
    const previousValue = type.value;

    type.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select Document Type";
    type.appendChild(placeholder);

    items.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      type.appendChild(option);
    });

    if (items.includes(previousValue)) {
      type.value = previousValue;
    }

    const nameLabel = document.getElementById("nameLabel");
    const brandLabel = document.getElementById("brandLabel");
    const numberLabel = document.getElementById("numberLabel");

    if (nameLabel) {
      nameLabel.textContent = category.value === "Vehicle"
        ? "Document Name *"
        : "Product / Appliance Name *";
    }

    if (brandLabel) {
      brandLabel.textContent = category.value === "Vehicle"
        ? "Brand / Vehicle Number"
        : "Brand / Model";
    }

    if (numberLabel) {
      numberLabel.textContent = category.value === "Mobile"
        ? "IMEI Number (optional)"
        : "Document / Serial Number (optional)";
    }

    updateExpiryRequirement();
  }

  function updateExpiryRequirement() {
    expiry.required = !type.value.toLowerCase().includes("bill");
  }

  category.addEventListener("change", updateTypes);
  type.addEventListener("change", updateExpiryRequirement);

  updateTypes();

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("name");
    const brand = document.getElementById("brand");
    const number = document.getElementById("number");

    // The input ID in add-document.html is "file".
    const fileInput = document.getElementById("file");
    const file = fileInput?.files?.[0];

    if (!name?.value.trim()) {
      alert("Please enter a document or product name.");
      name?.focus();
      return;
    }

    if (!type.value) {
      alert("Please select a document type.");
      type.focus();
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
      category: category.value,
      type: type.value,
      name: name.value.trim(),
      brand: brand?.value.trim() || "",
      number: number?.value.trim() || "",
      issue: issue?.value || "",
      expiry: expiry.value || "",
      fileName: file ? file.name : ""
    };

    const saveButton = form.querySelector('[type="submit"]');

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
      }

      await addDocumentRecord(record);

      alert("Document saved successfully!");
      window.location.href = "documents.html";
    } catch (error) {
      console.error("Document save error:", error);

      alert(
        "Could not save the document. Check your login, internet connection and Firestore Rules."
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save Document";
      }
    }
  });
}

// ---------------- EDIT DOCUMENT ----------------

async function editDocument(id) {
  const items = await getDocuments();

  if (loadError) {
    alert("Could not load documents. Please refresh and try again.");
    return;
  }

  const item = items.find(entry => entry.id === id);
  if (!item) {
    alert("Document not found.");
    return;
  }

  const name = prompt("Document / Product Name:", item.name || "");
  if (name === null) return;
  if (!name.trim()) {
    alert("Name cannot be empty.");
    return;
  }

  const categoryText = prompt(
    "Category: Vehicle, Mobile, or Home Appliance",
    item.category || "Vehicle"
  );
  if (categoryText === null) return;

  const category = CATEGORIES.find(
    value => value.toLowerCase() === categoryText.trim().toLowerCase()
  );

  if (!category) {
    alert("Please enter a valid category.");
    return;
  }

  const type = prompt("Document Type:", item.type || "");
  if (type === null) return;
  if (!type.trim()) {
    alert("Document type cannot be empty.");
    return;
  }

  const brand = prompt("Brand / Vehicle:", item.brand || "");
  if (brand === null) return;

  const number = prompt("Document / Serial Number:", item.number || "");
  if (number === null) return;

  const issue = prompt(
    "Purchase / Issue Date (YYYY-MM-DD):",
    item.issue || ""
  );
  if (issue === null) return;

  if (issue && !parseDate(issue)) {
    alert("Invalid issue date. Use YYYY-MM-DD.");
    return;
  }

  const expiry = prompt(
    "Expiry Date (YYYY-MM-DD, or blank):",
    item.expiry || ""
  );
  if (expiry === null) return;

  if (expiry && !parseDate(expiry)) {
    alert("Invalid expiry date. Use YYYY-MM-DD.");
    return;
  }

  try {
    await updateDocumentRecord(id, {
      name: name.trim(),
      category,
      type: type.trim(),
      brand: brand.trim(),
      number: number.trim(),
      issue,
      expiry
    });

    alert("Document updated successfully!");
    await refreshCurrentPage();
  } catch (error) {
    console.error("Update error:", error);
    alert("Could not update document. Please try again.");
  }
}

// ---------------- DELETE DOCUMENT ----------------

async function deleteDocument(id) {
  const items = await getDocuments();

  if (loadError) {
    alert("Could not load documents. Please refresh and try again.");
    return;
  }

  const item = items.find(entry => entry.id === id);
  if (!item) return;

  if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) {
    return;
  }

  try {
    await deleteDocumentRecord(id);

    alert("Document deleted successfully!");
    await refreshCurrentPage();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Could not delete document. Please try again.");
  }
}

// ---------------- MY DOCUMENTS PAGE ----------------

function setupDocumentsPage() {
  const list = document.getElementById("documentList");
  if (!list) return;

  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const categoryFilter = document.getElementById("categoryFilter");

  const params = new URLSearchParams(window.location.search);

  if (categoryFilter && CATEGORIES.includes(params.get("category"))) {
    categoryFilter.value = params.get("category");
  }

  async function render() {
    list.innerHTML = "<p>Loading documents...</p>";

    const items = await getDocuments();

    if (showLoadError(list)) return;

    const query = (search?.value || "").toLowerCase().trim();
    const selectedCategory = categoryFilter?.value || "";
    const selectedStatus = filter?.value || "";

    const filtered = items.filter(item => {
      const searchable = [
        item.name,
        item.type,
        item.brand,
        item.number,
        item.category
      ].join(" ").toLowerCase();

      return searchable.includes(query)
        && (!selectedCategory || item.category === selectedCategory)
        && (!selectedStatus || getStatus(item.expiry) === selectedStatus);
    });

    list.innerHTML = filtered.length
      ? filtered.map(item => renderDocumentCard(item)).join("")
      : `
        <div class="empty-state">
          No matching documents found.<br>
          <a href="add-document.html">Add a document</a>
        </div>
      `;
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
  render();
}

// ---------------- VEHICLE PAGE ----------------

function setupVehiclePage() {
  const list = document.getElementById("vehicleList");
  if (!list) return;

  async function render() {
    list.innerHTML = "<p>Loading vehicle records...</p>";

    const items = await getDocuments();

    if (showLoadError(list)) return;

    const vehicles = items.filter(item => item.category === "Vehicle");

    list.innerHTML = vehicles.length
      ? vehicles.map(item => renderDocumentCard(item)).join("")
      : `
        <div class="empty-state">
          No vehicle records yet.<br>
          <a class="btn" href="add-document.html">Add Vehicle Document</a>
        </div>
      `;
  }

  list.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editDocument(editButton.dataset.edit);
    if (deleteButton) deleteDocument(deleteButton.dataset.delete);
  });

  document.addEventListener("vaultUpdated", render);
  render();
}

// ---------------- REMINDERS PAGE ----------------

function setupRemindersPage() {
  const list = document.getElementById("reminderList");
  if (!list) return;

  async function render() {
    list.innerHTML = "<p>Loading reminders...</p>";

    const items = await getDocuments();

    if (showLoadError(list)) return;

    const reminders = items.filter(item =>
      ["Expired", "Expiring Soon"].includes(getStatus(item.expiry))
    );

    list.innerHTML = reminders.length
      ? reminders.map(item => renderDocumentCard(item)).join("")
      : `
        <div class="empty-state">
          No expired or upcoming expiry dates found.
        </div>
      `;
  }

  list.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) editDocument(editButton.dataset.edit);
    if (deleteButton) deleteDocument(deleteButton.dataset.delete);
  });

  document.addEventListener("vaultUpdated", render);
  render();
}

// ---------------- DASHBOARD ----------------

function setupDashboard() {
  const total = document.getElementById("totalCount");
  const soon = document.getElementById("soonCount");
  const expired = document.getElementById("expiredCount");

  if (!total || !soon || !expired) return;

  async function render() {
    const items = await getDocuments();

    if (loadError) {
      total.textContent = "—";
      soon.textContent = "—";
      expired.textContent = "—";
      return;
    }

    total.textContent = items.length;

    soon.textContent = items.filter(
      item => getStatus(item.expiry) === "Expiring Soon"
    ).length;

    expired.textContent = items.filter(
      item => getStatus(item.expiry) === "Expired"
    ).length;
  }

  document.addEventListener("vaultUpdated", render);
  render();
}

// ---------------- REFRESH ----------------

async function refreshCurrentPage() {
  await getDocuments();
  notifyUpdates();
}

// ---------------- INITIALIZATION ----------------

function initializePages() {
  if (initialized) return;

  initialized = true;

  setupAddForm();
  setupDocumentsPage();
  setupVehiclePage();
  setupRemindersPage();
  setupDashboard();
}

onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  currentUser = user;
  initializePages();
});
