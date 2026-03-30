/**
 * drawings.js — Sophisticated, detailed SVG drawings for the coloring book.
 * Uses programmatic generation to create intricate, well-defined coloring regions
 * that are much more engaging for 6-8 year olds than basic shapes.
 */

const S = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" >
     <g fill="none" stroke="#111" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
   </svg>`;

// Helper for polar coordinates
const polar = (cx, cy, r, angle) => [
  cx + r * Math.cos(angle),
  cy + r * Math.sin(angle)
];

function makeMandala() {
  let sv = '';
  const cx = 200, cy = 200;
  
  // Center rings
  sv += `<circle cx="${cx}" cy="${cy}" r="15" stroke-width="3"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="30" stroke-width="3"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="75" stroke-width="4"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="130" stroke-width="5"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="185" stroke-width="6"/>`;

  // Inner small petals (12)
  for(let i=0; i<12; i++) {
    let a = (i/12)*Math.PI*2;
    let [x1, y1] = polar(cx, cy, 30, a - 0.1);
    let [x2, y2] = polar(cx, cy, 75, a);
    let [x3, y3] = polar(cx, cy, 30, a + 0.1);
    sv += `<path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" stroke-width="3"/>`;
  }

  // Mid layered petals (16)
  for(let i=0; i<16; i++) {
    let a1 = (i/16)*Math.PI*2;
    let a2 = ((i+0.5)/16)*Math.PI*2;
    let a3 = ((i+1)/16)*Math.PI*2;
    let [x1, y1] = polar(cx, cy, 75, a1);
    let [x2, y2] = polar(cx, cy, 110, a2);
    let [x3, y3] = polar(cx, cy, 75, a3);
    sv += `<path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" stroke-width="4"/>`;
    
    // Inner detail inside mid petal
    let [x4, y4] = polar(cx, cy, 85, a1 + 0.05);
    let [x5, y5] = polar(cx, cy, 100, a2);
    let [x6, y6] = polar(cx, cy, 85, a3 - 0.05);
    sv += `<path d="M${x4},${y4} Q${x5},${y5} ${x6},${y6}" stroke-width="2"/>`;
  }

  // Outer triangles & circles
  for(let i=0; i<24; i++) {
    let a1 = (i/24)*Math.PI*2;
    let a2 = ((i+0.5)/24)*Math.PI*2;
    let a3 = ((i+1)/24)*Math.PI*2;
    
    let [x1, y1] = polar(cx, cy, 130, a1);
    let [x2, y2] = polar(cx, cy, 175, a2);
    let [x3, y3] = polar(cx, cy, 130, a3);
    sv += `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3}" stroke-width="4"/>`;
    
    let [cx2, cy2] = polar(cx, cy, 155, a2);
    sv += `<circle cx="${cx2}" cy="${cy2}" r="10" stroke-width="3"/>`;
  }

  return S(sv);
}

function makeCastle() {
  let sv = '';
  // Ground
  sv += `<line x1="10" y1="360" x2="390" y2="360" stroke-width="6"/>`;
  sv += `<line x1="10" y1="375" x2="390" y2="375" stroke-width="4"/>`;

  // Back wall
  sv += `<rect x="100" y="160" width="200" height="200" stroke-width="6"/>`;
  
  // Gate
  sv += `<path d="M 160 360 L 160 270 Q 200 230 240 270 L 240 360" stroke-width="6"/>`;
  // Portcullis grid
  for(let x=175; x<=225; x+=15) sv += `<line x1="${x}" y1="250" x2="${x}" y2="360" stroke-width="4"/>`;
  for(let y=270; y<=340; y+=20) sv += `<line x1="160" y1="${y}" x2="240" y2="${y}" stroke-width="4"/>`;

  // Draw bricks on main wall (avoiding gate)
  for(let y=170; y<360; y+=15) {
    let offset = (y % 30 === 0) ? 0 : 20;
    sv += `<line x1="100" y1="${y}" x2="300" y2="${y}" stroke-width="2"/>`;
    for(let x=100 + offset; x<300; x+=40) {
      if (y > 240 && x > 150 && x < 250) continue; // skip gate area
      sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
    }
  }

  // Side Towers
  const drawTower = (tx) => {
    sv += `<rect x="${tx}" y="100" width="60" height="260" stroke-width="6"/>`;
    // Tower bricks
    for(let y=115; y<360; y+=15) {
      sv += `<line x1="${tx}" y1="${y}" x2="${tx+60}" y2="${y}" stroke-width="2"/>`;
      let offset = (y % 30 === 0) ? 0 : 15;
      for(let x=tx + offset; x<tx+60; x+=30) {
        sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
      }
    }
    // Battlements
    sv += `<path d="M ${tx-10} 100 L ${tx+70} 100 L ${tx+70} 70 L ${tx+50} 70 L ${tx+50} 90 L ${tx+35} 90 L ${tx+35} 70 L ${tx+25} 70 L ${tx+25} 90 L ${tx+10} 90 L ${tx+10} 70 L ${tx-10} 70 Z" stroke-width="6"/>`;
    // Windows
    sv += `<path d="M ${tx+20} 150 L ${tx+20} 130 Q ${tx+30} 110 ${tx+40} 130 L ${tx+40} 150 Z" stroke-width="5"/>`;
    sv += `<line x1="${tx+30}" y1="120" x2="${tx+30}" y2="150" stroke-width="3"/>`;
    sv += `<path d="M ${tx+20} 250 L ${tx+20} 230 Q ${tx+30} 210 ${tx+40} 230 L ${tx+40} 250 Z" stroke-width="5"/>`;
    sv += `<line x1="${tx+30}" y1="220" x2="${tx+30}" y2="250" stroke-width="3"/>`;
  };

  drawTower(40);
  drawTower(300);

  // Center Keep
  sv += `<rect x="130" y="70" width="140" height="90" stroke-width="6"/>`;
  for(let y=85; y<160; y+=15) {
    sv += `<line x1="130" y1="${y}" x2="270" y2="${y}" stroke-width="2"/>`;
    let offset = (y % 30 === 0) ? 0 : 20;
    for(let x=130 + offset; x<270; x+=40) {
      sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
    }
  }
  sv += `<path d="M 120 70 L 280 70 L 280 40 L 255 40 L 255 60 L 225 60 L 225 40 L 175 40 L 175 60 L 145 60 L 145 40 L 120 40 Z" stroke-width="6"/>`;
  
  // Center Roof & Flag
  sv += `<path d="M 175 40 L 200 5 L 225 40 Z" stroke-width="5"/>`;
  sv += `<line x1="200" y1="5" x2="200" y2="-25" stroke-width="4"/>`;
  sv += `<path d="M 200 -25 L 230 -15 L 200 -5 Z" stroke-width="4"/>`;

  // Clouds
  sv += `<path d="M 50 40 Q 60 20 80 25 Q 100 10 120 30 Q 130 50 110 60 Q 90 70 70 60 Q 40 60 50 40 Z" stroke-width="4"/>`;
  sv += `<path d="M 330 60 Q 320 40 300 45 Q 280 30 260 50 Q 250 70 270 80 Q 290 90 310 80 Q 340 80 330 60 Z" stroke-width="4"/>`;

  return S(sv);
}

function makeHotAirBalloon() {
  let sv = '';
  // Basket
  sv += `<path d="M 160 330 L 240 330 L 230 380 L 170 380 Z" stroke-width="6"/>`;
  // Basket weave
  for(let y=340; y<=370; y+=10) sv += `<line x1="${160 + (y-330)*0.2}" y1="${y}" x2="${240 - (y-330)*0.2}" y2="${y}" stroke-width="3"/>`;
  for(let x=180; x<=220; x+=15) sv += `<line x1="${x}" y1="330" x2="${x}" y2="380" stroke-width="3"/>`;

  // Ropes
  sv += `<line x1="165" y1="330" x2="140" y2="250" stroke-width="4"/>`;
  sv += `<line x1="185" y1="330" x2="170" y2="250" stroke-width="4"/>`;
  sv += `<line x1="215" y1="330" x2="230" y2="250" stroke-width="4"/>`;
  sv += `<line x1="235" y1="330" x2="260" y2="250" stroke-width="4"/>`;

  // Envelope (Balloon) outline
  sv += `<path d="M 140 250 C 0 200 40 20 200 20 C 360 20 400 200 260 250 C 230 260 170 260 140 250 Z" stroke-width="8"/>`;
  
  // Envelope curved segments
  sv += `<path d="M 200 20 C 130 60 140 200 160 252" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 270 60 260 200 240 252" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 170 80 180 220 180 255" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 230 80 220 220 220 255" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 200 80 200 220 200 256" stroke-width="5"/>`;

  // Horizontal bands on balloon
  sv += `<path d="M 68 120 Q 200 160 332 120" stroke-width="5"/>`;
  sv += `<path d="M 50 160 Q 200 200 350 160" stroke-width="5"/>`;
  sv += `<path d="M 65 200 Q 200 240 335 200" stroke-width="5"/>`;

  // Birds in background
  sv += `<path d="M 40 80 Q 50 60 60 80 Q 70 60 80 80" stroke-width="4"/>`;
  sv += `<path d="M 320 50 Q 330 35 340 50 Q 350 35 360 50" stroke-width="4"/>`;
  sv += `<path d="M 350 280 Q 360 270 370 280 Q 380 270 390 280" stroke-width="4"/>`;

  return S(sv);
}

function makeRobot() {
  let sv = '';
  // Ground
  sv += `<line x1="40" y1="380" x2="360" y2="380" stroke-width="6"/>`;

  // Treads (Legs)
  sv += `<rect x="110" y="330" width="180" height="50" rx="25" stroke-width="6"/>`;
  sv += `<circle cx="135" cy="355" r="15" stroke-width="5"/>`;
  sv += `<circle cx="200" cy="355" r="15" stroke-width="5"/>`;
  sv += `<circle cx="265" cy="355" r="15" stroke-width="5"/>`;
  for(let x=135; x<=265; x+=20) {
    sv += `<line x1="${x}" y1="330" x2="${x}" y2="340" stroke-width="3"/>`;
    sv += `<line x1="${x}" y1="370" x2="${x}" y2="380" stroke-width="3"/>`;
  }
  
  // Waist
  sv += `<path d="M 160 330 L 170 300 L 230 300 L 240 330 Z" stroke-width="6"/>`;
  sv += `<line x1="175" y1="315" x2="225" y2="315" stroke-width="4"/>`;

  // Main Body
  sv += `<rect x="130" y="160" width="140" height="140" rx="15" stroke-width="6"/>`;
  
  // Body screen & buttons
  sv += `<rect x="145" y="175" width="110" height="65" rx="5" stroke-width="5"/>`;
  // Heart in screen
  sv += `<path d="M 200 205 C 200 190 180 180 165 195 C 150 210 200 230 200 230 C 200 230 250 210 235 195 C 220 180 200 190 200 205 Z" stroke-width="4"/>`;
  
  // Buttons below screen
  sv += `<circle cx="160" cy="270" r="12" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="270" r="12" stroke-width="4"/>`;
  sv += `<rect x="230" y="258" width="24" height="24" rx="4" stroke-width="4"/>`;

  // Neck
  sv += `<rect x="180" y="140" width="40" height="20" stroke-width="5"/>`;
  sv += `<line x1="180" y1="150" x2="220" y2="150" stroke-width="4"/>`;

  // Head
  sv += `<rect x="140" y="60" width="120" height="80" rx="20" stroke-width="6"/>`;
  // Eyes
  sv += `<circle cx="170" cy="95" r="18" stroke-width="5"/>`;
  sv += `<circle cx="170" cy="95" r="6" stroke-width="3"/>`;
  sv += `<circle cx="230" cy="95" r="18" stroke-width="5"/>`;
  sv += `<circle cx="230" cy="95" r="6" stroke-width="3"/>`;
  // Mouth
  sv += `<rect x="165" y="120" width="70" height="10" rx="3" stroke-width="4"/>`;
  sv += `<line x1="180" y1="120" x2="180" y2="130" stroke-width="3"/>`;
  sv += `<line x1="195" y1="120" x2="195" y2="130" stroke-width="3"/>`;
  sv += `<line x1="210" y1="120" x2="210" y2="130" stroke-width="3"/>`;
  sv += `<line x1="225" y1="120" x2="225" y2="130" stroke-width="3"/>`;

  // Antenna
  sv += `<line x1="200" y1="60" x2="200" y2="20" stroke-width="5"/>`;
  sv += `<circle cx="200" cy="15" r="8" stroke-width="5"/>`;
  sv += `<path d="M 180 5 C 190 0 210 0 220 5" stroke-width="4"/>`;

  // Left Arm (segmented)
  sv += `<path d="M 130 180 L 80 170 L 60 220 L 95 240 L 130 230" stroke-width="6"/>`;
  sv += `<line x1="105" y1="175" x2="85" y2="210" stroke-width="4"/>`;
  // Claw Left
  sv += `<path d="M 60 220 C 30 210 30 250 50 260 C 60 250 80 250 95 240" stroke-width="5"/>`;
  sv += `<path d="M 45 225 C 20 235 50 270 70 250" stroke-width="5"/>`;
  
  // Right Arm (segmented)
  sv += `<path d="M 270 180 L 320 170 L 340 220 L 305 240 L 270 230" stroke-width="6"/>`;
  sv += `<line x1="295" y1="175" x2="315" y2="210" stroke-width="4"/>`;
  // Claw Right
  sv += `<path d="M 340 220 C 370 210 370 250 350 260 C 340 250 320 250 305 240" stroke-width="5"/>`;
  sv += `<path d="M 355 225 C 380 235 350 270 330 250" stroke-width="5"/>`;

  return S(sv);
}

function makeSpaceStation() {
  let sv = '';
  // Background stars/planets
  sv += `<circle cx="60" cy="70" r="30" stroke-width="5"/>`;
  sv += `<path d="M 20 70 Q 60 30 100 80 Q 60 110 20 70 Z" stroke-width="4"/>`; // Saturn ring
  sv += `<circle cx="340" cy="100" r="15" stroke-width="4"/>`;
  sv += `<circle cx="50" cy="280" r="8" stroke-width="3"/>`;
  sv += `<circle cx="350" cy="300" r="12" stroke-width="3"/>`;

  // Central Hub
  sv += `<circle cx="200" cy="200" r="70" stroke-width="7"/>`;
  sv += `<circle cx="200" cy="200" r="40" stroke-width="5"/>`;
  sv += `<line x1="160" y1="200" x2="240" y2="200" stroke-width="4"/>`;
  sv += `<line x1="200" y1="160" x2="200" y2="240" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="200" r="15" stroke-width="5"/>`;
  
  // Left Solar Panel Arm
  sv += `<rect x="100" y="190" width="30" height="20" stroke-width="5"/>`;
  sv += `<rect x="30" y="150" width="70" height="100" rx="5" stroke-width="6"/>`;
  // Grid on left
  for(let x=45; x<100; x+=15) sv += `<line x1="${x}" y1="150" x2="${x}" y2="250" stroke-width="3"/>`;
  for(let y=170; y<250; y+=20) sv += `<line x1="30" y1="${y}" x2="100" y2="${y}" stroke-width="3"/>`;

  // Right Solar Panel Arm
  sv += `<rect x="270" y="190" width="30" height="20" stroke-width="5"/>`;
  sv += `<rect x="300" y="150" width="70" height="100" rx="5" stroke-width="6"/>`;
  // Grid on right
  for(let x=315; x<370; x+=15) sv += `<line x1="${x}" y1="150" x2="${x}" y2="250" stroke-width="3"/>`;
  for(let y=170; y<250; y+=20) sv += `<line x1="300" y1="${y}" x2="370" y2="${y}" stroke-width="3"/>`;

  // Top Antenna Array
  sv += `<rect x="190" y="90" width="20" height="40" stroke-width="5"/>`;
  sv += `<path d="M 200 90 L 200 40" stroke-width="5"/>`;
  sv += `<path d="M 160 50 C 180 30 220 30 240 50" stroke-width="5"/>`;
  sv += `<path d="M 170 40 C 185 20 215 20 230 40" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="35" r="6" stroke-width="4"/>`;

  // Bottom Module
  sv += `<rect x="175" y="270" width="50" height="60" rx="10" stroke-width="6"/>`;
  sv += `<circle cx="200" cy="300" r="12" stroke-width="4"/>`;
  // Thrust/Exhaust below
  sv += `<path d="M 185 330 L 170 370 L 230 370 L 215 330 Z" stroke-width="5"/>`;
  sv += `<path d="M 180 370 L 200 400 L 220 370" stroke-width="4"/>`;

  return S(sv);
}

function makeRacingCar() {
  let sv = '';
  // Road
  sv += `<line x1="20" y1="360" x2="380" y2="360" stroke-width="8"/>`;
  sv += `<line x1="60" y1="380" x2="100" y2="380" stroke-width="5"/>`;
  sv += `<line x1="160" y1="380" x2="200" y2="380" stroke-width="5"/>`;
  sv += `<line x1="260" y1="380" x2="300" y2="380" stroke-width="5"/>`;

  // Main Body
  sv += `<path d="M 60 280 C 40 280 30 250 50 230 C 90 190 160 170 200 170 L 250 170 C 290 170 350 220 360 260 C 370 280 350 300 320 300 L 60 300 Z" stroke-width="8"/>`;
  
  // Front Bumper / Nose
  sv += `<path d="M 330 300 C 350 310 380 310 380 280 L 360 260" stroke-width="6"/>`;
  
  // Rear Spoiler
  sv += `<path d="M 50 230 L 40 160 L 100 150 L 90 200" stroke-width="6"/>`;
  sv += `<path d="M 30 140 L 110 130" stroke-width="8"/>`;
  sv += `<path d="M 25 125 L 115 115" stroke-width="8"/>`;

  // Cabin / Window
  sv += `<path d="M 140 170 C 160 110 210 100 240 110 L 250 170 Z" stroke-width="7"/>`;
  sv += `<path d="M 180 170 L 180 110" stroke-width="5"/>`;
  
  // Driver Helmet
  sv += `<circle cx="215" cy="140" r="18" stroke-width="5"/>`;
  sv += `<path d="M 205 135 L 230 135 L 230 150 L 205 150 Z" stroke-width="4"/>`;

  // Decals / Stripes
  sv += `<path d="M 100 230 L 320 230" stroke-width="5"/>`;
  sv += `<path d="M 90 250 L 340 250" stroke-width="5"/>`;
  // "Number" circle
  sv += `<circle cx="200" cy="240" r="25" stroke-width="5"/>`;
  sv += `<path d="M 195 225 L 195 255 M 190 230 L 195 225 L 205 225 M 185 255 L 205 255" stroke-width="4"/>`; // Draw a "1"

  // Wheels
  const drawWheel = (cx, cy) => {
    sv += `<circle cx="${cx}" cy="${cy}" r="40" stroke-width="8"/>`;
    sv += `<circle cx="${cx}" cy="${cy}" r="25" stroke-width="6"/>`;
    sv += `<circle cx="${cx}" cy="${cy}" r="8" stroke-width="4"/>`;
    for(let i=0; i<6; i++) {
      let a = (i/6)*Math.PI*2;
      let [x1, y1] = polar(cx, cy, 8, a);
      let [x2, y2] = polar(cx, cy, 25, a);
      sv += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="5"/>`;
    }
  };

  drawWheel(120, 310);
  drawWheel(280, 310);

  // Exhaust Flames
  sv += `<path d="M 50 270 C 20 270 10 250 0 255 C 20 265 10 280 30 285 C 10 295 20 310 60 290 Z" stroke-width="5"/>`;

  return S(sv);
}

export const DRAWINGS = [
  { id: 'mandala', name: 'Mandala',    emoji: '🌸', svg: makeMandala() },
  { id: 'robot',   name: 'Robot',      emoji: '🤖', svg: makeRobot() },
  { id: 'castle',  name: 'Castle',     emoji: '🏰', svg: makeCastle() },
  { id: 'balloon', name: 'Balloon',    emoji: '🎈', svg: makeHotAirBalloon() },
  { id: 'racecar', name: 'Race Car',   emoji: '🏎️', svg: makeRacingCar() },
  { id: 'space',   name: 'Space',      emoji: '🛰️', svg: makeSpaceStation() }
];
