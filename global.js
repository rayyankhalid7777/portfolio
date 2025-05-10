console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const navLinks = $$("nav a");

const currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);

currentLink?.classList.add("current");

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/" // local server
    : "/portfolio/"; // ← Replace with your GitHub repo name

let pages = [
  { url: "", title: "Home" },
  { url: "Projects/", title: "Projects" },
  { url: "Resume/", title: "Resume" },
  { url: "Contact/", title: "Contact" },
  { url: "https://github.com/rayyankhalid7777", title: "GitHub" },
  { url: 'meta/', title: 'Meta' }

];

// Create the nav element and insert at top of body
let nav = document.createElement("nav");
document.body.prepend(nav);

// Loop through pages and create links
for (let p of pages) {
  let url = !p.url.startsWith("http") ? BASE_PATH + p.url : p.url;

  let a = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  // Highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // Open external links in new tab
  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );
  
  // Reference to the <select>
  const select = document.querySelector(".color-scheme select");
  
  // Function to apply a given color scheme
  function setColorScheme(value) {
    document.documentElement.style.setProperty("color-scheme", value);
  }
  
  // Load saved preference from localStorage (if it exists)
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
    select.value = localStorage.colorScheme;
  }
  
  // Listen for user changes
  select.addEventListener("input", (event) => {
    const value = event.target.value;
    setColorScheme(value);
    localStorage.colorScheme = value;
    console.log("color scheme changed to", value);
  });

  const form = document.querySelector("form");

form?.addEventListener("submit", (event) => {
  event.preventDefault(); // prevent default form submission

  const data = new FormData(form);
  const params = [];

  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
  }

  const url = `${form.action}?${params.join("&")}`;

  location.href = url; // open email client with properly encoded mailto URL
});


export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  for (let project of projects) {
    const article = document.createElement('article');
    article.innerHTML = `
      <h3>${project.title}</h3>
      <img src="${project.image}" alt="${project.title}">
      <div>
        <p>${project.description}</p>
        <p class="project-year">${project.year}</p>
      </div>
`   ;
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

