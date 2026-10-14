const materials = [
{ title: "Real Numbers", subject: "Mathematics", cls: "10", desc: "Chapter notes and practice questions", icon: "📘" },
{ title: "Polynomials", subject: "Mathematics", cls: "10", desc: "Important questions and revision", icon: "📐" },
{ title: "Pair of Linear Equations", subject: "Mathematics", cls: "10", desc: "Chapter practice material", icon: "📝" },
{ title: "Science Notes", subject: "Science", cls: "10", desc: "Physics, Chemistry and Biology", icon: "🔬" },
{ title: "Social Science Notes", subject: "SST", cls: "10", desc: "History, Geography, Civics and Economics", icon: "🌍" },
{ title: "English Notes", subject: "English", cls: "10", desc: "Poems, chapters and grammar", icon: "📖" },
{ title: "Class 11 Study Resources", subject: "All Subjects", cls: "11", desc: "Notes and revision resources", icon: "📚" },
{ title: "Class 12 Study Resources", subject: "All Subjects", cls: "12", desc: "Notes and revision resources", icon: "🎓" }
];

const grid = document.querySelector(".materials");
const search = document.querySelector("input");
const tabs = document.querySelectorAll(".tab");

let selectedClass = "All";

function renderMaterials() {
if (!grid) return;

const query = search ? search.value.toLowerCase().trim() : "";

const filtered = materials.filter(item => {
const matchesClass =
selectedClass === "All" || item.cls === selectedClass;

const matchesSearch =
  (item.title + " " + item.subject + " " + item.desc)
    .toLowerCase()
    .includes(query);

return matchesClass && matchesSearch;

});

grid.innerHTML = "";

if (filtered.length === 0) {
grid.innerHTML = '<p class="empty">No materials found.</p>';
return;
}

filtered.forEach(item => {
const card = document.createElement("article");
card.className = "material";

card.innerHTML = `
  <div class="emoji">${item.icon}</div>
  <span class="pill">Class ${item.cls} · ${item.subject}</span>
  <h3>${item.title}</h3>
  <p>${item.desc}</p>
  <span class="muted">Study material coming soon</span>
`;

grid.appendChild(card);

});
}

if (search) {
search.addEventListener("input", renderMaterials);
}

tabs.forEach(tab => {
tab.addEventListener("click", () => {
tabs.forEach(button => button.classList.remove("active"));
tab.classList.add("active");

const label = tab.textContent.trim();
selectedClass = label === "All" ? "All" : label.replace("Class ", "");

renderMaterials();

});
});

renderMaterials();
  
