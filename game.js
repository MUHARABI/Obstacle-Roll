let scene, camera, renderer, ball, obstacles = [], goldenCircles = [];
let score = 0, record = 0, immunityEndTime = 0;
let ballColor = 'red';
const ballRadius = 0.5, obstacleSize = 1.5, goldenCircleRadius = 1;
let isGameOver = false, gameStarted = false;
const pathLength = 150;
const pathWidth = 12; // Set the path width
let touchStartX, touchStartY;
const swipeSensitivity = 0.5; // Sensitivity for swipe detection
const moveSpeed = 1; // Increased speed for faster movement
const glideSpeed = 0.1; // Increased glide speed for quicker response
let ballSpeed = 0.1; // Initial speed
const speedIncrement = 0.0001;
let boulders = [];
let boulderSpawnIntervalId;
let blinkStartTime = 0;
const blinkDuration = 3000; // 3 seconds
const blinkInterval = 250; // Interval between color changes
let blinkTimeoutId;

let targetPosition = { x: 0, z: 0 }; // Target position for gliding
let obstacleSpawnTimeout;
let immunityRingInterval = 15000; // Interval for spawning immunity rings
let immunityRingTimer = 25000; // Timer for immunity ring respawn
let immunityRingSpawnIntervalId, immunityRingRespawnTimeoutId;

const backgroundMusic = document.getElementById('backgroundMusic');
const ringSound = document.getElementById('ringSound');
const ghostMusic = document.getElementById('GhostMusic');
const fallingSound = document.getElementById('fallingSound');
let gameSpeed = 'medium'; // Default speed setting
let selectedCourse = 'standard'; // Default course
let holeSpawnIntervalId;
let holes = [];
let stars = [];

function showCourseSelection() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('courseSelectionScreen').style.display = 'block';
}

function selectCourse(course) {
    selectedCourse = course;

    // Clear ghost-related intervals and remove existing ghosts
    if (selectedCourse === 'standard') {
        removeAllGhostObstacles();
        clearInterval(holeSpawnIntervalId); // Stop ghost hole spawning
        holes.forEach(hole => scene.remove(hole)); // Remove existing holes
        holes = [];
        obstacles = [];
        clearInterval(boulderSpawnIntervalId); // Stop boulder spawning
        boulders.forEach(boulder => scene.remove(boulder)); // Remove boulders
        boulders = [];
        createBackgroundMountainsAndVolcanoes();
         
    } else if (selectedCourse === 'ghost') {
        removeBackgroundMountainsAndVolcanoes();
        clearInterval(obstacleSpawnTimeout); // Stop standard obstacle spawning
        obstacles.forEach(obstacle => scene.remove(obstacle)); // Remove existing standard obstacles
        obstacles = [];
        clearInterval(boulderSpawnIntervalId); // Stop boulder spawning
        boulders.forEach(boulder => scene.remove(boulder)); // Remove boulders
        clearInterval(immunityRingSpawnIntervalId); // Stop immunity ring spawning
        goldenCircles.forEach(circle => scene.remove(circle)); // Remove existing golden circles
        goldenCircles = [];
        removeStars(); // Remove existing stars if present
    }

    // Handle music playback based on selected course
    if (course === 'standard') {
        ghostMusic.pause(); // Stop ghost music if playing
        ghostMusic.currentTime = 0; // Reset the ghost music
        backgroundMusic.play(); // Play standard course music
    } else if (course === 'ghost') {
        backgroundMusic.pause(); // Stop standard music if playing
        backgroundMusic.currentTime = 0; // Reset the standard music
        ghostMusic.play(); // Play ghost course music
    }

    document.getElementById('courseSelectionScreen').style.display = 'none';
    startGame(); // Start the game with the selected course
}



function backToStart() {
    document.getElementById('courseSelectionScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

function showSettings() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('settingsScreen').style.display = 'block';

    // Highlight the selected speed button
    document.getElementById('slowButton').classList.toggle('selected', gameSpeed === 'slow');
    document.getElementById('mediumButton').classList.toggle('selected', gameSpeed === 'medium');
    document.getElementById('fastButton').classList.toggle('selected', gameSpeed === 'fast');
}
function selectSpeed(speed) {
    gameSpeed = speed;
    localStorage.setItem('gameSpeed', speed); // Save to localStorage
    showSettings(); // Stay on settings screen to confirm selection
}

function backToMenu() {
    document.getElementById('settingsScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}


function init() {
    const savedSpeed = localStorage.getItem('gameSpeed');
    if (savedSpeed) gameSpeed = savedSpeed;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 2;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.setClearColor(0x87CEEB, 1);

    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: ballColor });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.y = ballRadius;
    scene.add(ball);

    createPath();
    startImmunityRingSpawning();
    startBoulderSpawning();

    window.addEventListener('keydown', handleControls);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    document.getElementById('startScreen').style.display = 'block';

    // Ensure the renderer updates its size on window resize
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
}
let backgroundGroup; // Declare a variable to hold the reference to the background group

function createBackgroundMountainsAndVolcanoes() {
    if(selectedCourse === "ghost") return;
    // Create a group to hold all mountains and volcanoes
    backgroundGroup = new THREE.Group();
    backgroundGroup.name = 'backgroundGroup'; // Set a name for easy reference

    // Function to create a trapezoid shape with optional name
    function createTrapezoid(widthTop, widthBottom, height, color, name = '') {
        const shape = new THREE.Shape();
        shape.moveTo(-widthBottom / 2, 0);
        shape.lineTo(widthBottom / 2, 0);
        shape.lineTo(widthTop / 2, height);
        shape.lineTo(-widthTop / 2, height);
        shape.lineTo(-widthBottom / 2, 0);
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name; // Set the name for identification
        return mesh;
    }

    // Taller mountains
    const mountain1 = createTrapezoid(180, 600, 800, 0x808080, 'mountain1'); // Added name
    mountain1.position.set(-500, -500, -400); // Adjusted to maintain proportion
    backgroundGroup.add(mountain1);

    const mountain2 = createTrapezoid(180, 600, 800, 0x808080, 'mountain2'); // Added name
    mountain2.position.set(500, -500, -400); // Adjusted to maintain proportion
    backgroundGroup.add(mountain2);

    // Volcano with adjusted red top
    const volcano = createTrapezoid(240, 480, 400, 0x808080, 'volcano'); // Added name
    volcano.position.set(0, -250, -300); // Positioned directly in front of the path

    // Red trapezoid at the top, with ends perfectly aligned with the gray part
    const redTrapezoid = createTrapezoid(240, 240, 20, 0xFF0000, 'redTrapezoid'); // Added name
    redTrapezoid.position.set(0, 400, 0.1); // Positioned at the top of the volcano, aligns perfectly
    volcano.add(redTrapezoid); // Attach the red trapezoid to the volcano

    backgroundGroup.add(volcano);

    // Add the background group to the scene
    scene.add(backgroundGroup);
}

function removeBackgroundMountainsAndVolcanoes() {
    const group = scene.getObjectByName('backgroundGroup');
    if (group) {
        scene.remove(group);
        // Optionally, dispose of all objects in the group
        group.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        });
    }
}

function createPath() {
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength, 1, 1);
    const pathMaterial = new THREE.MeshBasicMaterial({ color: 0xC2B280, side: THREE.DoubleSide }); // Sand color
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.y = 0;
    scene.add(pathMesh);

    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xF0F5A8 });

    // Left border
    const leftBorderGeometry = new THREE.BoxGeometry(0.1, 1, pathLength);
    const leftBorder = new THREE.Mesh(leftBorderGeometry, borderMaterial);
    leftBorder.position.set(-pathWidth / 2, 0.5, 0);
    scene.add(leftBorder);

    // Right border
    const rightBorderGeometry = new THREE.BoxGeometry(0.1, 1, pathLength);
    const rightBorder = new THREE.Mesh(rightBorderGeometry, borderMaterial);
    rightBorder.position.set(pathWidth / 2, 0.5, 0);
    scene.add(rightBorder);


    
}



function createObstacles() {
    for (let i = 0; i < 10; i++) {
        createObstacle();
    }
}

function createObstacle() {
    if (selectedCourse === 'ghost') return; // Prevent creation of standard obstacles in ghost course

    const geometry = new THREE.BoxGeometry(obstacleSize, obstacleSize, obstacleSize);
    const material = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const obstacle = new THREE.Mesh(geometry, material);

    let spawnPosition;
    do {
        spawnPosition = {
            x: Math.random() * pathWidth - pathWidth / 2,
            z: -Math.random() * pathLength
        };
    } while (Math.abs(spawnPosition.z) < 10); // Ensure the obstacle spawns at least 10 units away from the player

    obstacle.position.set(spawnPosition.x, obstacleSize / 2, spawnPosition.z);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function startImmunityRingSpawning() {
    immunityRingSpawnIntervalId = setInterval(() => {
        if (!isGameOver && gameStarted) {
            createGoldenCircle();
        }
    }, immunityRingInterval);
}

function startBoulderSpawning() {
    if (selectedCourse === 'standard') { // Check if the course is standard
        boulderSpawnIntervalId = setInterval(() => {
            if (!isGameOver && gameStarted) {
                createBoulder();
            }
        }, 30000); // Spawn boulder every 30 seconds
    } else {
        // Clear existing boulder spawn interval if in ghost course
        clearInterval(boulderSpawnIntervalId);
    }
}
function createBoulder() {
    const boulderGeometry = new THREE.SphereGeometry(obstacleSize * 2, 32, 32);
    const boulderMaterial = new THREE.MeshBasicMaterial({ color: 0xD3D3D3 });
    const boulder = new THREE.Mesh(boulderGeometry, boulderMaterial);

    boulder.position.set(Math.random() * pathWidth - pathWidth / 2, obstacleSize+(obstacleSize/2)+0.7, -pathLength / 2);
    scene.add(boulder);
    boulders.push(boulder);
    
}
function createGoldenCircle() {
    const geometry = new THREE.TorusGeometry(goldenCircleRadius, goldenCircleRadius * 0.1, 16, 100);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const goldenCircle = new THREE.Mesh(geometry, material);
    goldenCircle.rotation.x = Math.PI; // Rotate to stand vertically
    goldenCircle.position.set(Math.random() * pathWidth - pathWidth / 2, goldenCircleRadius * 1.5, -Math.random() * pathLength); // Position so ball can roll through
    scene.add(goldenCircle);
    goldenCircles.push(goldenCircle);
}

function handleControls(event) {
    if (isGameOver) return;

    switch(event.key) {
        case 'a':
        case 'ArrowLeft': targetPosition.x -= moveSpeed; break;
        case 'd':
        case 'ArrowRight': targetPosition.x += moveSpeed; break;
    }
}

function handleTouchStart(event) {
    if (isGameOver) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
    if (isGameOver) return;
    const touch = event.changedTouches[0];
    const touchEndX = touch.clientX;
    const screenWidth = window.innerWidth;

    if (touchEndX < screenWidth / 2) targetPosition.x -= moveSpeed; // Tap left
    if (touchEndX > screenWidth / 2) targetPosition.x += moveSpeed; // Tap right
}
function createHole() {
    const holeRadius = pathWidth / 4; // Set the hole radius to be smaller
    const holeGeometry = new THREE.CircleGeometry(holeRadius, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000080, side: THREE.DoubleSide }); // Set color to navy blue
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.1, -pathLength / 2); // Position the hole slightly higher on the y-axis
    scene.add(hole);
    
    return hole;
    
}





function startHoleSpawning() {
    holeSpawnIntervalId = setInterval(() => {
        if (!isGameOver && gameStarted && selectedCourse === 'ghost') {
            const hole = createHole();
            holes.push(hole);
        }
    }, 30000); // Spawn a hole every 30 seconds
}

function startGame() {
    document.getElementById('courseSelectionScreen').style.display = 'none';
    document.getElementById('rulesScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    isGameOver = false;
    gameStarted = true;
    score = 0;
    immunityEndTime = 0;
    
    // Clear existing elements
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    goldenCircles.forEach(circle => scene.remove(circle));
    goldenCircles = [];
    boulders.forEach(boulder => scene.remove(boulder));
    boulders = [];
    holes.forEach(hole => scene.remove(hole));
    holes = [];
    removeStars(); // Remove existing stars

    if (selectedCourse === 'ghost') {
        startHoleSpawning(); // Start spawning holes
        createStars(); // Add stars for ghost course
    }
    
    // Restart background music
    if (selectedCourse === 'standard') {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        backgroundMusic.play();
        renderer.setClearColor(0xFFC280, 1); // Set background to blue
        createObstacles(); // Standard course obstacles
    } else if (selectedCourse === 'ghost') {
        ghostMusic.pause();
        ghostMusic.currentTime = 0;
        ghostMusic.play();
        renderer.setClearColor(0x000000, 1); // Set background to black
        createGhostCourse(); // Create ghost course obstacles
    }

    // Delay obstacle creation for 3 seconds if not in ghost course
    if (selectedCourse !== 'ghost') {
        setTimeout(() => {
            obstacleSpawnTimeout = setInterval(createObstacle, 1000);
        }, 3000);
    }

    // Apply selected speed setting
    switch (gameSpeed) {
        case 'slow': ballSpeed = 0.1; break;
        case 'medium': ballSpeed = 0.2; break;
        case 'fast': ballSpeed = 0.3; break;
    }

    // Reset immunity ring spawning
    
    clearInterval(immunityRingSpawnIntervalId);
    startImmunityRingSpawning();
    clearInterval(boulderSpawnIntervalId);
    startBoulderSpawning();
    updateScore();
    updateImmunityTime(); // Initialize immunity time display

    // Ensure the ball is visible at the start
    ball.visible = true;
    
    
    animate();
}


function createGhostCourse() {
    // Set background to navy blue
    renderer.setClearColor(0x000080, 1);

    // Remove existing obstacles and golden circles
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    goldenCircles.forEach(circle => scene.remove(circle));
    goldenCircles = [];

    // Create ghost course obstacles
    for (let i = 0; i < 10; i++) {
        createGhostObstacle();
    }

    // Delay ghost obstacle creation for 3 seconds
    setTimeout(() => {
        obstacleSpawnTimeout = setInterval(createGhostObstacle, 2000); // Create ghost obstacles every second
    }, 5000);

    // Add stars to the background
    createStars();
}

function createStars() {
    const starGeometry = new THREE.SphereGeometry(0.1, 24, 24);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < 500; i++) {
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(
            (Math.random() - 0.5) * 200,
            Math.random() * 100,
            -Math.random() * 300
        );
        scene.add(star);
        stars.push(star);
    }
}
function removeStars() {
    stars.forEach(star => scene.remove(star));
    stars = []; // Clear the stars array
}



 // Global array to keep track of all obstacles

 let canSpawnGhosts = true; // Flag to control ghost spawning

 function createGhostObstacle() {
    if (selectedCourse === 'standard') return;
     if (!canSpawnGhosts) return; // Prevent spawning if not allowed
 
     const geometry = new THREE.SphereGeometry(obstacleSize / 1.5, 32, 32);
     const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
     const obstacle = new THREE.Mesh(geometry, material);
 
     let spawnPosition;
     const minDistance = 10; // Minimum distance from the player
     do {
         spawnPosition = {
             x: Math.random() * pathWidth - pathWidth / 2,
             z: -Math.random() * pathLength
         };
     } while (Math.abs(spawnPosition.z) < minDistance); // Ensure the obstacle spawns at least minDistance away from the player
 
     obstacle.position.set(spawnPosition.x, obstacleSize / 1, spawnPosition.z);
     
     // Create eyes for the ghost
     const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16); // Larger spheres for eyes
     const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Dark black color for eyes
 
     // Left eye
     const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
     leftEye.position.set(-0.3, 0.4, 0.6); // Adjust position relative to the obstacle
 
     // Right eye
     const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
     rightEye.position.set(0.3, 0.4, 0.6); // Adjust position relative to the obstacle
 
     // Create Mouth
     const mouthGeometry = new THREE.SphereGeometry(0.2, 16, 16);
     const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
     const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
     mouth.position.set(0, -0.4, 0.6);
 
     // Add eyes and mouth to the obstacle
     obstacle.add(leftEye);
     obstacle.add(rightEye);
     obstacle.add(mouth);
 
     scene.add(obstacle);
     obstacles.push(obstacle); // Add the obstacle to the global array
 }
 
 function removeAllGhostObstacles() {
     canSpawnGhosts = false; // Prevent spawning new ghosts during removal
 
     // Remove each obstacle from the scene
     obstacles.forEach(obstacle => {
         scene.remove(obstacle);
         // Optionally, dispose of the geometry and material
         obstacle.traverse(object => {
             if (object.geometry) object.geometry.dispose();
             if (object.material) object.material.dispose();
         });
     });
     // Clear the array after removal
     obstacles.length = 0;
 
     // Optionally, reset flag to allow spawning ghosts again
     canSpawnGhosts = true;
 }
 




function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    clearInterval(obstacleSpawnTimeout); // Stop obstacle spawning
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    goldenCircles.forEach(circle => scene.remove(circle));
    goldenCircles = [];
    clearInterval(immunityRingSpawnIntervalId); // Stop existing immunity ring spawning
    clearInterval(boulderSpawnIntervalId); // Stop boulder spawning
    boulders.forEach(boulder => scene.remove(boulder));
    boulders = [];
    holes.forEach(hole => scene.remove(hole)); // Remove old holes
    holes = [];

    if (selectedCourse === 'standard') {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    } else if (selectedCourse === 'ghost') {
        ghostMusic.pause();
        ghostMusic.currentTime = 0;
    }
    
    // Reset game variables
    score = 0;
    ballSpeed = 0.1; // Reset ball speed to initial value
    immunityEndTime = 0;
    isGameOver = false;
    gameStarted = false;
    
    // Ensure the ball is visible
    ball.visible = true;

    // Restart the game
    startGame();
}
function showRules() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('rulesScreen').style.display = 'block';
}

function hideRules() {
    document.getElementById('rulesScreen').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

function updateScore() {
    document.getElementById('score').innerText = `Score: ${Math.floor(score)} | Record: ${record}`
}

function updateImmunityTime() {
    if (immunityEndTime > 0) {
        const remainingTime = Math.max(0, Math.ceil((immunityEndTime - Date.now()) / 1000));
        document.getElementById('immunityTime').innerText = `Immunity: ${remainingTime}s`;
    } else {
        document.getElementById('immunityTime').innerText = '';
    }
}

function animate() {
    if (!gameStarted || isGameOver) return;

    requestAnimationFrame(animate);

    // Smoothly interpolate ball position towards the target position
    ball.position.x += (targetPosition.x - ball.position.x) * glideSpeed;
    ball.position.z += (targetPosition.z - ball.position.z) * glideSpeed;
    ball.position.y = ballRadius; // Ensure ball stays on the path

    // Prevent ball from going past the borders
    ball.position.x = Math.max(-pathWidth / 2 + ballRadius, Math.min(pathWidth / 2 - ballRadius, ball.position.x));

    // Move obstacles and golden circles
    obstacles.forEach(obstacle => {
        obstacle.position.z += ballSpeed; // Increase movement speed based on ball speed
        if (obstacle.position.z > pathLength / 2) {
            obstacle.position.z = -pathLength / 2;
            obstacle.position.x = Math.random() * pathWidth - pathWidth / 2;
        }
    });

    goldenCircles.forEach(circle => {
        circle.position.z += ballSpeed; // Increase movement speed based on ball speed
        if (circle.position.z > pathLength / 2) {
            circle.position.z = -pathLength / 2;
            circle.position.x = Math.random() * pathWidth - pathWidth / 2;
        }
    });

    boulders.forEach(boulder => {
        boulder.position.z += ballSpeed * 2; // Boulders move faster than regular obstacles
        if (boulder.position.z > pathLength / 2) {
            scene.remove(boulder);
            boulders = boulders.filter(b => b !== boulder);
        }
    });

    // Move holes backward
    holes.forEach(hole => {
        hole.position.z += ballSpeed; // Move the hole backward
        if (hole.position.z > pathLength / 2) {
            scene.remove(hole);
            holes = holes.filter(h => h !== hole);
        }
    });

    checkCollisions();
    score += 0.1;
    updateScore();
    updateImmunityTime(); // Update immunity time display
    updateBallColor(); // Update ball color based on immunity status

    // Update camera position to follow the ball
    camera.position.x = ball.position.x;

    renderer.render(scene, camera);

    // Gradually increase ball speed over time
    ballSpeed += speedIncrement/2;
}


function updateBallColor() {
    if (Date.now() < immunityEndTime) {
        const remainingTime = immunityEndTime - Date.now();
        if (remainingTime <= blinkDuration) {
            // Blinking effect
            if (!blinkTimeoutId) {
                blinkStartTime = Date.now();
                blinkTimeoutId = setInterval(() => {
                    const elapsedTime = Date.now() - blinkStartTime;
                    if (elapsedTime >= blinkDuration) {
                        clearInterval(blinkTimeoutId);
                        blinkTimeoutId = null;
                        ball.material.color.set('#ff0000'); // Set to light green after blinking ends
                    } else {
                        // Toggle between light green and red
                        const isGreen = Math.floor(elapsedTime / blinkInterval) % 2 === 0;
                        ball.material.color.set(isGreen ? '#08ef2b' : '#ff0000'); // Light green and red
                    }
                }, blinkInterval);
            }
        } else {
            ball.material.color.set('#08ef2b'); // Set to light green if not blinking
        }
    } else {
        ball.material.color.set('#ff0000'); // Reset ball color
        if (blinkTimeoutId) {
            clearInterval(blinkTimeoutId);
            blinkTimeoutId = null;
        }
    }
}

let endGameTimeoutId; // Add this variable to store the timeout ID

function checkCollisions() {
    const ballBox = new THREE.Box3().setFromObject(ball);

    obstacles.forEach(obstacle => {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (ballBox.intersectsBox(obstacleBox)) {
            if (Date.now() < immunityEndTime) {
                scene.remove(obstacle);
                obstacles = obstacles.filter(o => o !== obstacle);
            } else {
                endGame();
            }
        }
    });

    goldenCircles.forEach(circle => {
        const circleBox = new THREE.Box3().setFromObject(circle);
        if (ballBox.intersectsBox(circleBox)) {
            ringSound.play();
            scene.remove(circle);
            goldenCircles = goldenCircles.filter(c => c !== circle);
            immunityEndTime = Date.now() + 10000; // Set immunity time to 10 seconds
        }
    });

    boulders.forEach(boulder => {
        const boulderBox = new THREE.Box3().setFromObject(boulder);
        if (ballBox.intersectsBox(boulderBox)) {
            endGame();
        }
    });

    if (selectedCourse === 'ghost') {
        holes.forEach(hole => {
            const holeBox = new THREE.Box3().setFromObject(hole);
            if (ballBox.intersectsBox(holeBox)) {
                fallingSound.play();
                ball.visible = false; // Hide the ball
                // Set a timeout to delay the end game screen
                if (endGameTimeoutId) {
                    clearTimeout(endGameTimeoutId); // Clear any existing timeout
                }
                endGameTimeoutId = setTimeout(endGame, 100); // Delay by 1 second
            }
        });
    }

    updateBallColor(); // Update ball color based on immunity status
}


function showMenu() {
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('rulesScreen').style.display = 'none'; // Hide rules screen if visible
    document.getElementById('startScreen').style.display = 'block'; // Show the main menu
}


function endGame() {
    isGameOver = true;
    gameStarted = false;
    if (score > record) record = Math.floor(score);
    document.getElementById('finalScore').innerText = Math.floor(score); // Set final score
    document.getElementById('gameOverScreen').style.display = 'block';
    clearInterval(obstacleSpawnTimeout); // Stop obstacle spawning
    clearInterval(immunityRingSpawnIntervalId); // Stop immunity ring spawning
    clearInterval(boulderSpawnIntervalId); // Stop boulder spawning
    // Clear any existing timeout
    if (endGameTimeoutId) {
        clearTimeout(endGameTimeoutId);
        endGameTimeoutId = null;
    }
}


init();
