/**
 * drawings.js — Sophisticated, detailed SVG drawings organized into categories.
 * Uses programmatic generation to create intricate, well-defined coloring regions
 * covering animals, vehicles, scenes, and characters.
 */

const S = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" >
     <g fill="none" stroke="#111" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
   </svg>`;

const polar = (cx, cy, r, angle) => [
  cx + r * Math.cos(angle),
  cy + r * Math.sin(angle)
];

// ——— PATTERNS / MANDALAS ———

function makeMandala() {
  let sv = '';
  const cx = 200, cy = 200;
  sv += `<circle cx="${cx}" cy="${cy}" r="15" stroke-width="3"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="30" stroke-width="3"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="75" stroke-width="4"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="130" stroke-width="5"/>`;
  sv += `<circle cx="${cx}" cy="${cy}" r="185" stroke-width="6"/>`;

  for(let i=0; i<12; i++) {
    let a = (i/12)*Math.PI*2;
    let [x1, y1] = polar(cx, cy, 30, a - 0.1);
    let [x2, y2] = polar(cx, cy, 75, a);
    let [x3, y3] = polar(cx, cy, 30, a + 0.1);
    sv += `<path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" stroke-width="3"/>`;
  }

  for(let i=0; i<16; i++) {
    let a1 = (i/16)*Math.PI*2;
    let a2 = ((i+0.5)/16)*Math.PI*2;
    let a3 = ((i+1)/16)*Math.PI*2;
    let [x1, y1] = polar(cx, cy, 75, a1);
    let [x2, y2] = polar(cx, cy, 110, a2);
    let [x3, y3] = polar(cx, cy, 75, a3);
    sv += `<path d="M${x1},${y1} Q${x2},${y2} ${x3},${y3}" stroke-width="4"/>`;
    
    let [x4, y4] = polar(cx, cy, 85, a1 + 0.05);
    let [x5, y5] = polar(cx, cy, 100, a2);
    let [x6, y6] = polar(cx, cy, 85, a3 - 0.05);
    sv += `<path d="M${x4},${y4} Q${x5},${y5} ${x6},${y6}" stroke-width="2"/>`;
  }

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

function makeSunPattern() {
  let sv = '';
  // Sun center
  sv += `<circle cx="200" cy="200" r="50" stroke-width="5"/>`;
  sv += `<circle cx="180" cy="190" r="8" stroke-width="4"/>`;
  sv += `<circle cx="220" cy="190" r="8" stroke-width="4"/>`;
  sv += `<path d="M 180 215 C 190 230 210 230 220 215" stroke-width="4"/>`;
  // Sun rays
  for (let i = 0; i < 16; i++) {
    let a = (i/16)*Math.PI*2;
    let r1 = 60, r2 = 140;
    if (i % 2 === 0) { r2 = 180; } // alternating long/short rays
    
    let [x1, y1] = polar(200, 200, r1, a - 0.1);
    let [x2, y2] = polar(200, 200, r2, a);
    let [x3, y3] = polar(200, 200, r1, a + 0.1);
    sv += `<path d="M${x1},${y1} L${x2},${y2} L${x3},${y3} Z" stroke-width="4"/>`;
    
    // Internal ray detail
    let [x4, y4] = polar(200, 200, r1+15, a);
    let [x5, y5] = polar(200, 200, r2-20, a);
    sv += `<line x1="${x4}" y1="${y4}" x2="${x5}" y2="${y5}" stroke-width="2"/>`;
  }
  return S(sv);
}

// ——— SCENES / PLACES ———

function makeCastle() {
  let sv = '';
  sv += `<line x1="10" y1="360" x2="390" y2="360" stroke-width="6"/>`;
  sv += `<line x1="10" y1="375" x2="390" y2="375" stroke-width="4"/>`;
  sv += `<rect x="100" y="160" width="200" height="200" stroke-width="6"/>`;
  sv += `<path d="M 160 360 L 160 270 Q 200 230 240 270 L 240 360" stroke-width="6"/>`;
  for(let x=175; x<=225; x+=15) sv += `<line x1="${x}" y1="250" x2="${x}" y2="360" stroke-width="4"/>`;
  for(let y=270; y<=340; y+=20) sv += `<line x1="160" y1="${y}" x2="240" y2="${y}" stroke-width="4"/>`;

  for(let y=170; y<360; y+=15) {
    let offset = (y % 30 === 0) ? 0 : 20;
    sv += `<line x1="100" y1="${y}" x2="300" y2="${y}" stroke-width="2"/>`;
    for(let x=100 + offset; x<300; x+=40) {
      if (y > 240 && x > 150 && x < 250) continue; 
      sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
    }
  }

  const drawTower = (tx) => {
    sv += `<rect x="${tx}" y="100" width="60" height="260" stroke-width="6"/>`;
    for(let y=115; y<360; y+=15) {
      sv += `<line x1="${tx}" y1="${y}" x2="${tx+60}" y2="${y}" stroke-width="2"/>`;
      let offset = (y % 30 === 0) ? 0 : 15;
      for(let x=tx + offset; x<tx+60; x+=30) sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
    }
    sv += `<path d="M ${tx-10} 100 L ${tx+70} 100 L ${tx+70} 70 L ${tx+50} 70 L ${tx+50} 90 L ${tx+35} 90 L ${tx+35} 70 L ${tx+25} 70 L ${tx+25} 90 L ${tx+10} 90 L ${tx+10} 70 L ${tx-10} 70 Z" stroke-width="6"/>`;
    sv += `<path d="M ${tx+20} 150 L ${tx+20} 130 Q ${tx+30} 110 ${tx+40} 130 L ${tx+40} 150 Z" stroke-width="5"/>`;
    sv += `<line x1="${tx+30}" y1="120" x2="${tx+30}" y2="150" stroke-width="3"/>`;
    sv += `<path d="M ${tx+20} 250 L ${tx+20} 230 Q ${tx+30} 210 ${tx+40} 230 L ${tx+40} 250 Z" stroke-width="5"/>`;
    sv += `<line x1="${tx+30}" y1="220" x2="${tx+30}" y2="250" stroke-width="3"/>`;
  };

  drawTower(40);
  drawTower(300);

  sv += `<rect x="130" y="70" width="140" height="90" stroke-width="6"/>`;
  for(let y=85; y<160; y+=15) {
    sv += `<line x1="130" y1="${y}" x2="270" y2="${y}" stroke-width="2"/>`;
    let offset = (y % 30 === 0) ? 0 : 20;
    for(let x=130 + offset; x<270; x+=40) sv += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y-15}" stroke-width="2"/>`;
  }
  sv += `<path d="M 120 70 L 280 70 L 280 40 L 255 40 L 255 60 L 225 60 L 225 40 L 175 40 L 175 60 L 145 60 L 145 40 L 120 40 Z" stroke-width="6"/>`;
  
  sv += `<path d="M 175 40 L 200 5 L 225 40 Z" stroke-width="5"/>`;
  sv += `<line x1="200" y1="5" x2="200" y2="-25" stroke-width="4"/>`;
  sv += `<path d="M 200 -25 L 230 -15 L 200 -5 Z" stroke-width="4"/>`;

  sv += `<path d="M 50 40 Q 60 20 80 25 Q 100 10 120 30 Q 130 50 110 60 Q 90 70 70 60 Q 40 60 50 40 Z" stroke-width="4"/>`;
  sv += `<path d="M 330 60 Q 320 40 300 45 Q 280 30 260 50 Q 250 70 270 80 Q 290 90 310 80 Q 340 80 330 60 Z" stroke-width="4"/>`;

  return S(sv);
}

function makeSpaceStation() {
  let sv = '';
  sv += `<circle cx="60" cy="70" r="30" stroke-width="5"/>`;
  sv += `<path d="M 20 70 Q 60 30 100 80 Q 60 110 20 70 Z" stroke-width="4"/>`;
  sv += `<circle cx="340" cy="100" r="15" stroke-width="4"/>`;
  sv += `<circle cx="50" cy="280" r="8" stroke-width="3"/>`;
  sv += `<circle cx="350" cy="300" r="12" stroke-width="3"/>`;

  sv += `<circle cx="200" cy="200" r="70" stroke-width="7"/>`;
  sv += `<circle cx="200" cy="200" r="40" stroke-width="5"/>`;
  sv += `<line x1="160" y1="200" x2="240" y2="200" stroke-width="4"/>`;
  sv += `<line x1="200" y1="160" x2="200" y2="240" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="200" r="15" stroke-width="5"/>`;
  
  sv += `<rect x="100" y="190" width="30" height="20" stroke-width="5"/>`;
  sv += `<rect x="30" y="150" width="70" height="100" rx="5" stroke-width="6"/>`;
  for(let x=45; x<100; x+=15) sv += `<line x1="${x}" y1="150" x2="${x}" y2="250" stroke-width="3"/>`;
  for(let y=170; y<250; y+=20) sv += `<line x1="30" y1="${y}" x2="100" y2="${y}" stroke-width="3"/>`;

  sv += `<rect x="270" y="190" width="30" height="20" stroke-width="5"/>`;
  sv += `<rect x="300" y="150" width="70" height="100" rx="5" stroke-width="6"/>`;
  for(let x=315; x<370; x+=15) sv += `<line x1="${x}" y1="150" x2="${x}" y2="250" stroke-width="3"/>`;
  for(let y=170; y<250; y+=20) sv += `<line x1="300" y1="${y}" x2="370" y2="${y}" stroke-width="3"/>`;

  sv += `<rect x="190" y="90" width="20" height="40" stroke-width="5"/>`;
  sv += `<path d="M 200 90 L 200 40" stroke-width="5"/>`;
  sv += `<path d="M 160 50 C 180 30 220 30 240 50" stroke-width="5"/>`;
  sv += `<path d="M 170 40 C 185 20 215 20 230 40" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="35" r="6" stroke-width="4"/>`;

  sv += `<rect x="175" y="270" width="50" height="60" rx="10" stroke-width="6"/>`;
  sv += `<circle cx="200" cy="300" r="12" stroke-width="4"/>`;
  sv += `<path d="M 185 330 L 170 370 L 230 370 L 215 330 Z" stroke-width="5"/>`;
  sv += `<path d="M 180 370 L 200 400 L 220 370" stroke-width="4"/>`;

  return S(sv);
}

// ——— VEHICLES ———

function makeHotAirBalloon() {
  let sv = '';
  sv += `<path d="M 160 330 L 240 330 L 230 380 L 170 380 Z" stroke-width="6"/>`;
  for(let y=340; y<=370; y+=10) sv += `<line x1="${160 + (y-330)*0.2}" y1="${y}" x2="${240 - (y-330)*0.2}" y2="${y}" stroke-width="3"/>`;
  for(let x=180; x<=220; x+=15) sv += `<line x1="${x}" y1="330" x2="${x}" y2="380" stroke-width="3"/>`;

  sv += `<line x1="165" y1="330" x2="140" y2="250" stroke-width="4"/>`;
  sv += `<line x1="185" y1="330" x2="170" y2="250" stroke-width="4"/>`;
  sv += `<line x1="215" y1="330" x2="230" y2="250" stroke-width="4"/>`;
  sv += `<line x1="235" y1="330" x2="260" y2="250" stroke-width="4"/>`;

  sv += `<path d="M 140 250 C 0 200 40 20 200 20 C 360 20 400 200 260 250 C 230 260 170 260 140 250 Z" stroke-width="8"/>`;
  
  sv += `<path d="M 200 20 C 130 60 140 200 160 252" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 270 60 260 200 240 252" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 170 80 180 220 180 255" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 230 80 220 220 220 255" stroke-width="5"/>`;
  sv += `<path d="M 200 20 C 200 80 200 220 200 256" stroke-width="5"/>`;

  sv += `<path d="M 68 120 Q 200 160 332 120" stroke-width="5"/>`;
  sv += `<path d="M 50 160 Q 200 200 350 160" stroke-width="5"/>`;
  sv += `<path d="M 65 200 Q 200 240 335 200" stroke-width="5"/>`;

  sv += `<path d="M 40 80 Q 50 60 60 80 Q 70 60 80 80" stroke-width="4"/>`;
  sv += `<path d="M 320 50 Q 330 35 340 50 Q 350 35 360 50" stroke-width="4"/>`;
  sv += `<path d="M 350 280 Q 360 270 370 280 Q 380 270 390 280" stroke-width="4"/>`;

  return S(sv);
}

function makeRacingCar() {
  let sv = '';
  sv += `<line x1="20" y1="360" x2="380" y2="360" stroke-width="8"/>`;
  sv += `<line x1="60" y1="380" x2="100" y2="380" stroke-width="5"/>`;
  sv += `<line x1="160" y1="380" x2="200" y2="380" stroke-width="5"/>`;
  sv += `<line x1="260" y1="380" x2="300" y2="380" stroke-width="5"/>`;

  sv += `<path d="M 60 280 C 40 280 30 250 50 230 C 90 190 160 170 200 170 L 250 170 C 290 170 350 220 360 260 C 370 280 350 300 320 300 L 60 300 Z" stroke-width="8"/>`;
  sv += `<path d="M 330 300 C 350 310 380 310 380 280 L 360 260" stroke-width="6"/>`;
  sv += `<path d="M 50 230 L 40 160 L 100 150 L 90 200" stroke-width="6"/>`;
  sv += `<path d="M 30 140 L 110 130" stroke-width="8"/>`;
  sv += `<path d="M 25 125 L 115 115" stroke-width="8"/>`;
  sv += `<path d="M 140 170 C 160 110 210 100 240 110 L 250 170 Z" stroke-width="7"/>`;
  sv += `<path d="M 180 170 L 180 110" stroke-width="5"/>`;
  
  sv += `<circle cx="215" cy="140" r="18" stroke-width="5"/>`;
  sv += `<path d="M 205 135 L 230 135 L 230 150 L 205 150 Z" stroke-width="4"/>`;

  sv += `<path d="M 100 230 L 320 230" stroke-width="5"/>`;
  sv += `<path d="M 90 250 L 340 250" stroke-width="5"/>`;
  sv += `<circle cx="200" cy="240" r="25" stroke-width="5"/>`;
  sv += `<path d="M 195 225 L 195 255 M 190 230 L 195 225 L 205 225 M 185 255 L 205 255" stroke-width="4"/>`;

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

  sv += `<path d="M 50 270 C 20 270 10 250 0 255 C 20 265 10 280 30 285 C 10 295 20 310 60 290 Z" stroke-width="5"/>`;

  return S(sv);
}

function makeAirplane() {
  let sv = '';
  // Clouds background
  sv += `<path d="M 60 80 Q 70 60 90 65 Q 110 50 130 70 Q 140 90 120 100 Q 100 110 80 100 Q 50 100 60 80 Z" stroke-width="4"/>`;
  sv += `<path d="M 290 320 Q 300 300 320 305 Q 340 290 360 310 Q 370 330 350 340 Q 330 350 310 340 Q 280 340 290 320 Z" stroke-width="4"/>`;
  
  // Fuselage
  sv += `<path d="M 50 200 C 50 160 150 160 250 160 C 350 160 380 190 380 200 C 380 210 350 240 250 240 C 150 240 50 240 50 200 Z" stroke-width="7"/>`;
  
  // Cockpit window
  sv += `<path d="M 320 170 C 340 175 350 185 350 190 L 320 190 Z" stroke-width="5"/>`;

  // Passenger windows
  for(let x=100; x<=260; x+=35) {
    sv += `<rect x="${x}" y="185" width="16" height="12" rx="4" stroke-width="4"/>`;
  }

  // Tail Wing
  sv += `<path d="M 60 180 L 80 80 L 120 80 L 130 160 Z" stroke-width="6"/>`;
  // Main Wing (Bottom)
  sv += `<path d="M 180 240 L 140 330 L 230 330 L 250 240 Z" stroke-width="6"/>`;
  // Main Wing (Top/Behind)
  sv += `<path d="M 180 160 L 220 70 L 270 70 L 240 160 Z" stroke-width="5"/>`;

  // Left Engine
  sv += `<rect x="180" y="250" width="30" height="20" rx="6" stroke-width="5"/>`;
  sv += `<path d="M 210 250 C 220 250 220 270 210 270 Z" stroke-width="4"/>`;

  // Decorative Stripe
  sv += `<path d="M 50 215 L 365 215" stroke-width="5"/>`;

  return S(sv);
}

// ——— CHARACTERS ———

function makeRobot() {
  let sv = '';
  sv += `<line x1="40" y1="380" x2="360" y2="380" stroke-width="6"/>`;
  sv += `<rect x="110" y="330" width="180" height="50" rx="25" stroke-width="6"/>`;
  sv += `<circle cx="135" cy="355" r="15" stroke-width="5"/>`;
  sv += `<circle cx="200" cy="355" r="15" stroke-width="5"/>`;
  sv += `<circle cx="265" cy="355" r="15" stroke-width="5"/>`;
  for(let x=135; x<=265; x+=20) {
    sv += `<line x1="${x}" y1="330" x2="${x}" y2="340" stroke-width="3"/>`;
    sv += `<line x1="${x}" y1="370" x2="${x}" y2="380" stroke-width="3"/>`;
  }
  
  sv += `<path d="M 160 330 L 170 300 L 230 300 L 240 330 Z" stroke-width="6"/>`;
  sv += `<line x1="175" y1="315" x2="225" y2="315" stroke-width="4"/>`;

  sv += `<rect x="130" y="160" width="140" height="140" rx="15" stroke-width="6"/>`;
  sv += `<rect x="145" y="175" width="110" height="65" rx="5" stroke-width="5"/>`;
  sv += `<path d="M 200 205 C 200 190 180 180 165 195 C 150 210 200 230 200 230 C 200 230 250 210 235 195 C 220 180 200 190 200 205 Z" stroke-width="4"/>`;
  
  sv += `<circle cx="160" cy="270" r="12" stroke-width="4"/>`;
  sv += `<circle cx="200" cy="270" r="12" stroke-width="4"/>`;
  sv += `<rect x="230" y="258" width="24" height="24" rx="4" stroke-width="4"/>`;

  sv += `<rect x="180" y="140" width="40" height="20" stroke-width="5"/>`;
  sv += `<line x1="180" y1="150" x2="220" y2="150" stroke-width="4"/>`;

  sv += `<rect x="140" y="60" width="120" height="80" rx="20" stroke-width="6"/>`;
  sv += `<circle cx="170" cy="95" r="18" stroke-width="5"/>`;
  sv += `<circle cx="170" cy="95" r="6" stroke-width="3"/>`;
  sv += `<circle cx="230" cy="95" r="18" stroke-width="5"/>`;
  sv += `<circle cx="230" cy="95" r="6" stroke-width="3"/>`;
  sv += `<rect x="165" y="120" width="70" height="10" rx="3" stroke-width="4"/>`;
  for(let ax=180; ax<=225; ax+=15) sv += `<line x1="${ax}" y1="120" x2="${ax}" y2="130" stroke-width="3"/>`;

  sv += `<line x1="200" y1="60" x2="200" y2="20" stroke-width="5"/>`;
  sv += `<circle cx="200" cy="15" r="8" stroke-width="5"/>`;

  sv += `<path d="M 130 180 L 80 170 L 60 220 L 95 240 L 130 230" stroke-width="6"/>`;
  sv += `<line x1="105" y1="175" x2="85" y2="210" stroke-width="4"/>`;
  sv += `<path d="M 60 220 C 30 210 30 250 50 260 C 60 250 80 250 95 240" stroke-width="5"/>`;
  sv += `<path d="M 45 225 C 20 235 50 270 70 250" stroke-width="5"/>`;
  
  sv += `<path d="M 270 180 L 320 170 L 340 220 L 305 240 L 270 230" stroke-width="6"/>`;
  sv += `<line x1="295" y1="175" x2="315" y2="210" stroke-width="4"/>`;
  sv += `<path d="M 340 220 C 370 210 370 250 350 260 C 340 250 320 250 305 240" stroke-width="5"/>`;
  sv += `<path d="M 355 225 C 380 235 350 270 330 250" stroke-width="5"/>`;

  return S(sv);
}

function makeAstronaut() {
  let sv = '';
  // Moon ground
  sv += `<path d="M 10 370 Q 100 340 200 360 Q 300 380 390 350 L 390 390 L 10 390 Z" stroke-width="6"/>`;
  sv += `<circle cx="100" cy="370" r="10" stroke-width="4"/>`;
  sv += `<circle cx="280" cy="380" r="15" stroke-width="4"/>`;

  // Legs
  sv += `<path d="M 140 230 L 120 350 L 160 350 L 170 260" stroke-width="7"/>`;
  sv += `<path d="M 260 230 L 280 350 L 240 350 L 230 260" stroke-width="7"/>`;
  // Boots
  sv += `<path d="M 110 350 C 110 340 170 340 170 350 L 170 365 L 110 365 Z" stroke-width="6"/>`;
  sv += `<path d="M 230 350 C 230 340 290 340 290 350 L 290 365 L 230 365 Z" stroke-width="6"/>`;
  // Knee pads
  sv += `<rect x="130" y="300" width="30" height="20" rx="5" stroke-width="5"/>`;
  sv += `<rect x="240" y="300" width="30" height="20" rx="5" stroke-width="5"/>`;

  // Torso
  sv += `<rect x="140" y="150" width="120" height="100" rx="20" stroke-width="7"/>`;
  // Life support pack detail
  sv += `<rect x="160" y="170" width="80" height="60" rx="8" stroke-width="5"/>`;
  sv += `<circle cx="180" cy="190" r="10" stroke-width="4"/>`;
  sv += `<rect x="220" y="180" width="10" height="40" stroke-width="4"/>`;
  sv += `<line x1="170" y1="215" x2="200" y2="215" stroke-width="4"/>`;

  // Arms
  sv += `<path d="M 140 170 C 100 160 80 200 90 240 C 95 260 110 260 115 240" stroke-width="7"/>`;
  sv += `<path d="M 260 170 C 300 160 350 140 320 100 C 310 80 290 90 300 110" stroke-width="7"/>`;

  // Helmet / Head
  sv += `<circle cx="200" cy="100" r="50" stroke-width="8"/>`;
  // Visor
  sv += `<path d="M 160 100 C 160 60 240 60 240 100 C 240 130 160 130 160 100 Z" stroke-width="5"/>`;
  sv += `<path d="M 175 85 C 190 75 220 75 230 90" stroke-width="4"/>`; // Reflection

  // Stars
  sv += `<circle cx="50" cy="50" r="3" stroke-width="3"/>`;
  sv += `<circle cx="90" cy="120" r="5" stroke-width="4"/>`;
  sv += `<circle cx="340" cy="50" r="4" stroke-width="3"/>`;
  sv += `<circle cx="300" cy="200" r="3" stroke-width="3"/>`;

  return S(sv);
}

// ——— ANIMALS ———

function makeOwl() {
  let sv = '';
  // Branch
  sv += `<path d="M 20 280 Q 200 320 380 270" stroke-width="8"/>`;
  sv += `<path d="M 300 285 Q 340 320 360 310" stroke-width="6"/>`; // twig
  sv += `<path d="M 100 295 Q 80 330 50 320" stroke-width="6"/>`; // twig
  // Leaves
  sv += `<path d="M 360 310 Q 370 295 380 310 Q 370 325 360 310 Z" stroke-width="4"/>`;
  sv += `<path d="M 50 320 Q 60 305 70 320 Q 60 335 50 320 Z" stroke-width="4"/>`;

  // Body
  sv += `<ellipse cx="200" cy="220" rx="90" ry="110" stroke-width="7"/>`;
  
  // Belly pattern (feathers)
  for(let y=170; y<=280; y+=25) {
    let w = 80 - Math.abs(220 - y)*0.5;
    for(let x = 200 - w; x <= 200 + w; x += 25) {
      sv += `<path d="M ${x} ${y} Q ${x+12.5} ${y+15} ${x+25} ${y}" stroke-width="3"/>`;
    }
  }

  // Claws
  sv += `<path d="M 160 325 C 160 350 180 350 180 325" stroke-width="5"/>`;
  sv += `<path d="M 150 320 C 150 345 170 345 170 320" stroke-width="5"/>`;
  sv += `<path d="M 170 320 C 170 345 190 345 190 320" stroke-width="5"/>`;

  sv += `<path d="M 220 325 C 220 350 240 350 240 325" stroke-width="5"/>`;
  sv += `<path d="M 210 320 C 210 345 230 345 230 320" stroke-width="5"/>`;
  sv += `<path d="M 230 320 C 230 345 250 345 250 320" stroke-width="5"/>`;

  // Wings
  sv += `<path d="M 115 170 C 50 200 70 300 125 280" stroke-width="6"/>`;
  sv += `<path d="M 285 170 C 350 200 330 300 275 280" stroke-width="6"/>`;
  
  // Head / Ears
  sv += `<path d="M 140 130 L 120 50 L 170 90 C 190 85 210 85 230 90 L 280 50 L 260 130" stroke-width="7"/>`;
  
  // Eyes
  sv += `<circle cx="165" cy="120" r="35" stroke-width="5"/>`;
  sv += `<circle cx="235" cy="120" r="35" stroke-width="5"/>`;
  sv += `<circle cx="165" cy="120" r="12" stroke-width="6"/>`;
  sv += `<circle cx="235" cy="120" r="12" stroke-width="6"/>`;

  // Beak
  sv += `<path d="M 190 145 Q 200 170 210 145 Z" stroke-width="5"/>`;

  return S(sv);
}

function makeDog() {
  let sv = '';
  // Dog Body
  sv += `<path d="M 130 200 Q 130 330 200 330 Q 270 330 270 200 Z" stroke-width="7"/>`;
  // Legs
  sv += `<path d="M 150 330 L 150 370 C 150 380 130 380 130 370 L 130 310" stroke-width="6"/>`; // left back
  sv += `<path d="M 250 330 L 250 370 C 250 380 270 380 270 370 L 270 310" stroke-width="6"/>`; // right back
  sv += `<path d="M 170 300 L 170 375 C 170 385 190 385 190 375 L 190 330" stroke-width="6"/>`; // left front
  sv += `<path d="M 230 300 L 230 375 C 230 385 210 385 210 375 L 210 330" stroke-width="6"/>`; // right front

  // Tail
  sv += `<path d="M 140 280 C 80 300 80 220 120 200" stroke-width="6"/>`;

  // Collar
  sv += `<path d="M 145 200 Q 200 220 255 200" stroke-width="7"/>`;
  sv += `<circle cx="200" cy="215" r="8" stroke-width="4"/>`;

  // Head
  sv += `<ellipse cx="200" cy="130" rx="70" ry="60" stroke-width="7"/>`;
  // Ears
  sv += `<path d="M 140 100 C 90 70 80 160 130 150" stroke-width="6"/>`;
  sv += `<path d="M 260 100 C 310 70 320 160 270 150" stroke-width="6"/>`;

  // Muzzle
  sv += `<ellipse cx="200" cy="160" rx="40" ry="30" stroke-width="5"/>`;
  sv += `<ellipse cx="200" cy="145" rx="15" ry="10" stroke-width="6"/>`; // nose
  sv += `<path d="M 200 155 L 200 170" stroke-width="4"/>`;
  sv += `<path d="M 180 175 Q 200 190 220 175" stroke-width="4"/>`;

  // Eyes
  sv += `<circle cx="170" cy="110" r="12" stroke-width="5"/>`;
  sv += `<circle cx="230" cy="110" r="12" stroke-width="5"/>`;
  sv += `<circle cx="175" cy="105" r="3" stroke-width="3"/>`;
  sv += `<circle cx="235" cy="105" r="3" stroke-width="3"/>`;

  return S(sv);
}

export const DRAWINGS = [
  // Blank page for free drawing
  { id: 'blank',   name: 'Blank Page',  emoji: '✏️', svg: S('') },
  // Patterns
  { id: 'mandala', name: 'Mandala', emoji: '🌸', svg: makeMandala() },
  { id: 'sun',     name: 'Sun Art', emoji: '☀️', svg: makeSunPattern() },
  // Places / Scenes
  { id: 'castle',  name: 'Castle',  emoji: '🏰', svg: makeCastle() },
  { id: 'space',   name: 'Space',   emoji: '🛰️', svg: makeSpaceStation() },
  // Vehicles
  { id: 'balloon', name: 'Balloon', emoji: '🎈', svg: makeHotAirBalloon() },
  { id: 'racecar', name: 'Race Car',emoji: '🏎️', svg: makeRacingCar() },
  { id: 'plane',   name: 'Airplane',emoji: '✈️', svg: makeAirplane() },
  // Characters
  { id: 'robot',   name: 'Robot',   emoji: '🤖', svg: makeRobot() },
  { id: 'astro',   name: 'Astronaut',emoji:'👨‍🚀', svg: makeAstronaut() },
  // Animals
  { id: 'owl',     name: 'Owl',     emoji: '🦉', svg: makeOwl() },
  { id: 'dog',     name: 'Dog',     emoji: '🐶', svg: makeDog() },
];
