import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Sofa3DVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        this.sofaGroup = new THREE.Group();
        this.initScene();
        this.initLights();
        this.initFloor();
        
        // Add sofa group to scene
        this.scene.add(this.sofaGroup);
        
        // Start animation loop
        this.animate();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());
    }

    initScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070b);
        this.scene.fog = new THREE.FogExp2(0x05070b, 0.08);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45, 
            this.container.clientWidth / this.container.clientHeight, 
            0.1, 
            100
        );
        this.camera.position.set(3.5, 2.5, 4.5); // Default isometric-like angle

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            preserveDrawingBuffer: true, // Required for screenshots
            antialias: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below floor
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 15;
        this.controls.target.set(0, 0.5, 0);
    }

    initLights() {
        // Ambient Light for soft filling
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Key light (Directional) with soft shadows
        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.dirLight.position.set(5, 8, 5);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 25;
        this.dirLight.shadow.camera.left = -3;
        this.dirLight.shadow.camera.right = 3;
        this.dirLight.shadow.camera.top = 3;
        this.dirLight.shadow.camera.bottom = -3;
        this.dirLight.shadow.bias = -0.0005;
        this.dirLight.shadow.radius = 4;
        this.scene.add(this.dirLight);

        // Fill light (Directional, opposite side, no shadows)
        const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.4);
        fillLight.position.set(-5, 4, -5);
        this.scene.add(fillLight);

        // Rim/Back light to pop the sofa outline
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
        rimLight.position.set(0, 3, -6);
        this.scene.add(rimLight);
    }

    initFloor() {
        // Floor geometry
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        
        // Custom floor material with soft grid reflection and shadow reception
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x11151d,
            roughness: 0.8,
            metalness: 0.1,
        });

        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grid helper representing room scale (each square is 50x50 cm)
        const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1e293b);
        gridHelper.position.y = 0.001; // Avoid z-fighting
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    // Material library
    getSofaMaterial(hexColor) {
        // Premium fabric material look (roughness high, subtle velvet-like sheen using roughness map or values)
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(hexColor),
            roughness: 0.85,
            metalness: 0.05,
            bumpScale: 0.01,
            // Simulating soft fabric depth
        });
    }

    getLegMaterial(legType) {
        switch (legType) {
            case 'brass': // Polished brass gold
                return new THREE.MeshStandardMaterial({
                    color: 0xd4af37,
                    roughness: 0.15,
                    metalness: 0.9,
                });
            case 'black': // Matte black metal
                return new THREE.MeshStandardMaterial({
                    color: 0x1e1e1e,
                    roughness: 0.5,
                    metalness: 0.7,
                });
            case 'wood': // Wooden walnut style
            default:
                return new THREE.MeshStandardMaterial({
                    color: 0x5c4033, // Walnut brown
                    roughness: 0.6,
                    metalness: 0.1,
                });
        }
    }

    // Main draw loop
    setSofaParams(params) {
        // Clear previous meshes
        while(this.sofaGroup.children.length > 0) { 
            const obj = this.sofaGroup.children[0];
            this.sofaGroup.remove(obj);
        }

        // Convert cm to meters (Three.js units)
        const w = params.width / 100;
        const d = params.depth / 100;
        const h = params.height / 100;
        const sh = params.seatHeight / 100;
        const armW = params.armrestWidth / 100;
        const legH = params.legHeight / 100;
        
        const type = params.type; // 'straight', 'l-shape', 'u-shape'
        const chaiseDir = params.chaiseDir || 'left'; // 'left', 'right'
        
        // Materials
        const fabricMat = this.getSofaMaterial(params.color);
        const legMat = this.getLegMaterial(params.legType);

        // Dimensions of cushions and base elements
        const baseH = sh - legH; // Seating base height
        const backH = h - sh; // Backrest height
        const backD = 0.15; // Backrest thickness (15 cm)
        const armH = sh + 0.15; // Armrest height (seat height + 15 cm)
        const cushionThick = 0.12; // Seating cushion thickness (12 cm)

        // Adjust shadow camera to fit sofa size dynamically
        this.dirLight.shadow.camera.left = -w * 0.8;
        this.dirLight.shadow.camera.right = w * 0.8;
        this.dirLight.shadow.camera.updateProjectionMatrix();

        // 1. BASE ASSEMBLY (KASA)
        if (type === 'straight') {
            // Seating base
            const baseW = w - (2 * armW);
            this.createBox(baseW, baseH, d, 0, legH + baseH/2, 0, fabricMat);

            // Backrest
            this.createBox(baseW, backH, backD, 0, sh + backH/2, -(d/2 - backD/2), fabricMat);

            // Armrests
            // Left Arm
            this.createBox(armW, armH, d, -(w/2 - armW/2), armH/2, 0, fabricMat);
            // Right Arm
            this.createBox(armW, armH, d, (w/2 - armW/2), armH/2, 0, fabricMat);

            // Seating Cushions
            const seatW = baseW;
            const seatD = d - backD;
            const singleCushionW = (seatW - 0.01 * (params.cushionCount - 1)) / params.cushionCount; // 1cm gap between cushions
            
            for (let i = 0; i < params.cushionCount; i++) {
                const xPos = -(seatW / 2) + (singleCushionW / 2) + i * (singleCushionW + 0.01);
                // Seat Cushion
                this.createBox(singleCushionW, cushionThick, seatD, xPos, sh - cushionThick/2, backD/2, fabricMat, true);
                
                // Back Cushion (Leaning slightly or standard box)
                const backCushionW = singleCushionW;
                const backCushionH = backH + 0.05;
                const backCushionD = 0.12;
                this.createBox(backCushionW, backCushionH, backCushionD, xPos, sh + backCushionH/2 - 0.02, -(d/2 - backD - backCushionD/2 - 0.02), fabricMat, true);
            }

            // Legs (4 corners)
            const legR = 0.03; // Leg radius
            const legOffset = 0.08;
            this.createCylinder(legR, legH, -(w/2 - legOffset), legH/2, -(d/2 - legOffset), legMat);
            this.createCylinder(legR, legH, (w/2 - legOffset), legH/2, -(d/2 - legOffset), legMat);
            this.createCylinder(legR, legH, -(w/2 - legOffset), legH/2, (d/2 - legOffset), legMat);
            this.createCylinder(legR, legH, (w/2 - legOffset), legH/2, (d/2 - legOffset), legMat);

        } 
        else if (type === 'l-shape') {
            const chaiseD = params.chaiseDepth / 100;
            const chaiseW = params.chaiseWidth / 100;
            
            // Layout math
            const mainW = w - chaiseW - armW; // Seating area width (excluding chaise and one armrest)
            const isLeft = chaiseDir === 'left';
            
            // X Center positions
            const chaiseX = isLeft ? -(w/2 - chaiseW/2) : (w/2 - chaiseW/2);
            const mainX = isLeft ? (w/2 - mainW/2 - armW) : -(w/2 - mainW/2 - armW);
            
            // Armrest positions
            const armLeftX = -(w/2 - armW/2);
            const armRightX = (w/2 - armW/2);

            // 1. Bases
            // Main Base
            this.createBox(mainW, baseH, d, mainX, legH + baseH/2, 0, fabricMat);
            // Chaise Base (extends forward)
            const chaiseBaseD = chaiseD;
            const chaiseBaseZ = (chaiseD - d)/2;
            this.createBox(chaiseW, baseH, chaiseBaseD, chaiseX, legH + baseH/2, chaiseBaseZ, fabricMat);

            // 2. Backrests
            // Main Backrest (runs along back wall)
            const backrestMainW = mainW + armW;
            const backrestMainX = isLeft ? mainX + armW/2 : mainX - armW/2;
            this.createBox(backrestMainW, backH, backD, backrestMainX, sh + backH/2, -(d/2 - backD/2), fabricMat);

            // Chaise Backrest (corner backrest along back wall behind chaise)
            this.createBox(chaiseW, backH, backD, chaiseX, sh + backH/2, -(d/2 - backD/2), fabricMat);

            // 3. Armrests
            // Main side armrest
            const mainArmX = isLeft ? armRightX : armLeftX;
            this.createBox(armW, armH, d, mainArmX, armH/2, 0, fabricMat);

            // Chaise side armrest (longer, covers chaise depth)
            const chaiseArmX = isLeft ? armLeftX : armRightX;
            const chaiseArmZ = (chaiseD - d)/2;
            this.createBox(armW, armH, chaiseD, chaiseArmX, armH/2, chaiseArmZ, fabricMat);

            // 4. Cushions
            // Main seat cushions (divide main width into 2 cushions)
            const mainSeatD = d - backD;
            const singleSeatW = (mainW - 0.01) / 2;
            
            for (let i = 0; i < 2; i++) {
                const step = isLeft ? 1 : -1;
                const startX = isLeft ? (mainX - mainW/2 + singleSeatW/2) : (mainX + mainW/2 - singleSeatW/2);
                const xPos = startX + step * i * (singleSeatW + 0.01);
                
                // Seat
                this.createBox(singleSeatW, cushionThick, mainSeatD, xPos, sh - cushionThick/2, backD/2, fabricMat, true);
                // Back
                const backCushH = backH + 0.05;
                const backCushD = 0.12;
                this.createBox(singleSeatW, backCushH, backCushD, xPos, sh + backCushH/2 - 0.02, -(d/2 - backD - backCushD/2 - 0.02), fabricMat, true);
            }

            // Chaise cushion (single large long cushion)
            const chaiseSeatD = chaiseD - backD;
            const chaiseSeatZ = (chaiseSeatD - d + backD)/2 + backD/2;
            this.createBox(chaiseW, cushionThick, chaiseSeatD, chaiseX, sh - cushionThick/2, chaiseSeatZ, fabricMat, true);

            // Chaise Back Cushion
            const chaiseBackCushH = backH + 0.05;
            const chaiseBackCushD = 0.12;
            this.createBox(chaiseW - 0.02, chaiseBackCushH, chaiseBackCushD, chaiseX, sh + chaiseBackCushH/2 - 0.02, -(d/2 - backD - chaiseBackCushD/2 - 0.02), fabricMat, true);

            // 5. Legs (Corner support, 6 legs needed)
            const legR = 0.03;
            const legOffset = 0.08;
            
            // Main section outer corner leg
            this.createCylinder(legR, legH, mainArmX, legH/2, -(d/2 - legOffset), legMat);
            this.createCylinder(legR, legH, mainArmX, legH/2, (d/2 - legOffset), legMat);

            // Chaise outer front corner legs
            this.createCylinder(legR, legH, chaiseArmX, legH/2, -(chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            this.createCylinder(legR, legH, chaiseArmX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            
            // Inner corner leg (where chaise joins main section)
            const innerX = isLeft ? (chaiseX + chaiseW/2 + legOffset) : (chaiseX - chaiseW/2 - legOffset);
            this.createCylinder(legR, legH, innerX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            
            // Back inner corner leg
            this.createCylinder(legR, legH, innerX, legH/2, -(d/2 - legOffset), legMat);
        }
        else if (type === 'u-shape') {
            const chaiseD = params.chaiseDepth / 100;
            const chaiseW = params.chaiseWidth / 100; // Left & Right chaises
            
            // U-Shape is symmetric: a left chaise, a right chaise, and a center main seating section.
            const mainW = w - (2 * chaiseW) - (2 * armW);
            
            // X Coordinates
            const leftChaiseX = -(w/2 - chaiseW/2 - armW);
            const rightChaiseX = (w/2 - chaiseW/2 - armW);
            const mainX = 0;
            
            // Armrest coordinates
            const armLeftX = -(w/2 - armW/2);
            const armRightX = (w/2 - armW/2);

            // Chaise Depth and centers
            const chaiseBaseZ = (chaiseD - d)/2;

            // 1. Bases
            // Center main base
            this.createBox(mainW, baseH, d, mainX, legH + baseH/2, 0, fabricMat);
            // Left Chaise Base
            this.createBox(chaiseW, baseH, chaiseD, leftChaiseX, legH + baseH/2, chaiseBaseZ, fabricMat);
            // Right Chaise Base
            this.createBox(chaiseW, baseH, chaiseD, rightChaiseX, legH + baseH/2, chaiseBaseZ, fabricMat);

            // 2. Backrests
            // Backrest along back wall (continuous)
            const backrestMainW = w - (2 * armW);
            this.createBox(backrestMainW, backH, backD, 0, sh + backH/2, -(d/2 - backD/2), fabricMat);

            // 3. Armrests (Both sides are long armrests extending to chaise depth)
            this.createBox(armW, armH, chaiseD, armLeftX, armH/2, chaiseBaseZ, fabricMat);
            this.createBox(armW, armH, chaiseD, armRightX, armH/2, chaiseBaseZ, fabricMat);

            // 4. Cushions
            // Center seat cushions (usually 1 or 2 depending on size)
            const mainSeatD = d - backD;
            const centerCushCount = mainW > 1.2 ? 2 : 1;
            const singleCenterW = (mainW - 0.01 * (centerCushCount - 1)) / centerCushCount;

            for (let i = 0; i < centerCushCount; i++) {
                const xPos = -(mainW / 2) + (singleCenterW / 2) + i * (singleCenterW + 0.01);
                // Seat
                this.createBox(singleCenterW, cushionThick, mainSeatD, xPos, sh - cushionThick/2, backD/2, fabricMat, true);
                // Back
                const backCushH = backH + 0.05;
                const backCushD = 0.12;
                this.createBox(singleCenterW, backCushH, backCushD, xPos, sh + backCushH/2 - 0.02, -(d/2 - backD - backCushD/2 - 0.02), fabricMat, true);
            }

            // Left & Right Long Chaise Cushions
            const chaiseSeatD = chaiseD - backD;
            const chaiseSeatZ = (chaiseSeatD - d + backD)/2 + backD/2;
            
            // Left seat & back cushions
            this.createBox(chaiseW, cushionThick, chaiseSeatD, leftChaiseX, sh - cushionThick/2, chaiseSeatZ, fabricMat, true);
            this.createBox(chaiseW - 0.02, backH + 0.05, 0.12, leftChaiseX, sh + (backH + 0.05)/2 - 0.02, -(d/2 - backD - 0.06), fabricMat, true);

            // Right seat & back cushions
            this.createBox(chaiseW, cushionThick, chaiseSeatD, rightChaiseX, sh - cushionThick/2, chaiseSeatZ, fabricMat, true);
            this.createBox(chaiseW - 0.02, backH + 0.05, 0.12, rightChaiseX, sh + (backH + 0.05)/2 - 0.02, -(d/2 - backD - 0.06), fabricMat, true);

            // 5. Legs (8 legs for U-shape)
            const legR = 0.03;
            const legOffset = 0.08;
            
            // Outer left corner legs
            this.createCylinder(legR, legH, armLeftX, legH/2, -(chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            this.createCylinder(legR, legH, armLeftX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            
            // Outer right corner legs
            this.createCylinder(legR, legH, armRightX, legH/2, -(chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            this.createCylinder(legR, legH, armRightX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            
            // Inner corner legs (front joints)
            const leftInnerX = leftChaiseX + chaiseW/2 - legOffset;
            const rightInnerX = rightChaiseX - chaiseW/2 + legOffset;
            this.createCylinder(legR, legH, leftInnerX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);
            this.createCylinder(legR, legH, rightInnerX, legH/2, (chaiseD/2 - legOffset) + chaiseBaseZ, legMat);

            // Inner corner legs (back wall joints)
            this.createCylinder(legR, legH, leftInnerX, legH/2, -(d/2 - legOffset), legMat);
            this.createCylinder(legR, legH, rightInnerX, legH/2, -(d/2 - legOffset), legMat);
        }

        // Center camera controls target to center of the sofa
        this.controls.target.set(0, sh/2, 0);
    }

    // Helper to create box meshes with shadows
    createBox(width, height, depth, x, y, z, material, isCushion = false) {
        let geometry;
        if (isCushion) {
            // High segment count box for a softer look
            geometry = new THREE.BoxGeometry(width, height, depth, 4, 2, 4);
        } else {
            geometry = new THREE.BoxGeometry(width, height, depth);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.sofaGroup.add(mesh);
        return mesh;
    }

    // Helper to create cylindrical legs
    createCylinder(radius, height, x, y, z, material) {
        const geometry = new THREE.CylinderGeometry(radius * 0.8, radius, height, 16);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        this.sofaGroup.add(mesh);
        return mesh;
    }

    // Capture snapshot of threejs canvas
    takeScreenshot() {
        // Force a render step
        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }

    // Handle view size changes
    resize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    // Continuous render loop
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
