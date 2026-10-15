
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let currentClass = "All";
let materials = [];

$("year").textContent = new Date().getFullYear();

function message(text) {
  $("authMessage").textContent = text;
}

function cleanName(value) {
  return value.trim().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 70);
}

function displayName(value) {
  return value.replace(/\.pdf$/i, "").replace(/-/g, " ");
}

function render() {
  const query = $("search").value.trim().toLowerCase();
  const filtered = materials.filter(item =>
    (currentClass === "All" || item.className === currentClass) &&
    `${item.title} ${item.subject} ${item.className}`.toLowerCase().includes(query)
  );

  $("materials").innerHTML = "";
  $("empty").classList.toggle("hidden", filtered.length > 0);

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
    link.rel = "noopener";
    link.textContent = "View / Download PDF";
    link.className = "button";

    card.append(heading, detail, link);
    $("materials").append(card);
  });
}

async function loadMaterials() {
  const { data, error } = await db.storage.from(BUCKET).list("", {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" }
  });

  if (error) {
    message("PDF list load nahi hui: " + error.message);
    return;
  }

  materials = (data || [])
    .filter(file => file.name.toLowerCase().endsWith(".pdf"))
    .map(file => {
      const parts = file.name.split("__");
      if (parts.length < 3) return null;

      const className = parts[0].replace(/^Class-/, "");
      if (!["10", "11", "12"].includes(className)) return null;

      const { data: publicData } = db.storage.from(BUCKET).getPublicUrl(file.name);

      return {
        className,
        subject: displayName(parts[1]),
        title: displayName(parts.slice(2).join("__")),
        url: publicData.publicUrl
      };
    })
    .filter(Boolean);

  render();
}

async function updateSession(session) {
  const user = session?.user;
  const isAdmin = user?.id === ADMIN_ID;

  $("loginForm").classList.toggle("hidden", !!user);
  $("logoutBtn").classList.toggle("hidden", !user);
  $("uploadForm").classList.toggle("hidden", !isAdmin);

  if (user && !isAdmin) {
    message("Ye account admin nahi hai. Upload permission nahi hai.");
  } else if (isAdmin) {
    message("Admin login successful. Ab PDF upload kar sakte ho.");
  } else {
    message("PDF dekhne ke liye login zaroori nahi hai.");
  }
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  message("Logging in...");

  const { data, error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    message("Login failed: " + error.message);
    return;
  }

  await updateSession(data.session);
});

$("logoutBtn").addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  message(error ? error.message : "Logged out.");
  if (!error) await updateSession(null);
});

$("uploadForm").addEventListener("submit", async event => {
  event.preventDefault();

  const { data: sessionData } = await db.auth.getSession();
  const user = sessionData.session?.user;

  if (!user || user.id !== ADMIN_ID) {
    message("Admin login required.");
    return;
  }

  const file = $("pdfFile").files[0];
  if (!file || (!file.name.toLowerCase().endsWith(".pdf") &&
      file.type !== "application/pdf")) {
    message("Please select a PDF file.");
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    message("PDF size 20 MB se kam honi chahiye.");
    return;
  }

  const className = $("pdfClass").value;
  const subject = cleanName($("pdfSubject").value);
  const title = cleanName($("pdfTitle").value);

  if (!subject || !title) {
    message("Subject aur title sahi bharo.");
    return;
  }

  const path = `Class-${className}__${subject}__${title}.pdf`;
  message("PDF upload ho rahi hai...");

  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false
  });

  if (error) {
    message("Upload failed: " + error.message);
    return;
  }

  message("PDF upload successful!");
  $("uploadForm").reset();
  await loadMaterials();
});

$("search").addEventListener("input", render);

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    currentClass = button.dataset.class;
    document.querySelectorAll(".tab").forEach(tab =>
      tab.classList.toggle("active", tab === button)
    );
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
                   




