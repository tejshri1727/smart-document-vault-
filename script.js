const STORAGE_KEY = "smartVaultDocuments";

function getDocuments() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDocuments(documents) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

function getStatus(expiry) {
  if (!expiry) return "No expiry date";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(expiry + "T00:00:00");
  const days = Math.ceil((date - today) / 86400000);

  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring Soon";
  return "Active";
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

function displayDate(date) {
  if (!date) return "Not provided";
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN");
}

function statusClass(status) {
  if (status === "Expired") return "expired";
  if (status === "Expiring Soon") return "soon";
  if (status === "Active") return "";
  return "neutral";
}

function renderDocumentCard(doc, showDelete = true) {
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
      ${doc.fileName ? `<p><b>Selected file:</b> ${escapeHTML(doc.fileName)}</p>` : ""}
      ${showDelete ? `<br><button class="delete-btn" data-delete="${escapeHTML(doc.id)}">Delete Record</button>` : ""}
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

  const options = {
    Vehicle: ["RC", "Insurance", "PUC", "Vehicle Warranty", "Vehicle Bill", "Other"],
    Mobile: ["Mobile Warranty", "Mobile Bill", "Other"],
    "Home Appliance": ["Refrigerator Warranty", "Washing Machine Warranty", "TV Warranty", "AC Warranty", "Microwave Warranty", "Other Appliance Warranty", "Appliance Bill", "Other"]
  };

  function updateTypes() {
    type.innerHTML = "";
    options[category.value].forEach(item => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      type.appendChild(option);
    });

    const isVehicle = category.value === "Vehicle";
    nameLabel.textContent = isVehicle ? "Document Name" : "Product / Appliance Name";
    brandLabel.textContent = isVehicle ? "Vehicle Number" : "Brand and Model";
    numberLabel.textContent = category.value === "Mobile"
      ? "IMEI Number (optional)"
      : "Document / Serial Number (optional)";

    expiry.required = !type.value.toLowerCase().includes("bill");
  }

  category.addEventListener("change", updateTypes);
  type.addEventListener("change", () => {
    expiry.required = !type.value.toLowerCase().includes("bill");
  });
  updateTypes();

  form.addEventListener("submit", event => {
    event.preventDefault();

    const file = document.getElementById("documentFile").files[0];

    const record = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      category: category.value,
      type: type.value,
      name: document.getElementById("name").value.trim(),
      brand: document.getElementById("brand").value.trim(),
      number: document.getElementById("number").value.trim(),
      issue: document.getElementById("issue").value,
      expiry: expiry.value,
      fileName: file ? file.name : ""
    };

    if (!record.name) {
      alert("Please enter a document or product name.");
      return;
    }

    const documents = getDocuments();
    documents.push(record);

    try {
      saveDocuments(documents);
      alert("Document details saved successfully!");
      window.location.href = "documents.html";
    } catch {
      alert("Browser storage is full. Try removing some records.");
    }
  });
}

function setupDocumentsPage() {
  const list = document.getElementById("documentList");
  if (!list) return;

  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const categoryFilter = document.getElementById("categoryFilter");

  const params = new URLSearchParams(window.location.search);
  if (["Vehicle", "Mobile", "Home Appliance"].includes(params.get("category"))) {
    categoryFilter.value = params.get("category");
  }

  function render() {
    const query = search.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;
    const selectedStatus = filter.value;

    const docs = getDocuments().filter(doc => {
      const text = [doc.name, doc.type, doc.brand, doc.number, doc.category]
        .join(" ").toLowerCase();

      return text.includes(query)
        && (!selectedCategory || doc.category === selectedCategory)
        && (!selectedStatus || getStatus(doc.expiry) === selectedStatus);
    });

    list.innerHTML = docs.length
      ? docs.map(doc => renderDocumentCard(doc)).join("")
      : `<div class="empty-state">No matching documents found.<br>Add a document to get started.</div>`;
  }

  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  categoryFilter.addEventListener("change", render);

  list.addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    if (confirm("Delete this document record?")) {
      saveDocuments(getDocuments().filter(doc => doc.id !== button.dataset.delete));
      render();
    }
  });

  render();
}

function setupVehiclePage() {
  const list = document.getElementById("vehicleList");
  if (!list) return;

  const docs = getDocuments().filter(doc => doc.category === "Vehicle");

  list.innerHTML = docs.length
    ? docs.map(doc => renderDocumentCard(doc, false)).join("")
    : `<div class="empty-state">No vehicle records yet.<br><a class="btn" href="add-document.html">Add Vehicle Document</a></div>`;
}

function setupRemindersPage() {
  const list = document.getElementById("reminderList");
  if (!list) return;

  const docs = getDocuments().filter(doc =>
    ["Expired", "Expiring Soon"].includes(getStatus(doc.expiry))
  );

  list.innerHTML = docs.length
    ? docs.map(doc => renderDocumentCard(doc, false)).join("")
    : `<div class="empty-state">No expired or upcoming expiry dates found.</div>`;
}

function setupDashboard() {
  const total = document.getElementById("totalCount");
  if (!total) return;

  const docs = getDocuments();
  total.textContent = docs.length;
  document.getElementById("soonCount").textContent =
    docs.filter(doc => getStatus(doc.expiry) === "Expiring Soon").length;
  document.getElementById("expiredCount").textContent =
    docs.filter(doc => getStatus(doc.expiry) === "Expired").length;
}

document.addEventListener("DOMContentLoaded", () => {
  setupAddForm();
  setupDocumentsPage();
  setupVehiclePage();
  setupRemindersPage();
  setupDashboard();
});
