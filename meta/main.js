import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';
let xScale, yScale;
let commits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;
let colorScale = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: 'https://github.com/YOUR_USERNAME/YOUR_REPO/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Number of files');
  dl.append('dd').text(d3.groups(data, d => d.file).length);

  dl.append('dt').text('Maximum file depth');
  dl.append('dd').text(d3.max(data, d => d.depth));

  dl.append('dt').text('Average line length (characters)');
  dl.append('dd').text(d3.mean(data, d => d.length).toFixed(2));

  dl.append('dt').text('Average file length (lines)');
  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  dl.append('dd').text(d3.mean(fileLengths, d => d[1]).toFixed(2));

  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
  dl.append('dt').text('Most active coding time');
  dl.append('dd').text(maxPeriod);
}

function renderScatterPlot(data, commits) {
  const width = 800;
  const height = 400;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();
  
  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);
  

  // Add gridlines before axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(
    d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
  );

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(xScale));


  // Add Y axis with time labels
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(
      d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00')
    );

    const brush = d3.brush().on('start brush end', brushed);
    svg.call(brush);

    // Raise dots above the brush overlay
    svg.selectAll('.dots, .overlay ~ *').raise();

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

    const rScale = d3
      .scaleSqrt() // corrects area perception
      .domain([minLines, maxLines])
      .range([2, 30]); // adjust as needed
    

  // Draw dots
  const dots = svg.append('g').attr('class', 'dots');

  dots
    .selectAll('circle')
    .data(d3.sort(commits, (d) => -d.totalLines), d => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))

    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
      })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
  
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 20}px`;
  tooltip.style.top = `${event.clientY + 20}px`;
}


const data = await loadData();
commits = processCommits(data);
// Time scale setup
timeScale = d3
  .scaleTime()
  .domain(d3.extent(commits, d => d.datetime))
  .range([0, 100]);

commitMaxTime = timeScale.invert(commitProgress);

document.getElementById('commit-progress').addEventListener('input', onTimeSliderChange);

renderScatterPlot(data, commits);
d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      On ${d.datetime.toLocaleString('en', {
        dateStyle: 'full',
        timeStyle: 'short',
      })},
      I made <a href="${d.url}" target="_blank">${
        i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
      }</a>.
      I edited ${d.totalLines} lines across ${
        d3.rollups(d.lines, (v) => v.length, (d) => d.file).length
      } files.
      Then I looked over all I had made, and I saw that it was very good.
    `
  );

onTimeSliderChange();

renderCommitInfo(data, commits);

// Initialize time UI
function onTimeSliderChange() {
  const slider = document.getElementById('commit-progress');
  commitProgress = +slider.value;
  commitMaxTime = timeScale.invert(commitProgress);
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function updateScatterPlot(data, commits) {
  const width = 800;
  const height = 400;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  // update x-axis
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(d3.axisBottom(xScale));

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id) // Stable update
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap((d) => d.lines);

  const files = d3.groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    );

  filesContainer.select('dt > code').html((d) =>
    `${d.name}<small>${d.lines.length} lines</small>`
  );

  filesContainer.select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background', (d) => colorScale(d.type));
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function brushed(event) {
  const selection = event.selection;

  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d)
  );

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');
  if (!selectedCommits.length) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap((d) => d.lines);

  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type
  );

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function onStepEnter(response) {
  const commit = response.element.__data__;
  commitMaxTime = commit.datetime;
  document.getElementById('commit-time').textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits); // if you’ve implemented this
  renderSelectionCount(null);
  renderLanguageBreakdown(null);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);
