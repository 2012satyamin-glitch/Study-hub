
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let currentClass = "All";
let currentSubject = "All";
let materials = [];

$("year").textContent = new Date().getFullYear();

function setStatus(text) {
  $("status").textContent = text;
}

function setAuthMessage(text) {
  $("authMessage").textContent = text;
}

function safeText(value) {
  return String(value ?? "");
}

function render() {
  const query = $("search").value.trim().toLowerCase();

  const filtered = materials.filter(item => {
    const matchesClass =
      currentClass === "All" || item.className === currentClass;
    const matchesSubject =
      currentSubject === "All" || item.subject.toLowerCase() === currentSubject.toLowerCase();
    const matchesSearch =
      `${item.title} ${item.subject} ${item.className}`.toLowerCase().includes(query);

    return matchesClass && matchesSubject && matchesSearch;
  });

  const container = $("materials");
  container.replaceChildren();

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "material-card";

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const detail = document.createElement("p");
    detail.textContent = `Class ${item.className} · ${item.subject}`;

    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "button";
    link.textContent = "View / Download PDF";

    card.append(heading, detail, link);
    container.append(card);
  });

  $("empty").classList.toggle("hidden", filtered.length !== 0);
}

async function loadMaterials() {
  setStatus("Loading PDFs...");

  const { data, error } = await db.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "name", order: "asc" }
  });

  if (error) {
    setStatus("PDFs load nahi hui. Bucket name aur public listing policy check karni hogi.");
    console.error(error);
    return;
  }

  materials = (data || [])
    .filter(file => file.name.toLowerCase().endsWith(".pdf"))
    .map(file => {
      const match = file.name.match(/^Class-(10|11|12)__([^_]+)__(.+)\.pdf$/i);
      if (!match) return null;

      const className = match[1];
      const subject = match[2].replace(/-/g, " ");
      const title = match[3].replace(/-/g, " ");

      const { data: publicData } =
        db.storage.from(BUCKET).getPublicUrl(file.name);

      return {
        className,
        subject,
        title,
        url: publicData.publicUrl
      };
    })
    .filter(Boolean);

  setStatus(`${materials.length} PDF(s) available`);
  render();
}

async function updateSession(session) {
  const user = session?.user;
  const isAdmin = user?.id === ADMIN_ID;

  $("loginForm").classList.toggle("hidden", !!user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("uploadForm").classList.toggle("hidden", !isAdmin);

  if (isAdmin) {
    setAuthMessage("Admin login successful. You can upload PDFs.");
  } else if (user) {
    setAuthMessage("This account is not the website admin.");
  } else {
    setAuthMessage("Admin login is required to upload PDFs.");
  }
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  setAuthMessage("Logging in...");

  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    setAuthMessage("Login failed. Check your email and password.");
    console.error(error);
    return;
  }

  await updateSession(data.session);
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) {
    setAuthMessage("Logout failed.");
    return;
  }
  await updateSession(null);
});

$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  const user = sessionData?.session?.user;

  if (sessionError || !user || user.id !== ADMIN_ID) {
    setAuthMessage("Only the admin account can upload PDFs.");
    return;
  }

  const file = $("pdfFile").files[0];
  if (!file || (!file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf")) {
    setAuthMessage("Please choose a PDF file.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    setAuthMessage("File size must be under 20 MB.");
    return;
  }

  const className = $("pdfClass").value;
  const subject = $("pdfSubject").value;
  const title = $("pdfTitle").value.trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70);

  if (!title) {
    setAuthMessage("Please enter a PDF title.");
    return;
  }

  const safeSubject = subject.replace(/[^a-zA-Z0-9-]/g, "-");
  const path = `Class-${className}__${safeSubject}__${title}.pdf`;

  setAuthMessage("Uploading PDF...");

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false
  });

  if (error) {
    setAuthMessage("Upload failed. Check the bucket name and upload policy.");
    console.error(error);
    return;
  }

  setAuthMessage("PDF uploaded successfully!");
  $("uploadForm").reset();
  await loadMaterials();
});

$("search").addEventListener("input", render);

document.querySelectorAll("[data-class]").forEach(button => {
  button.addEventListener("click", () => {
    currentClass = button.dataset.class;
    document.querySelectorAll("[data-class]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });
    render();
  });
});

document.querySelectorAll("[data-subject]").forEach(button => {
  button.addEventListener("click", () => {
    currentSubject = button.dataset.subject;
    document.querySelectorAll("[data-subject]").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });
    render();
  });
});

db.auth.onAuthStateChange((_event, session) => {
  updateSession(session);
});

(async () => {
  const { data } = await db.auth.getSession();
  await updateSession(data.session);
  await loadMaterials();
})();
      
