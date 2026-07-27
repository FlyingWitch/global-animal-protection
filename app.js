let appData = null;
let mapZoom = null;
let mapSvg = null;

const levelColors = {
  1: '#d1d5db',
  2: '#99f6e4',
  3: '#2dd4bf',
  4: '#0f766e'
};

const levelLabels = {
  1: '无专门立法',
  2: '有基础反虐待法',
  3: '完善福利法体系',
  4: '宪法承认动物感知'
};

async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    appData = await res.json();
    await renderWorldMap();
    renderLegend();
  } catch (err) {
    console.error('Failed to load data:', err);
    const intro = document.querySelector('.intro-text p');
    if (intro) intro.textContent = '数据加载失败，请检查 data.json 文件是否存在。';
  }
}

async function renderWorldMap() {
  const width = 960;
  const height = 500;

  const svg = d3.select('#world-map');
  mapSvg = svg;

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 6])
    .translateExtent([[-200, -100], [width + 200, height + 100]])
    .on('zoom', (event) => {
      mapGroup.attr('transform', event.transform);
    });
  mapZoom = zoom;

  svg.call(zoom);

  // Create a group for all zoomable content
  const mapGroup = svg.append('g');

  // Natural Earth projection
  const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2 + 20]);

  const path = d3.geoPath().projection(projection);

  // Graticule (grid lines)
  const graticule = d3.geoGraticule10();

  mapGroup.append('path')
    .datum(graticule)
    .attr('class', 'graticule')
    .attr('d', path);

  // Load world map from local file (no CDN dependency)
  try {
    const world = await d3.json('world-110m.json');
    const countries = topojson.feature(world, world.objects.countries);

    mapGroup.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('class', 'country-land')
      .attr('d', path);

    // Add country markers
    const markersGroup = mapGroup.append('g').attr('class', 'markers');

    appData.countries.forEach(country => {
      const hasData = country.timeline !== null && Array.isArray(country.timeline);
      const [lon, lat] = country.geoPosition;
      const [x, y] = projection([lon, lat]);

      const g = markersGroup.append('g')
        .attr('class', `country-marker ${hasData ? 'has-data' : 'no-data'}`)
        .attr('transform', `translate(${x},${y})`)
        .datum(country);

      // Outer ring
      g.append('circle')
        .attr('class', 'marker-ring')
        .attr('r', 10);

      // Main dot
      g.append('circle')
        .attr('r', 6)
        .attr('fill', levelColors[country.level])
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2.5);

      if (hasData) {
        g.style('cursor', 'pointer');

        // Label (hidden by default, shown on hover)
        const labelText = country.name;
        g.append('text')
          .attr('class', 'country-marker-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -16)
          .text(labelText);

        // Label background
        const estimatedWidth = labelText.length * 10 + 12;
        g.insert('rect', 'text')
          .attr('class', 'label-bg')
          .attr('x', -estimatedWidth / 2)
          .attr('y', -28)
          .attr('width', estimatedWidth)
          .attr('height', 16);

        // Hover interaction
        g.on('mouseenter', function() {
          d3.select(this).select('circle:nth-child(2)')
            .transition().duration(200).attr('r', 9);
        })
        .on('mouseleave', function() {
          d3.select(this).select('circle:nth-child(2)')
            .transition().duration(200).attr('r', 6);
        })
        .on('click', function(event, d) {
          showTimeline(d);
        });
      }
    });
  } catch (err) {
    console.error('Failed to load world map:', err);
    const intro = document.querySelector('.intro-text p');
    if (intro) intro.textContent = '地图数据加载失败，请检查 world-110m.json 文件是否存在。';
  }
}

function renderLegend() {
  const container = document.getElementById('legend-items');
  if (!container) return;
  container.innerHTML = '';

  appData.levels.forEach(level => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-dot" style="background: ${levelColors[level.id]}"></span>
      <span>${level.label}</span>
    `;
    container.appendChild(item);
  });
}

function showTimeline(country) {
  // Reset zoom when leaving map
  if (mapZoom && mapSvg) {
    mapSvg.transition().duration(300).call(mapZoom.transform, d3.zoomIdentity);
  }

  document.getElementById('map-view').classList.remove('active');
  document.getElementById('timeline-view').classList.add('active');
  window.scrollTo(0, 0);

  document.getElementById('timeline-country-name').textContent = country.name;
  const badge = document.getElementById('timeline-country-level');
  badge.textContent = levelLabels[country.level];
  badge.style.backgroundColor = levelColors[country.level];

  renderTimelineEvents(country.timeline);
}

function renderTimelineEvents(timeline) {
  const container = document.getElementById('timeline-events');
  container.innerHTML = '';

  timeline.forEach((item, index) => {
    const eventEl = document.createElement('div');
    eventEl.className = `timeline-event ${item.type === 'interactive' ? 'interactive' : ''}`;

    let contentHtml = `
      <div class="event-content">
        <div class="event-year">${item.year}</div>
        <div class="event-title">${item.title}</div>
        <div class="event-desc">${item.description}</div>
    `;

    if (item.type === 'interactive') {
      contentHtml += renderInteractiveHtml(item.interactive, index);
    }

    contentHtml += `</div><div class="event-dot"></div>`;
    eventEl.innerHTML = contentHtml;
    container.appendChild(eventEl);
  });
}

function renderInteractiveHtml(interactive, index) {
  const choicesHtml = interactive.choices.map((choice, ci) => `
    <button class="choice-btn" data-interactive="${index}" data-choice="${ci}">${choice.text}</button>
  `).join('');

  return `
    <div class="interactive-card" id="interactive-${index}">
      <span class="interactive-tag">互动节点</span>
      <div class="interactive-question">${interactive.question}</div>
      <div class="choices">
        ${choicesHtml}
      </div>
      <div class="feedback-box" id="feedback-${index}" style="display:none;"></div>
    </div>
  `;
}

function handleChoice(event) {
  const btn = event.target;
  if (!btn.classList.contains('choice-btn')) return;
  if (btn.disabled) return;

  const interactiveIndex = parseInt(btn.dataset.interactive);
  const choiceIndex = parseInt(btn.dataset.choice);

  const card = document.getElementById(`interactive-${interactiveIndex}`);
  if (!card) return;
  const feedbackBox = document.getElementById(`feedback-${interactiveIndex}`);
  const buttons = card.querySelectorAll('.choice-btn');

  // Disable all buttons
  buttons.forEach(b => {
    b.disabled = true;
    if (b !== btn) {
      b.style.opacity = '0.45';
    }
  });

  // Highlight selected
  btn.classList.add('selected');
  btn.style.opacity = '1';

  // Find corresponding data
  const countryName = document.getElementById('timeline-country-name').textContent;
  const country = appData.countries.find(c => c.name === countryName);
  if (!country) return;
  const interactive = country.timeline[interactiveIndex].interactive;
  const feedback = interactive.choices[choiceIndex].feedback;

  feedbackBox.textContent = feedback;
  feedbackBox.style.display = 'block';
}

// Back button
document.getElementById('back-btn').addEventListener('click', () => {
  document.getElementById('timeline-view').classList.remove('active');
  document.getElementById('map-view').classList.add('active');
  window.scrollTo(0, 0);
});

// Zoom controls
document.getElementById('zoom-in').addEventListener('click', () => {
  if (!mapZoom || !mapSvg) return;
  mapSvg.transition().duration(300).call(mapZoom.scaleBy, 1.5);
});

document.getElementById('zoom-out').addEventListener('click', () => {
  if (!mapZoom || !mapSvg) return;
  mapSvg.transition().duration(300).call(mapZoom.scaleBy, 1 / 1.5);
});

document.getElementById('zoom-reset').addEventListener('click', () => {
  if (!mapZoom || !mapSvg) return;
  mapSvg.transition().duration(300).call(mapZoom.transform, d3.zoomIdentity);
});

// Event delegation for interactive choices
document.getElementById('timeline-events').addEventListener('click', handleChoice);

// Start
loadData();