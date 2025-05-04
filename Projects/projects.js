import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let selectedIndex = -1;
let data = [];

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h3');

let query = '';
const searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  query = event.target.value.toLowerCase();
  const filtered = getFilteredProjects();

  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join(' ');
    const pattern = new RegExp(`\\b${query}`, 'i');
    return pattern.test(values);
  });

  renderProjects(filteredProjects, projectsContainer, 'h3');
  renderPieChart(filteredProjects);
});

renderPieChart(projects);

// Update the project count in the title
const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle && projects) {
  projectsTitle.textContent += ` (${projects.length})`;
}

function renderPieChart(projectsGiven) {
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  data = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let sliceGenerator = d3.pie().value((d) => d.value);
  let arcData = sliceGenerator(data);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  let svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  arcData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        const filtered = getFilteredProjects();
        renderProjects(filtered, projectsContainer, 'h3');
        renderPieChart(filtered);
      })
      .append('title')
      .text(`${data[i].label}: ${data[i].value} project(s)`);
  });

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('class', i === selectedIndex ? 'legend-item selected' : 'legend-item')
      .attr('style', i === selectedIndex ? '' : `--color: ${colors(i)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        const filtered = getFilteredProjects();
        renderProjects(filtered, projectsContainer, 'h3');
        renderPieChart(filtered);
    });
});

}


function getFilteredProjects() {
  return projects.filter((project) => {
    const title = project.title.toLowerCase();
    const description = project.description.toLowerCase();
    const matchesQuery =
      title.includes(query) || description.includes(query);

    const matchesYear =
      selectedIndex === -1 || project.year === data[selectedIndex]?.label;

    return matchesQuery && matchesYear;
  });
}


renderPieChart(projects); // on load

