
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedClass = "";
let allFiles = [];

const materials = document.getElementById("materials");
const search = document.getElementById("search");

function isAdmin() {
  return db.auth.getUser().then(({ data }) =>
    data.user && data.user.id === ADMIN_ID
  );
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
    materials.textContent = "Could not load PDFs. Check bucket permissions.";
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

// Create admin login and upload interface
const adminCard = [...document.querySelectorAll(".card")]
  .find(card => card.textContent.includes("Admin Upload"));

if (adminCard) {
  adminCard.innerHTML = `
    <h2>Admin Login / Upload</h2>
    <form id="loginForm">
      <input id="adminEmail" type="email" placeholder="Admin email" required>
      <input id="adminPassword" type="password" placeholder="Admin password" required>
      <button type="submit">Login</button>
    </form>
    <p id="adminMessage" class="muted"></p>
    <form id="uploadForm" hidden>
      <label for="pdfClass">Select class</label>
      <select id="pdfClass" required>
        <option value="9">Class 9</option>
        <option value="10" selected>Class 10</option>
        <option value="11">Class 11</option>
        <option value="12">Class 12</option>
      </select>
      <label for="pdfSubject">Subject</label>
      <select id="pdfSubject" required>
        <option>Maths</option>
        <option>Science</option>
        <option>SST</option>
        <option>English</option>
        <option>Hindi</option>
        <option>IT</option>
        <option>Other</option>
      </select>
      <input id="pdfTitle" type="text" placeholder="PDF title" required>
      <input id="pdfFile" type="file" accept="application/pdf,.pdf" required>
      <button type="submit">Upload PDF</button>
      <button type="button" id="logoutButton">Logout</button>
    </form>
  `;

  const message = document.getElementById("adminMessage");
  const uploadForm = document.getElementById("uploadForm");

  document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    message.textContent = "Signing in...";

    const { data, error } = await db.auth.signInWithPassword({
      email: document.getElementById("adminEmail").value.trim(),
      password: document.getElementById("adminPassword").value
    });

    if (error) {
      message.textContent = "Login failed: " + error.message;
      return;
    }

    if (data.user.id !== ADMIN_ID) {
      await db.auth.signOut();
      message.textContent = "This account is not the authorized admin.";
      return;
    }

    message.textContent = "Admin login successful.";
    uploadForm.hidden = false;
    document.getElementById("loginForm").hidden = true;
  });

  uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!(await isAdmin())) {
      message.textContent = "Please log in with the admin account.";
      return;
    }

    const file = document.getElementById("pdfFile").files[0];
    if (!file || file.type !== "application/pdf") {
      message.textContent = "Please select a PDF file.";
      return;
    }

    const className = document.getElementById("pdfClass").value;
    const subject = document.getElementById("pdfSubject").value;
    const title = document.getElementById("pdfTitle").value.trim()
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim();

    if (!title) {
      message.textContent = "Enter a valid PDF title.";
      return;
    }

    const safeTitle = title.replace(/\s+/g, "_");
    const filename = `Class-${className}__${subject}__${safeTitle}.pdf`;

    message.textContent = "Uploading PDF...";

    const { error } = await db.storage.from(BUCKET).upload(
      filename,
      file,
      { contentType: "application/pdf", upsert: false }
    );

    if (error) {
      message.textContent = "Upload failed: " + error.message;
      return;
    }

    message.textContent = "PDF uploaded successfully!";
    uploadForm.reset();
    await loadMaterials();
  });

  document.getElementById("logoutButton").addEventListener("click", async () => {
    await db.auth.signOut();
    uploadForm.hidden = true;
    document.getElementById("loginForm").hidden = false;
    message.textContent = "Logged out.";
  });
}

loadMaterials();
                          
