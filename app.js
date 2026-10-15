
const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);

let currentUser = null;
let allMaterials = [];
let selectedClass = "All";
let selectedSubject = "All";

$("year").textContent = new Date().getFullYear();

function setStatus(message) {
  $("status").textContent = message;
}

function safeText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
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
  setStatus("PDFs load ho rahe hain...");
  $("materials").innerHTML = "";
  $("empty").classList.add("hidden");

  const { data, error } = await db.storage
    .from(BUCKET)
    .list("", { limit: 1000 });

  if (error) {
    setStatus("PDFs load nahi hue. Supabase permissions check karo.");
    console.error(error);
    return;
  }

  allMaterials = (data || [])
    .filter(file => file.name.toLowerCase().endsWith(".pdf"))
    .map(file => {
      const info = parseFilename(file.name);
      if (!info) return null;
      return { ...info, filename: file.name };
    })
    .filter(Boolean);

  renderMaterials();
}

async function renderMaterials() {
  const searchTerm = $("search").value.trim().toLowerCase();

  const filtered = allMaterials.filter(item => {
    const classMatch =
      selectedClass === "All" || item.classNo === selectedClass;
    const subjectMatch =
      selectedSubject === "All" ||
      item.subject.toLowerCase() === selectedSubject.toLowerCase();
    const searchMatch =
      `${item.title} ${item.subject} Class ${item.classNo}`
        .toLowerCase().includes(searchTerm);

    return classMatch && subjectMatch && searchMatch;
  });

  $("materials").innerHTML = "";
  $("empty").classList.toggle("hidden", filtered.length !== 0);

  if (filtered.length === 0) {
    setStatus(`Total PDFs available: ${allMaterials.length}`);
    return;
  }

  for (const item of filtered) {
    const card = document.createElement("article");
    card.className = "material-card";

    const title = document.createElement("h3");
    title.textContent = item.title;

    const details = document.createElement("p");
    details.textContent = `Class ${item.classNo} · ${item.subject} · PDF`;

    const openButton = document.createElement("button");
    openButton.className = "button";
    openButton.type = "button";
    openButton.textContent = "View / Download";

    openButton.addEventListener("click", async () => {
      openButton.disabled = true;
      openButton.textContent = "Opening...";
      const { data, error } = await db.storage
        .from(BUCKET)
        .createSignedUrl(item.filename, 3600);

      openButton.disabled = false;
      openButton.textContent = "View / Download";

      if (error || !data?.signedUrl) {
        alert("PDF open nahi hua. Supabase storage permissions check karo.");
        console.error(error);
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener");
    });

    card.append(title, details, openButton);

    if (currentUser?.id === ADMIN_ID) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "button secondary";
      deleteButton.type = "button";
      deleteButton.textContent = "🗑️ Delete";

      deleteButton.addEventListener("click", async () => {
        const confirmed = confirm(
          `"${item.title}" delete karna hai? Yeh action undo nahi hoga.`
        );
        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.textContent = "Deleting...";

        const { error } = await db.storage
          .from(BUCKET)
          .remove([item.filename]);

        if (error) {
          alert("Delete nahi hua. Supabase DELETE policy check karo.");
          console.error(error);
          deleteButton.disabled = false;
          deleteButton.textContent = "🗑️ Delete";
          return;
        }

        setStatus("PDF delete ho gaya.");
        await loadMaterials();
      });

      card.appendChild(deleteButton);
    }

    $("materials").appendChild(card);
  }

  setStatus(`Total PDFs available: ${allMaterials.length}`);
}

async function updateSession(session) {
  currentUser = session?.user || null;

  const isAdmin = currentUser?.id === ADMIN_ID;

  $("loginForm").classList.toggle("hidden", Boolean(currentUser));
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("uploadForm").classList.toggle("hidden", !isAdmin);

  if (currentUser && !isAdmin) {
    $("authMessage").textContent =
      "Yeh account admin nahi hai. Upload aur delete sirf admin kar sakta hai.";
  } else {
    $("authMessage").textContent = isAdmin
      ? "Admin login successful."
      : "";
  }

  await renderMaterials();
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("authMessage").textContent = "Login ho raha hai...";

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
  await db.auth.signOut();
  $("password").value = "";
  await updateSession(null);
});

$("uploadForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (currentUser?.id !== ADMIN_ID) {
    alert("Sirf admin PDF upload kar sakta hai.");
    return;
  }

  const file = $("pdfFile").files[0];
  const classNo = $("pdfClass").value;
  const subject = $("pdfSubject").value;
  const title = $("pdfTitle").value.trim();

  if (!file || !title) {
    alert("PDF file aur title select karo.");
    return;
  }

  if (file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")) {
    alert("Sirf PDF file upload kar sakte ho.");
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    alert("PDF 25 MB se chhoti honi chahiye.");
    return;
  }

  const safeTitle = title
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  if (!safeTitle) {
    alert("PDF title sahi likho.");
    return;
  }

  const filename =
    `Class-${classNo}__${subject}__${safeTitle}.pdf`;

  const uploadButton = $("uploadForm").querySelector(
    'button[type="submit"]'
  );
  uploadButton.disabled = true;
  uploadButton.textContent = "Uploading...";

  const { error } = await db.storage
    .from(BUCKET)
    .upload(filename, file, {
      contentType: "application/pdf",
      upsert: false
    });

  uploadButton.disabled = false;
  uploadButton.textContent = "Upload PDF";

  if (error) {
    alert(error.message.includes("already exists")
      ? "Isi naam ki PDF pehle se hai. Title badal kar try karo."
      : "Upload failed: " + error.message);
    console.error(error);
    return;
  }

  $("pdfTitle").value = "";
  $("pdfFile").value = "";
  alert("PDF upload successfully!");
  await loadMaterials();
});

$("search").addEventListener("input", renderMaterials);

document.querySelectorAll("[data-class]").forEach(button => {
  button.addEventListener("click", () => {
    selectedClass = button.dataset.class;
    document.querySelectorAll("[data-class]").forEach(item =>
      item.classList.toggle("active", item === button)
    );
    renderMaterials();
  });
});

document.querySelectorAll("[data-subject]").forEach(button => {
  button.addEventListener("click", () => {
    selectedSubject = button.dataset.subject;
    document.querySelectorAll("[data-subject]").forEach(item =>
      item.classList.toggle("active", item === button)
    );
    renderMaterials();
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
      
