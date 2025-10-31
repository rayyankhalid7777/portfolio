import { fetchJSON, renderProjects } from '../global.js';

let query = '';
let projects = [];

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

projects = await fetchJSON('../lib/projects.json');

// Initial render
renderProjects(projects, projectsContainer, 'h3');

// Search functionality
searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  const filtered = projects.filter(project =>
    project.title.toLowerCase().includes(query) ||
    project.description.toLowerCase().includes(query)
  );
  renderProjects(filtered, projectsContainer, 'h3');
});

// Optional: update project count in title
const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle && projects) {
  projectsTitle.textContent += ` (${projects.length})`;
}


