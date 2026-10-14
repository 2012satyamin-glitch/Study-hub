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
card.innerHTML = "<div class="emoji">${item.icon}</div> <span class="pill">Class ${item.cls} · ${item.subject}</span> <h3>${item.title}</h3> <p>Study notes and revision resources.</p> <span class="muted">PDF coming soon</span>";
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

