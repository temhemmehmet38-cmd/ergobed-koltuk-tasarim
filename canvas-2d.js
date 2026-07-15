export class Sofa2DPlanner {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas #${canvasId} not found`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.room = {
            wallA: 400, // cm (Horizontal wall)
            wallB: 300  // cm (Vertical wall)
        };
        
        this.sofa = {
            type: 'straight',
            width: 240,
            depth: 90,
            chaiseDepth: 160,
            chaiseWidth: 90,
            chaiseDir: 'left',
            armrestWidth: 20,
            cushionCount: 3,
            color: '#f1ebd9',
            // Centimeters relative to the room's top-left corner (0,0)
            x: 50, 
            y: 50,
            rotation: 0 // 0, 90, 180, 270 degrees
        };

        this.padding = 60; // Pixels padding around room walls
        this.scale = 1.0;  // Pixels per centimeter (calculated dynamically)
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Listeners
        this.initEvents();
        this.redraw();
    }

    updateRoom(wallA, wallB) {
        this.room.wallA = wallA;
        this.room.wallB = wallB;
        this.constrainSofaPosition();
        this.redraw();
    }

    updateSofa(params) {
        this.sofa = { ...this.sofa, ...params };
        this.constrainSofaPosition();
        this.redraw();
    }

    rotateSofa() {
        this.sofa.rotation = (this.sofa.rotation + 90) % 360;
        this.constrainSofaPosition();
        this.redraw();
    }

    resetPosition() {
        this.sofa.x = 20; // Snapped slightly off the corner
        this.sofa.y = 20;
        this.sofa.rotation = 0;
        this.constrainSofaPosition();
        this.redraw();
    }

    // Get current bounding box of the sofa in centimeter coords
    getSofaDimensionsCm() {
        let sw = this.sofa.width;
        let sd = this.sofa.depth;
        
        if (this.sofa.type !== 'straight') {
            sd = Math.max(this.sofa.depth, this.sofa.chaiseDepth);
        }

        // If rotated 90 or 270 degrees, swap width and depth for the bounding box
        if (this.sofa.rotation === 90 || this.sofa.rotation === 270) {
            return { w: sd, d: sw };
        }
        return { w: sw, d: sd };
    }

    constrainSofaPosition() {
        const bounds = this.getSofaDimensionsCm();
        
        // Keep inside room walls
        if (this.sofa.x < 0) this.sofa.x = 0;
        if (this.sofa.y < 0) this.sofa.y = 0;
        
        if (this.sofa.x + bounds.w > this.room.wallA) {
            this.sofa.x = Math.max(0, this.room.wallA - bounds.w);
        }
        if (this.sofa.y + bounds.d > this.room.wallB) {
            this.sofa.y = Math.max(0, this.room.wallB - bounds.d);
        }
    }

    initEvents() {
        // Dragging & Interaction
        const getMousePos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Client coords to canvas pixel coords
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const pxX = (clientX - rect.left) * (this.canvas.width / rect.width);
            const pxY = (clientY - rect.top) * (this.canvas.height / rect.height);
            
            // Pixel coords to Room Centimeters
            const cmX = (pxX - this.padding) / this.scale;
            const cmY = (pxY - this.padding) / this.scale;
            return { x: cmX, y: cmY };
        };

        const checkHit = (pos) => {
            const bounds = this.getSofaDimensionsCm();
            return (
                pos.x >= this.sofa.x && 
                pos.x <= this.sofa.x + bounds.w && 
                pos.y >= this.sofa.y && 
                pos.y <= this.sofa.y + bounds.d
            );
        };

        const handleStart = (e) => {
            const pos = getMousePos(e);
            if (checkHit(pos)) {
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - this.sofa.x,
                    y: pos.y - this.sofa.y
                };
                if (e.cancelable) e.preventDefault();
            }
        };

        const handleMove = (e) => {
            if (!this.isDragging) return;
            const pos = getMousePos(e);
            this.sofa.x = pos.x - this.dragOffset.x;
            this.sofa.y = pos.y - this.dragOffset.y;
            this.constrainSofaPosition();
            this.redraw();
            if (e.cancelable) e.preventDefault();
        };

        const handleEnd = () => {
            this.isDragging = false;
        };

        // Mouse listeners
        this.canvas.addEventListener('mousedown', handleStart);
        this.canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        // Touch listeners (Mobile support)
        this.canvas.addEventListener('touchstart', handleStart, { passive: false });
        this.canvas.addEventListener('touchmove', handleMove, { passive: false });
        this.canvas.addEventListener('touchend', handleEnd);

        // Double click to rotate
        this.canvas.addEventListener('dblclick', (e) => {
            const pos = getMousePos(e);
            if (checkHit(pos)) {
                this.rotateSofa();
            }
        });
    }

    calculateScale() {
        // Calculate canvas scale to fit room boundaries
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        
        const availableW = canvasW - (this.padding * 2);
        const availableH = canvasH - (this.padding * 2);
        
        const scaleX = availableW / this.room.wallA;
        const scaleY = availableH / this.room.wallB;
        
        this.scale = Math.min(scaleX, scaleY);
    }

    redraw() {
        this.calculateScale();
        
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Architectural Grid Background
        this.drawGrid();

        // Translate to top-left starting corner of the room
        ctx.save();
        ctx.translate(this.padding, this.padding);

        // 1. Draw Room Walls (as a background architectural guideline)
        this.drawRoomWalls();

        // 2. Draw Sofa
        this.drawSofa();

        // 3. Draw Dimension Lines (Duvar ölçüleri, koltuk ölçüleri, mesafe ölçüleri)
        this.drawDimensions();

        ctx.restore();
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#222d3d';
        ctx.lineWidth = 0.5;

        // Draw 50cm grid squares
        const gridSize = 50 * this.scale;
        if (gridSize < 5) return; // Prevent infinite loops

        ctx.beginPath();
        // Vertical lines
        for (let x = this.padding; x < this.canvas.width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
        }
        // Horizontal lines
        for (let y = this.padding; y < this.canvas.height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
        }
        ctx.stroke();
    }

    drawRoomWalls() {
        const ctx = this.ctx;
        const wA = this.room.wallA * this.scale;
        const wB = this.room.wallB * this.scale;
        const wallThick = 12; // Wall thickness in pixels

        ctx.strokeStyle = '#475569';
        ctx.fillStyle = '#1e293b';
        
        // Draw Wall A (Horizontal top) and Wall B (Vertical left) as a joined structure
        ctx.beginPath();
        // Wall B (left)
        ctx.rect(-wallThick, -wallThick, wallThick, wB + wallThick);
        // Wall A (top)
        ctx.rect(-wallThick, -wallThick, wA + wallThick, wallThick);
        ctx.fill();
        ctx.stroke();
        
        // Draw wall end markings
        ctx.fillStyle = '#64748b';
        ctx.fillRect(wA, -wallThick, 3, wallThick * 2);
        ctx.fillRect(-wallThick, wB, wallThick * 2, 3);
    }

    drawSofa() {
        const ctx = this.ctx;
        const scale = this.scale;
        
        ctx.save();
        
        // Translate to sofa center position for easy rotation
        const bounds = this.getSofaDimensionsCm();
        const sofaCenterX = this.sofa.x + bounds.w / 2;
        const sofaCenterY = this.sofa.y + bounds.d / 2;
        
        ctx.translate(sofaCenterX * scale, sofaCenterY * scale);
        ctx.rotate((this.sofa.rotation * Math.PI) / 180);

        // In rotated coordinate system, we draw the sofa centered around (0,0)
        // Original non-rotated dimensions:
        const sW = this.sofa.width;
        const sD = this.sofa.depth;
        const armW = this.sofa.armrestWidth;
        const backD = 15; // 15cm backrest

        // Setup styles
        ctx.fillStyle = this.getHexWithOpacity(this.sofa.color, 0.85);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        if (this.sofa.type === 'straight') {
            // Draw outer base
            this.drawRoundedRect(-sW/2 * scale, -sD/2 * scale, sW * scale, sD * scale, 6 * scale, true, true);
            
            // Remove shadow for inner parts
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;

            // Draw backrest
            const innerW = sW - (2 * armW);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(-innerW/2 * scale, -sD/2 * scale, innerW * scale, backD * scale);
            ctx.strokeRect(-innerW/2 * scale, -sD/2 * scale, innerW * scale, backD * scale);

            // Draw left armrest
            ctx.fillRect(-sW/2 * scale, -sD/2 * scale, armW * scale, sD * scale);
            ctx.strokeRect(-sW/2 * scale, -sD/2 * scale, armW * scale, sD * scale);

            // Draw right armrest
            ctx.fillRect((sW/2 - armW) * scale, -sD/2 * scale, armW * scale, sD * scale);
            ctx.strokeRect((sW/2 - armW) * scale, -sD/2 * scale, armW * scale, sD * scale);

            // Draw seat cushions
            const seatW = sW - (2 * armW);
            const seatD = sD - backD;
            const singleCushW = seatW / this.sofa.cushionCount;

            for (let i = 0; i < this.sofa.cushionCount; i++) {
                const xPos = -seatW/2 + (i * singleCushW);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                this.drawRoundedRect(xPos * scale, (-sD/2 + backD) * scale, singleCushW * scale, seatD * scale, 4 * scale, true, true);
            }
        } 
        else if (this.sofa.type === 'l-shape') {
            const chaiseD = this.sofa.chaiseDepth;
            const chaiseW = this.sofa.chaiseWidth;
            const isLeft = this.sofa.chaiseDir === 'left';
            
            // Draw L-shape bounding area
            ctx.beginPath();
            
            const xLeft = -sW/2 * scale;
            const xRight = sW/2 * scale;
            const yTop = -sD/2 * scale; // Always aligned to back wall
            const yBottomSofa = sD/2 * scale;
            const yBottomChaise = (-sD/2 + chaiseD) * scale;
            
            // Construct the path for L outline
            if (isLeft) {
                // Chaise is on left
                const xSplit = (-sW/2 + chaiseW) * scale;
                ctx.moveTo(xLeft, yTop);
                ctx.lineTo(xRight, yTop);
                ctx.lineTo(xRight, yBottomSofa);
                ctx.lineTo(xSplit, yBottomSofa);
                ctx.lineTo(xSplit, yBottomChaise);
                ctx.lineTo(xLeft, yBottomChaise);
            } else {
                // Chaise is on right
                const xSplit = (sW/2 - chaiseW) * scale;
                ctx.moveTo(xLeft, yTop);
                ctx.lineTo(xRight, yTop);
                ctx.lineTo(xRight, yBottomChaise);
                ctx.lineTo(xSplit, yBottomChaise);
                ctx.lineTo(xSplit, yBottomSofa);
                ctx.lineTo(xLeft, yBottomSofa);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Internal lines (cushions/arms)
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';

            const mainW = sW - chaiseW - armW;
            const mainXStart = isLeft ? (-sW/2 + chaiseW) * scale : -sW/2 * scale;
            const chaiseXStart = isLeft ? -sW/2 * scale : (sW/2 - chaiseW) * scale;
            
            // Main backrest
            const backW = mainW + armW;
            const backX = isLeft ? mainXStart : -sW/2 * scale;
            ctx.strokeRect(backX, yTop, backW * scale, backD * scale);

            // Chaise backrest corner
            ctx.strokeRect(chaiseXStart, yTop, chaiseW * scale, backD * scale);

            // Side armrests
            const mainArmX = isLeft ? (sW/2 - armW) * scale : -sW/2 * scale;
            ctx.strokeRect(mainArmX, yTop, armW * scale, sD * scale); // Main arm
            
            const chaiseArmX = isLeft ? -sW/2 * scale : (sW/2 - armW) * scale;
            ctx.strokeRect(chaiseArmX, yTop, armW * scale, chaiseD * scale); // Chaise arm

            // Main seat cushions (divide by 2)
            const singleSeatW = mainW / 2;
            const seatD = sD - backD;
            for (let i = 0; i < 2; i++) {
                const xPos = isLeft ? (chaiseXStart + chaiseW) + (i * singleSeatW) : (-sW/2 + armW) + (i * singleSeatW);
                ctx.strokeRect(xPos * scale, ( -sD/2 + backD ) * scale, singleSeatW * scale, seatD * scale);
            }

            // Chaise cushion (single large cushion)
            const chaiseSeatD = chaiseD - backD;
            ctx.strokeRect(chaiseXStart, ( -sD/2 + backD ) * scale, chaiseW * scale, chaiseSeatD * scale);
        }
        else if (this.sofa.type === 'u-shape') {
            const chaiseD = this.sofa.chaiseDepth;
            const chaiseW = this.sofa.chaiseWidth;
            
            // Outer path for U shape
            const xLeft = -sW/2 * scale;
            const xRight = sW/2 * scale;
            const yTop = -sD/2 * scale;
            const yBottomSofa = sD/2 * scale;
            const yBottomChaise = (-sD/2 + chaiseD) * scale;
            
            const xSplitLeft = (-sW/2 + chaiseW + armW) * scale;
            const xSplitRight = (sW/2 - chaiseW - armW) * scale;

            ctx.beginPath();
            ctx.moveTo(xLeft, yTop);
            ctx.lineTo(xRight, yTop);
            
            ctx.lineTo(xRight, yBottomChaise);
            ctx.lineTo(xRight - armW*scale - chaiseW*scale, yBottomChaise);
            ctx.lineTo(xSplitRight, yBottomSofa);
            ctx.lineTo(xSplitLeft, yBottomSofa);
            ctx.lineTo(xLeft + armW*scale + chaiseW*scale, yBottomChaise);
            ctx.lineTo(xLeft, yBottomChaise);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';

            // Center main backrest
            const backW = sW - (2 * armW);
            ctx.strokeRect((-sW/2 + armW) * scale, yTop, backW * scale, backD * scale);

            // Left & Right Armrests (Both are long)
            ctx.strokeRect(xLeft, yTop, armW * scale, chaiseD * scale);
            ctx.strokeRect((sW/2 - armW) * scale, yTop, armW * scale, chaiseD * scale);

            // Left & Right Chaise Cushions
            const chaiseSeatD = chaiseD - backD;
            ctx.strokeRect((-sW/2 + armW) * scale, (-sD/2 + backD) * scale, chaiseW * scale, chaiseSeatD * scale);
            ctx.strokeRect((sW/2 - armW - chaiseW) * scale, (-sD/2 + backD) * scale, chaiseW * scale, chaiseSeatD * scale);

            // Center seat cushions (usually 1 or 2)
            const mainW = sW - (2 * chaiseW) - (2 * armW);
            const centerCushCount = mainW > 120 ? 2 : 1;
            const singleCenterW = mainW / centerCushCount;
            const centerStart = -sW/2 + armW + chaiseW;

            for(let i=0; i < centerCushCount; i++) {
                const xPos = centerStart + (i * singleCenterW);
                ctx.strokeRect(xPos * scale, (-sD/2 + backD) * scale, singleCenterW * scale, (sD - backD) * scale);
            }
        }

        ctx.restore();
    }

    drawDimensions() {
        const ctx = this.ctx;
        const scale = this.scale;
        const bounds = this.getSofaDimensionsCm();

        const sX = this.sofa.x;
        const sY = this.sofa.y;
        const rW = this.room.wallA;
        const rH = this.room.wallB;

        ctx.font = '500 11px Outfit';
        ctx.fillStyle = '#60a5fa'; // Blue-400 for distances
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
        ctx.lineWidth = 1;

        // 1. Distance to Left Wall (Wall B)
        if (sX > 1) {
            this.drawDimensionLine(0, sY + bounds.d/2, sX, sY + bounds.d/2, `${Math.round(sX)} cm`);
        }

        // 2. Distance to Top Wall (Wall A)
        if (sY > 1) {
            this.drawDimensionLine(sX + bounds.w/2, 0, sX + bounds.w/2, sY, `${Math.round(sY)} cm`);
        }

        // 3. Distance to Right Wall boundary
        const rightDist = rW - (sX + bounds.w);
        if (rightDist > 1) {
            this.drawDimensionLine(sX + bounds.w, sY + bounds.d/2, rW, sY + bounds.d/2, `${Math.round(rightDist)} cm`);
        }

        // 4. Distance to Bottom Wall boundary
        const bottomDist = rH - (sY + bounds.d);
        if (bottomDist > 1) {
            this.drawDimensionLine(sX + bounds.w/2, sY + bounds.d, sX + bounds.w/2, rH, `${Math.round(bottomDist)} cm`);
        }

        // 5. Room Wall Dimensions (Outer labels)
        ctx.fillStyle = '#94a3b8'; // Slate-400 for wall lengths
        ctx.font = '600 12px Outfit';
        // Wall A Label
        ctx.fillText(`${rW} cm (Duvar A)`, (rW/2) * scale, -20);
        // Wall B Label
        ctx.save();
        ctx.translate(-20, (rH/2) * scale);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(`${rH} cm (Duvar B)`, 0, 0);
        ctx.restore();

        // 6. Sofa Outer Dimensions (draw on top of sofa outline)
        ctx.fillStyle = '#f8fafc'; // White
        ctx.font = '600 11px Outfit';
        
        let labelW = `${this.sofa.width} cm`;
        let labelD = `${this.sofa.depth} cm`;
        if (this.sofa.type !== 'straight') {
            labelD = `${this.sofa.depth} / ${this.sofa.chaiseDepth} cm`;
        }

        // Draw sofa dimension labels
        // Width label
        ctx.fillText(labelW, (sX + bounds.w/2) * scale, (sY - 8) * scale);
        // Depth label
        ctx.save();
        ctx.translate((sX - 8) * scale, (sY + bounds.d/2) * scale);
        ctx.rotate(-Math.PI/2);
        ctx.fillText(labelD, 0, 0);
        ctx.restore();
    }

    // Helper to draw clean dimension line with arrows and background-padded text
    drawDimensionLine(x1, y1, x2, y2, text) {
        const ctx = this.ctx;
        const scale = this.scale;
        
        const px1 = x1 * scale;
        const py1 = y1 * scale;
        const px2 = x2 * scale;
        const py2 = y2 * scale;

        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();

        // Draw small tick marks at ends
        const angle = Math.atan2(py2 - py1, px2 - px1);
        const tickLen = 6;
        
        ctx.beginPath();
        ctx.moveTo(px1 - Math.sin(angle) * tickLen, py1 + Math.cos(angle) * tickLen);
        ctx.lineTo(px1 + Math.sin(angle) * tickLen, py1 - Math.cos(angle) * tickLen);
        ctx.moveTo(px2 - Math.sin(angle) * tickLen, py2 + Math.cos(angle) * tickLen);
        ctx.lineTo(px2 + Math.sin(angle) * tickLen, py2 - Math.cos(angle) * tickLen);
        ctx.stroke();

        // Draw Text box in the middle
        const midX = (px1 + px2) / 2;
        const midY = (py1 + py2) / 2;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw small text background
        const textWidth = ctx.measureText(text).width + 6;
        ctx.fillStyle = '#181e29'; // Matches canvas background
        ctx.fillRect(midX - textWidth/2, midY - 8, textWidth, 16);
        
        ctx.fillStyle = '#60a5fa'; // Blue text
        ctx.fillText(text, midX, midY);
        ctx.restore();
    }

    // Canvas round rect helper
    drawRoundedRect(x, y, width, height, radius, fill, stroke) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height - radius);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    // Convert hex color to rgb with opacity
    getHexWithOpacity(hex, opacity) {
        // Remove hash if exists
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    takeScreenshot() {
        // Set white grid temporary to look beautiful in PDF? 
        // No, current canvas drawing is beautiful. Let's just return current canvas
        return this.canvas.toDataURL('image/png');
    }
}
