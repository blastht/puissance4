let player = document.getElementById("player");
let obstaclesContainer = document.getElementById("obstacles");
let bonusesContainer = document.getElementById("bonuses");
let gameOverScreen = document.getElementById("game-over");
let scoreElement = document.getElementById("score");
let finalScoreElement = document.getElementById("final-score");
let coinCountElement = document.getElementById("coin-count");
let road = document.getElementById("road");
let gameArea = document.getElementById("game-area");

// Sons
let soundMove = document.getElementById("sound-move");
let soundCrash = document.getElementById("sound-crash");
let soundBonus = document.getElementById("sound-bonus");

// Variables
let playerPos = 125;
let playing = true;
let speed = 2; // vitesse initiale
let obstacles = [];
let bonuses = [];
let score = 0;
let coinsCollected = 0;
let scoreInterval;
let obstacleIntervalTime = 1500;
let obstacleGenerator;
let bonusGenerator;
let invincible = false;
let invincibleTimeout;

// Mouvement fluide clavier
let movingLeft = false;
let movingRight = false;
const moveSpeed = 5; // px par frame

document.addEventListener("keydown", (e) => {
    if (!playing) return;
    if (e.key === "ArrowLeft") movingLeft = true;
    if (e.key === "ArrowRight") movingRight = true;
});
document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") movingLeft = false;
    if (e.key === "ArrowRight") movingRight = false;
});

// Contrôle mobile – suivi direct du doigt
gameArea.addEventListener("touchmove", (e) => {
    if (!playing) return;
    let touchX = e.touches[0].clientX - gameArea.getBoundingClientRect().left;
    const maxRight = gameArea.offsetWidth - player.offsetWidth;
    playerPos = Math.min(Math.max(touchX - 25, 0), maxRight);
    player.style.left = playerPos + "px";
}, { passive: true });



// Sons
function playMoveSound() {
    soundMove.currentTime = 0;
    soundMove.play().catch(() => {});
}
function playCrashSound() {
    soundCrash.currentTime = 0;
    soundCrash.play().catch(() => {});
}
function playBonusSound() {
    soundBonus.currentTime = 0;
    soundBonus.play().catch(() => {});
}

let lastFreeLanes = []; // historique

function createObstacle() {
    let lanePositions = [0, 125, 250];

    // Voies libres possibles = celles qui ne sont pas trop récentes
    let possibleFreeLanes = lanePositions.filter(pos => !lastFreeLanes.includes(pos));

    // Si toutes les voies sont dans l’historique → on vide l’historique
    if (possibleFreeLanes.length === 0) {
        lastFreeLanes = [];
        possibleFreeLanes = [...lanePositions];
    }

    // Choisir une nouvelle voie libre
    let freeLane = possibleFreeLanes[Math.floor(Math.random() * possibleFreeLanes.length)];

    // Mettre à jour l’historique (max 2 dernières)
    lastFreeLanes.push(freeLane);
    if (lastFreeLanes.length > 2) {
        lastFreeLanes.shift();
    }

    // Placer obstacles sur toutes les autres voies
    lanePositions.forEach(posX => {
        if (posX !== freeLane) {
            let obs = document.createElement("div");
            obs.classList.add("obstacle");
            obs.style.left = posX + "px";
            obs.style.top = "-100px";
            obstaclesContainer.appendChild(obs);
            obstacles.push(obs);
        }
    });
}



// Création bonus
function createBonus() {
    let lanePositions = [0, 125, 250];
    let posX = lanePositions[Math.floor(Math.random() * lanePositions.length)];
    let bonus = document.createElement("div");
    bonus.classList.add("bonus");

    if (Math.random() < 0.6) {
        bonus.classList.add("coin");
    } else {
        bonus.classList.add("shield");
    }

    bonus.style.left = posX + "px";
    bonus.style.top = "-50px";
    bonusesContainer.appendChild(bonus);
    bonuses.push(bonus);
}

// Boucle de jeu principale
function gameLoop() {
    if (!playing) return;

    const maxRight = gameArea.offsetWidth - player.offsetWidth;
    // Mouvement fluide clavier
    if (movingLeft && playerPos > 0) {
        playerPos -= moveSpeed;
    }
    if (movingRight && playerPos < maxRight) {
        playerPos += moveSpeed;
    }
    player.style.left = playerPos + "px";

    // Obstacles
    obstacles.forEach((obs, i) => {
        let top = parseInt(obs.style.top.replace("px", ""));
        if (top > 500) {
            obs.remove();
            obstacles.splice(i, 1);
        } else {
            obs.style.top = (top + speed) + "px";
        }

        let playerRect = player.getBoundingClientRect();
        let obsRect = obs.getBoundingClientRect();
        if (!invincible &&
            playerRect.x < obsRect.x + obsRect.width &&
            playerRect.x + playerRect.width > obsRect.x &&
            playerRect.y < obsRect.y + obsRect.height &&
            playerRect.height + playerRect.y > obsRect.y
        ) {
            playCrashSound();
            endGame();
        }
    });

    // Bonus
    bonuses.forEach((bns, i) => {
        let top = parseInt(bns.style.top.replace("px", ""));
        if (top > 500) {
            bns.remove();
            bonuses.splice(i, 1);
        } else {
            bns.style.top = (top + speed) + "px";
        }

        let playerRect = player.getBoundingClientRect();
        let bnsRect = bns.getBoundingClientRect();
        if (
            playerRect.x < bnsRect.x + bnsRect.width &&
            playerRect.x + playerRect.width > bnsRect.x &&
            playerRect.y < bnsRect.y + bnsRect.height &&
            playerRect.height + playerRect.y > bnsRect.y
        ) {
            playBonusSound();
            if (bns.classList.contains("coin")) {
                score += 10;
                coinsCollected++;
                coinCountElement.textContent = coinsCollected;
                coinCountElement.classList.add("coin-animate");
                setTimeout(() => {
                    coinCountElement.classList.remove("coin-animate");
                }, 300);
            } else if (bns.classList.contains("shield")) {
                activateShield();
            }
            bns.remove();
            bonuses.splice(i, 1);
        }
    });

    scoreElement.textContent = score;
    requestAnimationFrame(gameLoop);
}

// Bouclier
function activateShield() {
    invincible = true;
    player.classList.add("shield-active");
    clearTimeout(invincibleTimeout);
    invincibleTimeout = setTimeout(() => {
        invincible = false;
        player.classList.remove("shield-active");
    }, 5000);
}

// Score
function startScore() {
    scoreInterval = setInterval(() => {
        if (playing) {
            score++;
            scoreElement.textContent = score;
        }
    }, 500);
}

// Difficulté
function increaseDifficulty() {
    if (!playing) return;
    speed += 0.3;
    let currentAnim = parseFloat(getComputedStyle(road).animationDuration);
    road.style.animationDuration = Math.max(0.2, currentAnim - 0.05) + "s";

    if (obstacleIntervalTime > 200) {
        obstacleIntervalTime -= (speed > 7) ? 100 : 50;
        clearInterval(obstacleGenerator);
        obstacleGenerator = setInterval(() => {
            if (playing) createObstacle();
        }, obstacleIntervalTime);
    }
    gameArea.classList.add("flash-effect");
    setTimeout(() => gameArea.classList.remove("flash-effect"), 300);
}

// Fin du jeu
function endGame() {
    playing = false;
    clearInterval(scoreInterval);
    clearInterval(obstacleGenerator);
    clearInterval(bonusGenerator);
    road.style.animationPlayState = "paused";
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = "block";
}

// Restart
function restartGame() {
    obstacles.forEach(o => o.remove());
    bonuses.forEach(b => b.remove());
    obstacles = [];
    bonuses = [];
    playerPos = 125;
    player.style.left = "125px";
    score = 0;
    coinsCollected = 0;
    scoreElement.textContent = "0";
    coinCountElement.textContent = "0";
    playing = true;
    speed = 2;
    obstacleIntervalTime = 1500;
    invincible = false;
    player.classList.remove("shield-active");
    road.style.animationDuration = "0.5s";
    road.style.animationPlayState = "running";
    gameOverScreen.style.display = "none";
    startScore();
    obstacleGenerator = setInterval(() => {
        if (playing) createObstacle();
    }, obstacleIntervalTime);
    bonusGenerator = setInterval(() => {
        if (playing) createBonus();
    }, 5000);
    gameLoop();
}

// Lancement
startScore();
obstacleGenerator = setInterval(() => {
    if (playing) createObstacle();
}, obstacleIntervalTime);
bonusGenerator = setInterval(() => {
    if (playing) createBonus();
}, 5000);
setInterval(increaseDifficulty, 5000);
gameLoop();
