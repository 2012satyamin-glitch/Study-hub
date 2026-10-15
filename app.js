
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
    /^Class-(9|10|11|12)__(Maths|Science|SST|English|Hindi|IT|Other)__(.+)\.pdf$/i
  );

  if (!match) return null;

  return {
    classNo: match[1],
    subject: match[2],
    title: match[3].replace(/-/g, " "),
    filename
  };
}

async function loadMaterials() {
  setStatus("Loading PDFs...");
  $("materials").replaceChildren();
  $("empty").classList.add("hidden");

  try {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (error) {
      setStatus("PDF load error: " + error.message);
      return;
    }

    materials = (data || [])
      .filter(file => file.name.toLowerCase().endsWith(".pdf"))
      .map(file => parseFilename(file.name))
      .filter(Boolean);

    renderMaterials();
  } catch (error) {
    setStatus("Network error: " + error.message);
  }
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
  const container = $("materials");
  container.replaceChildren();

  const query = $("search").value.trim().toLowerCase();

  const filtered = materials.filter(item =>
    (selectedClass === "All" || item.classNo === selectedClass) &&
    (selectedSubject === "All" ||
      item.subject.toLowerCase() === selectedSubject.toLowerCase()) &&
    `${item.title} ${item.subject} ${item.classNo}`
      .toLowerCase()
      .includes(query)
  );

  $("empty").classList.toggle("hidden", filtered.length !== 0);
  setStatus(`${filtered.length} PDF(s) available`);

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "material-card";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const details = document.createElement("p");
    details.textContent = `Class ${item.classNo} • ${item.subject}`;

    const viewButton = makeButton("View PDF", "btn", async () => {
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(item.filename, 300);

      if (error) {
        alert("PDF open error: " + error.message);
        return;
      }

      window.open(data.signedUrl, "_blank");
    });

    const downloadButton = makeButton("Download", "btn", async () => {
      const { data, error } = await db.storage
        .from(BUCKET)
        .download(item.filename);

      if (error) {
        alert("Download error: " + error.message);
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = url;
      link.download = item.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    card.append(heading, details, viewButton, downloadButton);

    if (isAdmin()) {
      const deleteButton = makeButton("Delete PDF", "btn", async () => {
        if (!confirm(`"${item.title}" delete karna hai?`)) return;

        const { error } = await db.storage
          .from(BUCKET)
          .remove([item.filename]);

        if (error) {
          alert("Delete error: " + error.message);
          return;
        }

        alert("PDF delete ho gayi.");
        await loadMaterials();
      });

      card.appendChild(deleteButton);
    }

    container.appendChild(card);
  });
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const message = $("authMessage");
  message.textContent = "Logging in...";

  try {
    const { error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) {
      message.textContent = "Login error: " + error.message;
      return;
    }

    message.textContent = "Login successful.";
  } catch (error) {
    message.textContent = "Network error: " + error.message;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();

  if (error) {
    alert("Logout error: " + error.message);
    return;
  }

  currentUser = null;
  $("uploadForm").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loginForm").classList.remove("hidden");
  $("authMessage").textContent = "";

  renderMaterials();
});

$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    alert("Sirf admin PDF upload kar sakta hai.");
    return;
  }

  const classNo = $("pdfClass").value;
  const subject = $("pdfSubject").value;
  const file = $("pdfFile").files[0];

  if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
    alert("PDF file select karo.");
    return;
  }

  const cleanTitle = $("pdfTitle").value
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  if (!cleanTitle) {
    alert("PDF title sahi likho.");
    return;
  }

  if (file.size === 0) {
    alert("Selected PDF empty hai.");
    return;
  }

  const filename =
    `Class-${classNo}__${subject}__${cleanTitle}.pdf`;

  const uploadButton =
    $("uploadForm").querySelector('[type="submit"]');

  uploadButton.disabled = true;
  uploadButton.textContent = "Uploading...";
  setStatus("PDF upload ho rahi hai...");

  try {
    const { error } = await db.storage
      .from(BUCKET)
      .upload(filename, file, {
        contentType: "application/pdf",
        upsert: false
      });

    if (error) {
      console.error("Supabase upload error:", error);
      alert("Upload failed: " + error.message);
      setStatus("Upload failed: " + error.message);
      return;
    }

    $("pdfTitle").value = "";
    $("pdfFile").value = "";

    alert("PDF successfully upload ho gayi!");
    await loadMaterials();
  } catch (error) {
    console.error("Upload request error:", error);

    alert(
      "Network error: " +
      (error.message || "Failed to fetch") +
      "\nInternet connection aur Supabase URL check karo."
    );

    setStatus("Upload request failed. Network check karo.");
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload PDF";
  }
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
  try {
    const { data, error } = await db.auth.getSession();

    if (error) {
      setStatus("Session error: " + error.message);
      return;
    }

    currentUser = data.session?.user || null;

    $("loginForm").classList.toggle("hidden", Boolean(currentUser));
    $("logoutBtn").classList.toggle("hidden", !currentUser);
    $("uploadForm").classList.toggle("hidden", !isAdmin());

    await loadMaterials();
  } catch (error) {
    setStatus("Connection error: " + error.message);
  }
})();
      
