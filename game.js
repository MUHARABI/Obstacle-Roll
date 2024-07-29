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

let targetPosition = { x: 0, z: 0 }; // Target position for gliding
let obstacleSpawnTimeout;
let immunityRingInterval = 15000; // Interval for spawning immunity rings
let immunityRingTimer = 25000; // Timer for immunity ring respawn
let immunityRingSpawnIntervalId, immunityRingRespawnTimeoutId;

const backgroundMusic = document.getElementById('backgroundMusic');

function init() {
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
}

function createPath() {
    const pathGeometry = new THREE.PlaneGeometry(pathWidth, pathLength, 1, 1);
    const pathMaterial = new THREE.MeshBasicMaterial({ color: 0xC2B280, side: THREE.DoubleSide }); // Sand color
    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.y = 0;
    scene.add(pathMesh);

    const borderMaterial = new THREE.MeshBasicMaterial({ color: 0xD3D3D3 });

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
    boulderSpawnIntervalId = setInterval(() => {
        if (!isGameOver && gameStarted) {
            createBoulder();
        }
    }, 30000); // Spawn boulder every 30 seconds
}
function createBoulder() {
    const boulderGeometry = new THREE.SphereGeometry(obstacleSize * 2, 32, 32);
    const boulderMaterial = new THREE.MeshBasicMaterial({ color: 0x808080 });
    const boulder = new THREE.Mesh(boulderGeometry, boulderMaterial);

    boulder.position.set(Math.random() * pathWidth - pathWidth / 2, obstacleSize+(obstacleSize/2), -pathLength / 2);
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


function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    isGameOver = false;
    gameStarted = true;
    score = 0;
    immunityEndTime = 0;
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    clearInterval(immunityRingSpawnIntervalId); // Stop existing immunity ring spawning
    goldenCircles.forEach(circle => scene.remove(circle));
    goldenCircles = [];
    createObstacles(); // Create initial obstacles after delay

    // Delay obstacle creation for 3 seconds
    setTimeout(() => {
        obstacleSpawnTimeout = setInterval(createObstacle, 1000); // Create obstacles every second
    }, 3000);
    backgroundMusic.play();
    // Reset immunity ring spawning
    clearInterval(immunityRingSpawnIntervalId);
    startImmunityRingSpawning();
    clearInterval(boulderSpawnIntervalId); // Clear any existing interval
    startBoulderSpawning();
    updateScore();
    updateImmunityTime(); // Initialize immunity time display
    animate();
}

function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    clearInterval(obstacleSpawnTimeout); // Stop obstacle spawning
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    clearInterval(immunityRingSpawnIntervalId); // Stop existing immunity ring spawning
    goldenCircles.forEach(circle => scene.remove(circle));
    goldenCircles = [];
    clearInterval(boulderSpawnIntervalId); // Stop boulder spawning
    boulders.forEach(boulder => scene.remove(boulder));
    boulders = [];
    backgroundMusic.pause(); 
    backgroundMusic.currentTime = 0;
    startGame();
}

function updateScore() {
    document.getElementById('score').innerText = `Score: ${Math.floor(score)} | Record: ${record}`;
}

function updateImmunityTime() {
    if (immunityEndTime > 0) {
        const remainingTime = Math.max(0, Math.ceil((immunityEndTime - Date.now()) / 1000));
        document.getElementById('immunityTime').innerText = `Immunity: ${remainingTime}s`;
    } else {
        document.getElementById('immunityTime').innerText = '';
    }
}

let lastTime = 0;
const baseSpeed = 0.1; // Adjust this base speed as necessary

function animate() {
    if (!gameStarted) return;
    if (isGameOver) return;

    requestAnimationFrame(animate);

    const now = Date.now();
    const delta = now - lastTime;
    lastTime = now;
    const fps = 1000 / delta;

    const adjustedSpeed = baseSpeed * (fps / 60); // Adjust speed based on frame rate

    // Smoothly interpolate ball position towards the target position
    ball.position.x += (targetPosition.x - ball.position.x) * glideSpeed;
    ball.position.z += (targetPosition.z - ball.position.z) * glideSpeed;
    ball.position.y = ballRadius; // Ensure ball stays on the path

    // Prevent ball from going past the borders
    ball.position.x = Math.max(-pathWidth / 2 + ballRadius, Math.min(pathWidth / 2 - ballRadius, ball.position.x));

    // Move obstacles and golden circles
    obstacles.forEach(obstacle => {
        obstacle.position.z += adjustedSpeed; // Increase movement speed based on adjusted speed
        if (obstacle.position.z > pathLength / 2) {
            obstacle.position.z = -pathLength / 2;
            obstacle.position.x = Math.random() * pathWidth - pathWidth / 2;
        }
    });

    goldenCircles.forEach(circle => {
        circle.position.z += adjustedSpeed; // Increase movement speed based on adjusted speed
        if (circle.position.z > pathLength / 2) {
            circle.position.z = -pathLength / 2;
            circle.position.x = Math.random() * pathWidth - pathWidth / 2;
        }
    });

    boulders.forEach(boulder => {
        boulder.position.z += adjustedSpeed * 2; // Boulders move faster than regular obstacles
        if (boulder.position.z > pathLength / 2) {
            scene.remove(boulder);
            boulders = boulders.filter(b => b !== boulder);
        }
    });

    checkCollisions();
    score += 0.1;
    updateScore();
    updateImmunityTime(); // Update immunity time display

    // Update camera position to follow the ball
    camera.position.x = ball.position.x;

    renderer.render(scene, camera);

    // Gradually increase ball speed over time
    ballSpeed += speedIncrement/2;
}

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
}
init();
