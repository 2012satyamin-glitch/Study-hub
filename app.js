
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedClass = "";
let allFiles = [];

const materials = document.getElementById("materials");
const search = document.getElementById("search");
const loginForm = document.getElementById("loginForm");
const uploadForm = document.getElementById("uploadForm");
const message = document.getElementById("adminMessage");

function showMessage(text) {
  message.textContent = text;
}

async function isAdmin() {
  const { data, error } = await db.auth.getUser();
  return !error && data.user && data.user.id === ADMIN_ID;
}

function renderFiles() {
  const query = search.value.trim().toLowerCase();

  const files = allFiles.filter(file => {
    const matchesClass =
      !selectedClass || file.name.startsWith(`Class-${selectedClass}__`);
    return matchesClass && file.name.toLowerCase().includes(query);
  });

  materials.replaceChildren();

  if (!files.length) {
    materials.textContent = "No matching PDFs found.";
    return;
  }

  files.forEach(file => {
    const item = document.createElement("div");
    item.className = "material";

    const name = document.createElement("p");
    name.textContent = file.name;

    const link = document.createElement("a");
    link.textContent = "View / Download PDF";
    link.href = db.storage.from(BUCKET).getPublicUrl(file.name).data.publicUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    item.append(name, link);
    materials.appendChild(item);
  });
}

async function loadMaterials() {
  materials.textContent = "Loading PDFs...";

  const { data, error } = await db.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (error) {
    materials.textContent = "Could not load PDFs: " + error.message;
    console.error(error);
    return;
  }

  allFiles = (data || []).filter(file =>
    file.name.toLowerCase().endsWith(".pdf")
  );

  renderFiles();
}

document.querySelectorAll(".class-btn").forEach(button => {
  button.addEventListener("click", () => {
    selectedClass = button.dataset.class;
    document.getElementById("materialsTitle").textContent =
      `Class ${selectedClass} Materials`;
    renderFiles();
  });
});

search.addEventListener("input", renderFiles);

// Login: use the form already present in index.html
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("Signing in...");

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("Login failed: " + error.message);
    return;
  }

  if (!data.user || data.user.id !== ADMIN_ID) {
    await db.auth.signOut();
    showMessage("This account is not the authorized admin.");
    return;
  }

  showMessage("Admin login successful!");
  loginForm.hidden = true;
  uploadForm.hidden = false;
});

// PDF upload
uploadForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage("Checking admin account...");

  if (!(await isAdmin())) {
    showMessage("Please log in with the authorized admin account.");
    return;
  }

  const file = document.getElementById("pdfFile").files[0];

  if (!file || (file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf"))) {
    showMessage("Please select a PDF file.");
    return;
  }

  const className = document.getElementById("pdfClass").value;
  const subject = document.getElementById("pdfSubject").value;
  const title = document.getElementById("pdfTitle").value.trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim();

  if (!title) {
    showMessage("Enter a valid PDF title.");
    return;
  }

  const safeTitle = title.replace(/\s+/g, "_");
  const filename =
    `Class-${className}__${subject}__${safeTitle}.pdf`;

  showMessage("Uploading PDF...");

  const { error } = await db.storage.from(BUCKET).upload(
    filename,
    file,
    { contentType: "application/pdf", upsert: false }
  );

  if (error) {
    showMessage("Upload failed: " + error.message);
    return;
  }

  showMessage("PDF uploaded successfully!");
  uploadForm.reset();
  await loadMaterials();
});

// Logout
document.getElementById("logoutButton").addEventListener(
  "click",
  async () => {
    const { error } = await db.auth.signOut();

    uploadForm.hidden = true;
    loginForm.hidden = false;
    showMessage(error ? error.message : "Logged out.");
  }
);

// Restore login state after refresh
async function restoreSession() {
  if (await isAdmin()) {
    loginForm.hidden = true;
    uploadForm.hidden = false;
    showMessage("Admin session restored.");
  } else {
    loginForm.hidden = false;
    uploadForm.hidden = true;
  }
}

restoreSession();
loadMaterials();
