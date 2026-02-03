/**
 * Configuration
 */
const CONFIG = {
    ticksPerSecond: 20,
    totalTicks: 400, // 20 seconds
    pitchRange: 25   // 0 to 24
};

const INSTRUMENTS = ['harp', 'bass', 'guitar', 'banjo', 'pling'];
const INSTRUMENT_COLORS = ['#00bcd4', '#ff9800', '#8bc34a', '#e91e63', '#9c27b0'];

/**
 * App State
 */
let songData = []; // { tick, inst, pitch }
let isPlaying = false;
let currentTick = 0;
let playbackInterval = null; // Stores the Interval ID
let selectedInstrument = 0;

// DOM Elements
const sequencerGrid = document.getElementById('sequencerGrid');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const playHead = document.createElement('div'); 

playHead.className = 'play-head';

/**
 * Initialization
 */
function init() {
    renderGrid();
    setupListeners();
    updateTimeDisplay();
}

/**
 * Render the Grid with Sticky Keys
 */
function renderGrid() {
    // 1. Setup Grid Layout
    sequencerGrid.style.gridTemplateColumns = `40px repeat(${CONFIG.totalTicks}, 35px)`; // Key col + Ticks
    sequencerGrid.style.gridTemplateRows = `repeat(${CONFIG.pitchRange}, 28px)`;
    
    // 2. Add Playhead
    sequencerGrid.appendChild(playHead);

    // 3. Build Cells
    for (let pitch = CONFIG.pitchRange - 1; pitch >= 0; pitch--) {
        
        // Sticky Key Label (Column 1)
        const key = document.createElement('div');
        key.className = 'key-label';
        key.innerText = pitch;
        key.style.gridRow = CONFIG.pitchRange - pitch; // Reverse row order visually
        key.style.gridColumn = 1;
        sequencerGrid.appendChild(key);

        // Note Cells (Columns 2 to N)
        for (let tick = 0; tick < CONFIG.totalTicks; tick++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            if (tick % 4 === 0) cell.classList.add('beat-mark'); // Visual guide
            
            // Grid Positioning
            cell.style.gridRow = CONFIG.pitchRange - pitch;
            cell.style.gridColumn = tick + 2; // Offset by 1 for key column
            
            // Data Attributes for Click Logic
            cell.dataset.tick = tick;
            cell.dataset.pitch = pitch;

            // Touch/Click Listener
            cell.addEventListener('click', () => toggleNote(tick, pitch, cell));
            
            sequencerGrid.appendChild(cell);
        }
    }
}

/**
 * Toggle Note Logic
 */
function toggleNote(tick, pitch, cell) {
    const existingIndex = songData.findIndex(n => n.tick === tick && n.pitch === pitch);

    if (existingIndex > -1) {
        // Remove
        songData.splice(existingIndex, 1);
        cell.innerHTML = '';
    } else {
        // Add
        songData.push({ tick, pitch, inst: selectedInstrument });
        
        const marker = document.createElement('div');
        marker.className = 'note-marker';
        marker.style.backgroundColor = INSTRUMENT_COLORS[selectedInstrument];
        marker.style.color = INSTRUMENT_COLORS[selectedInstrument];
        cell.appendChild(marker);

        playPreviewSound(selectedInstrument, pitch);
    }
}

/**
 * Audio Preview
 */
function playPreviewSound(instIndex, pitch) {
    const instName = INSTRUMENTS[instIndex];
    // Path: noteblock/harp/12.ogg
    const audio = new Audio(`noteblock/${instName}/${pitch}.ogg`);
    audio.volume = 0.5;
    audio.play().catch(e => { /* Ignore errors if file missing in dev */ });
}

/**
 * =========================================
 *  PLAYBACK LOGIC (Fixed)
 * =========================================
 */

function play() {
    if (isPlaying) return; // Prevent multiple loops
    
    isPlaying = true;
    const speed = parseFloat(document.getElementById('speedInput').value) || 1.0;
    const msPerTick = (1000 / CONFIG.ticksPerSecond) / speed;

    playbackInterval = setInterval(() => {
        if (currentTick >= CONFIG.totalTicks) {
            stop();
            return;
        }

        // Play notes
        const notes = songData.filter(n => n.tick === currentTick);
        notes.forEach(n => playPreviewSound(n.inst, n.pitch));

        // Update UI
        updatePlayHead();
        updateTimeDisplay();

        currentTick++;

    }, msPerTick);
}

function pause() {
    if (!isPlaying) return;
    
    isPlaying = false;
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
}

function stop() {
    pause(); // Stop interval first
    currentTick = 0;
    updatePlayHead();
    updateTimeDisplay();
}

function updatePlayHead() {
    // 40px is key width, 35px is cell width
    const leftPos = 40 + (currentTick * 35);
    playHead.style.left = `${leftPos}px`;
    
    // Auto Scroll Logic
    const viewport = document.querySelector('.sequencer-viewport');
    if (leftPos > viewport.scrollLeft + viewport.clientWidth || leftPos < viewport.scrollLeft) {
        viewport.scrollLeft = leftPos - 100;
    }

    // Progress Bar
    progressBar.value = (currentTick / CONFIG.totalTicks) * 100;
}

function updateTimeDisplay() {
    const curSec = Math.floor(currentTick / 20);
    const totSec = Math.floor(CONFIG.totalTicks / 20);
    currentTimeEl.textContent = formatTime(curSec);
    totalTimeEl.textContent = formatTime(totSec);
}

function formatTime(s) {
    return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
}

/**
 * Listeners
 */
function setupListeners() {
    document.getElementById('playBtn').addEventListener('click', play);
    document.getElementById('pauseBtn').addEventListener('click', pause);
    document.getElementById('stopBtn').addEventListener('click', stop);
    
    document.getElementById('instrumentSelect').addEventListener('change', (e) => {
        selectedInstrument = parseInt(e.target.value);
    });

    // Scrubber
    progressBar.addEventListener('input', (e) => {
        const wasPlaying = isPlaying;
        if(wasPlaying) pause();
        
        currentTick = Math.floor((e.target.value / 100) * CONFIG.totalTicks);
        updatePlayHead();
        updateTimeDisplay();
        
        if(wasPlaying) play();
    });

    document.getElementById('downloadBtn').addEventListener('click', generateApiFile);
}

/**
 * =========================================
 *  API GENERATOR
 * =========================================
 */
function generateApiFile() {
    const fileId = Math.floor(Math.random() * 900) + 100;
    const filename = `music${fileId}.js`;
    const speed = document.getElementById('speedInput').value;

    songData.sort((a, b) => a.tick - b.tick);

    // Format: [tick, instrumentIndex, pitchIndex]
    const dataString = songData.map(n => `[${n.tick},${n.inst},${n.pitch}]`).join(',');

    const fileContent = `/**
 * Bedrock Music API - Track ${fileId}
 */
export const Music${fileId} = {
    id: ${fileId},
    speed: ${speed},
    instruments: ["note.harp", "note.bass", "note.guitar", "note.banjo", "note.pling"],
    data: [${dataString}],
    getNotesAt(tick) {
        return this.data.filter(n => n[0] === tick).map(n => ({
            sound: this.instruments[n[1]],
            pitch: Math.pow(2, (n[2] - 12) / 12)
        }));
    }
};`;

    download(filename, fileContent);
}

function download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Start
init();
