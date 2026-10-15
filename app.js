
const materials = [
  { title: "Real Numbers", subject: "Maths", cls: "10", icon: "📘" },
  { title: "Polynomials", subject: "Maths", cls: "10", icon: "📐" },
  { title: "Science Notes", subject: "Science", cls: "10", icon: "🔬" },
  { title: "Social Science Notes", subject: "SST", cls: "10", icon: "🌍" },
  { title: "English Notes", subject: "English", cls: "10", icon: "📖" },
  { title: "Class 11 Study Resources", subject: "All Subjects", cls: "11", icon: "📚" },
  { title: "Class 12 Study Resources", subject: "All Subjects", cls: "12", icon: "🎓" }
];

const grid = document.getElementById("materials");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
const tabs = document.querySelectorAll(".tab");

let selectedClass = "All";

function renderMaterials() {
  const query = search.value.toLowerCase().trim();

  const filtered = materials.filter(item =>
    (selectedClass === "All" || item.cls === selectedClass) &&
    (item.title + " " + item.subject).toLowerCase().includes(query)
  );

  grid.innerHTML = "";

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "material";

    const emoji = document.createElement("div");
    emoji.className = "emoji";
    emoji.textContent = item.icon;

    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = `Class ${item.cls} · ${item.subject}`;

    const title = document.createElement("h3");
    title.textContent = item.title;

    const description = document.createElement("p");
    description.textContent = "Study notes and revision resources.";

    const status = document.createElement("span");
    status.className = "muted";
    status.textContent = "PDF coming soon";

    card.append(emoji, pill, title, description, status);
    grid.appendChild(card);
  });

  empty.classList.toggle("hidden", filtered.length > 0);
}

search.addEventListener("input", renderMaterials);

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    selectedClass = tab.dataset.class;
    renderMaterials();
  });
});

document.getElementById("year").textContent = new Date().getFullYear();
renderMaterials();




