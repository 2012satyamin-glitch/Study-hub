const SUPABASE_URL = "https://kueyiqlrteymtfictjou.supabase.co";
const SUPABASE_KEY = "sb_publishable_4A-fNBaxOeh0atGRRbl0IA_lqJN56DO";
const BUCKET = "Study pdfs";
const ADMIN_ID = "2fff916a-6386-4126-b01b-1a933276602e";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadMaterials(className = "") {
  const container = document.getElementById("materials");
  container.textContent = "Loading PDFs...";

  try {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list("", { limit: 1000 });

    if (error) throw error;

    const files = (data || []).filter(file => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return false;
      return !className || file.name.startsWith(`Class-${className}__`);
    });

    container.innerHTML = "";

    if (!files.length) {
      container.textContent = "No PDFs found for this class.";
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
      container.appendChild(item);
    });
  } catch (error) {
    console.error("Load error:", error);
    container.textContent = "Could not load PDFs. Check Supabase settings.";
  }
}

document.querySelectorAll(".class-btn").forEach(button => {
  button.addEventListener("click", () => {
    loadMaterials(button.dataset.class);
  });
});
