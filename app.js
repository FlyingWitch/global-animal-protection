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
  const countryName = document.getElementById('timeline-country-name').textContent;

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

    contentHtml += `<button class="event-share-btn" data-index="${index}" title="分享此条"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg><span>分享</span></button>`;

    contentHtml += `</div><div class="event-dot"></div>`;
    eventEl.innerHTML = contentHtml;
    container.appendChild(eventEl);
  });
}

// === Share card ===
let html2canvasLoaded = false;

function loadHtml2canvas() {
  return new Promise((resolve, reject) => {
    if (html2canvasLoaded || window.html2canvas) {
      html2canvasLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = () => { html2canvasLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const morandiColors = {
  1: { bg: '#e8e4df', accent: '#a8a29e', text: '#44403c' },
  2: { bg: '#e0ece4', accent: '#7ba690', text: '#3d4f44' },
  3: { bg: '#d4e4dc', accent: '#5d8a72', text: '#2d4a3a' },
  4: { bg: '#c9ddd3', accent: '#3d6b54', text: '#1e3a2b' }
};

function createShareCard(country, item) {
  const colors = morandiColors[country.level] || morandiColors[1];
  const levelLabel = levelLabels[country.level];

  const overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.innerHTML = `
    <div class="share-modal">
      <div class="share-modal-header">
        <span>分享卡片预览</span>
        <button class="share-close-btn">&times;</button>
      </div>
      <div class="share-card-preview">
        <div class="share-card" id="share-card-content" style="background: ${colors.bg}; color: ${colors.text};">
          <div class="share-card-top">
            <span class="share-card-country" style="color: ${colors.accent};">${country.name}</span>
            <span class="share-card-level" style="background: ${colors.accent};">${levelLabel}</span>
          </div>
          <div class="share-card-year" style="color: ${colors.accent};">${item.year}</div>
          <div class="share-card-title">${item.title}</div>
          <div class="share-card-desc">${item.description}</div>
          <div class="share-card-footer" style="border-color: ${colors.accent};">
            <span>全球动物保护立法进程</span>
            <span class="share-card-url">global-animal-protection</span>
          </div>
        </div>
      </div>
      <div class="share-modal-actions">
        <button class="share-download-btn" id="share-download">下载图片</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  bindShareModalEvents(overlay, country, `${country.name}-${item.year}`, colors.bg);
}

function createTimelineShareCard(country) {
  const colors = morandiColors[country.level] || morandiColors[1];
  const levelLabel = levelLabels[country.level];
  const timeline = country.timeline;
  const milestones = timeline.map(t => `<div class="share-tl-item"><span class="share-tl-year">${t.year}</span><span class="share-tl-title">${t.title}</span></div>`).join('');

  const overlay = document.createElement('div');
  overlay.className = 'share-overlay';
  overlay.innerHTML = `
    <div class="share-modal share-modal-wide">
      <div class="share-modal-header">
        <span>分享卡片预览</span>
        <button class="share-close-btn">&times;</button>
      </div>
      <div class="share-card-preview">
        <div class="share-card share-card-timeline" id="share-card-content" style="background: ${colors.bg}; color: ${colors.text};">
          <div class="share-card-top">
            <span class="share-card-country" style="color: ${colors.accent};">${country.name}</span>
            <span class="share-card-level" style="background: ${colors.accent};">${levelLabel}</span>
          </div>
          <div class="share-card-tl-label" style="color: ${colors.accent};">动物保护立法进程</div>
          <div class="share-tl-list">${milestones}</div>
          <div class="share-card-footer" style="border-color: ${colors.accent};">
            <span>全球动物保护立法进程</span>
            <span class="share-card-url">global-animal-protection</span>
          </div>
        </div>
      </div>
      <div class="share-modal-actions">
        <button class="share-download-btn" id="share-download">下载图片</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  bindShareModalEvents(overlay, country, `${country.name}-时间线`, colors.bg);
}

function bindShareModalEvents(overlay, country, fileName, bgColor) {
  overlay.querySelector('.share-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay.querySelector('#share-download').addEventListener('click', async () => {
    const btn = overlay.querySelector('#share-download');
    btn.textContent = '生成中...';
    btn.disabled = true;
    try {
      await loadHtml2canvas();
      const card = overlay.querySelector('#share-card-content');
      // Clone the card to a clean off-screen container so html2canvas
      // renders exactly what's in the card, not affected by the modal layout.
      const clone = card.cloneNode(true);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      const canvas = await html2canvas(clone, {
        scale: 2,
        backgroundColor: bgColor,
        useCORS: true,
        allowTaint: true
      });
      wrapper.remove();
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      btn.textContent = '已保存';
    } catch (err) {
      console.error('Share card error:', err);
      btn.textContent = '生成失败';
    }
    setTimeout(() => {
      btn.textContent = '下载图片';
      btn.disabled = false;
    }, 2000);
  });
}

function handleShareClick(event) {
  const btn = event.target.closest('.event-share-btn');
  if (!btn) return;

  const index = parseInt(btn.dataset.index);
  const countryName = document.getElementById('timeline-country-name').textContent;
  const country = appData.countries.find(c => c.name === countryName);
  if (!country) return;
  const item = country.timeline[index];
  if (!item) return;

  createShareCard(country, item);
}

function handleTimelineShare() {
  const countryName = document.getElementById('timeline-country-name').textContent;
  const country = appData.countries.find(c => c.name === countryName);
  if (!country) return;
  createTimelineShareCard(country);
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
document.getElementById('timeline-events').addEventListener('click', handleShareClick);

// Share timeline button
document.getElementById('share-timeline-btn').addEventListener('click', handleTimelineShare);

// === Search functionality ===
const searchInput = document.getElementById('country-search');
const searchResults = document.getElementById('search-results');

const continentMap = {
  germany: '欧洲', switzerland: '欧洲', uk: '欧洲', austria: '欧洲',
  netherlands: '欧洲', sweden: '欧洲', norway: '欧洲', russia: '欧洲',
  japan: '亚洲', korea: '亚洲', india: '亚洲', china: '亚洲',
  hongkong: '亚洲', macau: '亚洲', taiwan: '亚洲',
  usa: '北美洲', canada: '北美洲',
  brazil: '南美洲', argentina: '南美洲', peru: '南美洲', colombia: '南美洲',
  newzealand: '大洋洲', australia: '大洋洲',
  southafrica: '非洲', egypt: '非洲', nigeria: '非洲'
};

const continentOrder = ['亚洲', '欧洲', '北美洲', '南美洲', '大洋洲', '非洲'];

function performSearch(query) {
  if (!appData) return [];
  const q = query.trim().toLowerCase();
  if (!q) return appData.countries.slice();
  return appData.countries.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.nameEn.toLowerCase().includes(q)
  );
}

function renderSearchResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-result">未找到匹配的国家</div>';
    searchResults.classList.add('active');
    return;
  }

  // Group by continent
  const grouped = {};
  results.forEach(c => {
    const continent = continentMap[c.id] || '其他';
    if (!grouped[continent]) grouped[continent] = [];
    grouped[continent].push(c);
  });

  continentOrder.forEach(continent => {
    if (!grouped[continent]) return;

    const header = document.createElement('div');
    header.className = 'search-continent-header';
    header.textContent = `${continent}（${grouped[continent].length}）`;
    searchResults.appendChild(header);

    grouped[continent].forEach(country => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const hasTimeline = country.timeline && Array.isArray(country.timeline) && country.timeline.length > 0;
      item.innerHTML = `
        <span class="search-result-dot" style="background: ${levelColors[country.level]}"></span>
        <span class="search-result-name">${country.name}</span>
        <span class="search-result-name-en">${country.nameEn}</span>
        <span class="search-result-level">${levelLabels[country.level]}</span>
      `;
      item.addEventListener('click', () => {
        searchInput.value = '';
        searchResults.classList.remove('active');
        if (hasTimeline) {
          showTimeline(country);
        } else {
          const intro = document.querySelector('.intro-text p');
          if (intro) {
            const original = intro.textContent;
            intro.textContent = `${country.name}：暂无立法时间线数据`;
            setTimeout(() => { intro.textContent = original; }, 2500);
          }
        }
      });
      searchResults.appendChild(item);
    });
  });

  searchResults.classList.add('active');
}

searchInput.addEventListener('input', (e) => {
  const results = performSearch(e.target.value);
  renderSearchResults(results);
});

searchInput.addEventListener('focus', (e) => {
  if (e.target.value.trim()) {
    const results = performSearch(e.target.value);
    renderSearchResults(results);
  } else {
    renderSearchResults(appData ? appData.countries : []);
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('active');
  }
});

// Start
loadData();