
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

let currentUser = null;
let materials = [];
let selectedClass = "All";
let selectedSubject = "All";

$("year").textContent = new Date().getFullYear();

function isAdmin() {
  return currentUser?.id === ADMIN_ID;
}

function setStatus(message) {
  $("status").textContent = message;
}

function parseFilename(filename) {
  const match = filename.match(
    /^Class-(10|11|12)__(Maths|Science|SST|English|Hindi|IT|Other)__(.+)\.pdf$/i
  );

  if (!match) return null;

  return {
    classNo: match[1],
    subject: match[2],
    title: match[3].replace(/-/g, " ")
  };
}

async function loadMaterials() {
  setStatus("Loading PDFs...");
  $("materials").replaceChildren();
  $("empty").classList.add("hidden");

  const { data, error } = await db.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (error) {
    setStatus("PDFs load nahi hue: " + error.message);
    return;
  }

  materials = (data || [])
    .filter(file => file.name.toLowerCase().endsWith(".pdf"))
    .map(file => {
      const info = parseFilename(file.name);
      return info ? { ...info, filename: file.name } : null;
    })
    .filter(Boolean);

  renderMaterials();
}

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderMaterials() {
  const search = $("search").value.trim().toLowerCase();

  const filtered = materials.filter(item => {
    const classOK =
      selectedClass === "All" || item.classNo === selectedClass;
    const subjectOK =
      selectedSubject === "All" ||
      item.subject.toLowerCase() === selectedSubject.toLowerCase();
    const searchOK =
      `${item.title} ${item.subject} ${item.classNo}`
        .toLowerCase().includes(search);

    return classOK && subjectOK && searchOK;
  });

  const container = $("materials");
  container.replaceChildren();
  $("empty").classList.toggle("hidden", filtered.length > 0);

  setStatus(`Total PDFs available: ${materials.length}`);

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "material-card";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const info = document.createElement("p");
    info.textContent = `Class ${item.classNo} · ${item.subject} · PDF`;

    const viewButton = makeButton("View / Download", "button", async () => {
      viewButton.disabled = true;
      viewButton.textContent = "Opening...";

      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(item.filename, 3600);

      viewButton.disabled = false;
      viewButton.textContent = "View / Download";

      if (error || !data?.signedUrl) {
        alert("PDF open nahi hua. Storage SELECT permission check karo.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener");
    });

    card.append(heading, info, viewButton);

    if (isAdmin()) {
      const deleteButton = makeButton(
        "🗑️ Delete PDF",
        "button secondary",
        async () => {
          if (!isAdmin()) {
            alert("Sirf admin delete kar sakta hai.");
            return;
          }

          if (!confirm(`Kya "${item.title}" ko permanently delete karna hai?`)) {
            return;
          }

          deleteButton.disabled = true;
          deleteButton.textContent = "Deleting...";

          const { error } = await db.storage
            .from(BUCKET)
            .remove([item.filename]);

          if (error) {
            alert("Delete nahi hua: " + error.message);
            deleteButton.disabled = false;
            deleteButton.textContent = "🗑️ Delete PDF";
            return;
          }

          alert("PDF successfully delete ho gaya.");
          await loadMaterials();
        }
      );

      card.appendChild(deleteButton);
    }

    container.appendChild(card);
  });
}

async function updateSession(session) {
  currentUser = session?.user || null;

  $("loginForm").classList.toggle("hidden", Boolean(currentUser));
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("uploadForm").classList.toggle("hidden", !isAdmin());

  $("authMessage").textContent = isAdmin()
    ? "Admin login successful."
    : currentUser
      ? "Yeh admin account nahi hai."
      : "";

  renderMaterials();
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("authMessage").textContent = "Logging in...";

  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    $("authMessage").textContent = "Login failed. Email/password check karo.";
    return;
  }

  await updateSession(data.session);
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Logout failed: " + error.message);
    return;
  }

  $("password").value = "";
  await updateSession(null);
});

$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Sirf admin PDF upload kar sakta hai.");
    return;
  }

  const file = $("pdfFile").files[0];
  const classNo = $("pdfClass").value;
  const subject = $("pdfSubject").value;
  const title = $("pdfTitle").value.trim();

  if (!file || !title) {
    alert("PDF aur title select karo.");
    return;
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    alert("Sirf PDF file upload karo.");
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert("PDF 25 MB se chhoti honi chahiye.");
    return;
  }

  const cleanTitle = title
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  if (!cleanTitle) {
    alert("PDF title sahi likho.");
    return;
  }

  const filename = `Class-${classNo}__${subject}__${cleanTitle}.pdf`;
  const uploadButton = $("uploadForm").querySelector('[type="submit"]');

  uploadButton.disabled = true;
  uploadButton.textContent = "Uploading...";

  const { error } = await db.storage
    .from(BUCKET)
    .upload(filename, file, { contentType: "application/pdf" });

  uploadButton.disabled = false;
  uploadButton.textContent = "Upload PDF";

  if (error) {
    alert("Upload nahi hua: " + error.message);
    return;
  }

  $("pdfTitle").value = "";
  $("pdfFile").value = "";

  alert("PDF successfully upload ho gaya!");
  await loadMaterials();
});

$("search").addEventListener("input", renderMaterials);

document.querySelectorAll("[data-class]").forEach(button => {
  button.addEventListener("click", () => {
    selectedClass = button.dataset.class;

    document.querySelectorAll("[data-class]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    renderMaterials();
  });
});

document.querySelectorAll("[data-subject]").forEach(button => {
  button.addEventListener("click", () => {
    selectedSubject = button.dataset.subject;

    document.querySelectorAll("[data-subject]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    renderMaterials();
  });
});

db.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;

  $("loginForm").classList.toggle("hidden", Boolean(currentUser));
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("uploadForm").classList.toggle("hidden", !isAdmin());

  $("authMessage").textContent = isAdmin()
    ? "Admin login successful."
    : currentUser
      ? "Yeh admin account nahi hai."
      : "";

  renderMaterials();
});

(async () => {
  const { data, error } = await db.auth.getSession();

  if (error) {
    setStatus("Session load nahi hua: " + error.message);
    return;
  }

  currentUser = data.session?.user || null;

  $("loginForm").classList.toggle("hidden", Boolean(currentUser));
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("uploadForm").classList.toggle("hidden", !isAdmin());

  await loadMaterials();
})();
