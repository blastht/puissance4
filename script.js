(() => {
    const COLS = 7, ROWS = 6;
    const boardEl = document.getElementById('board');
    const headsEl = document.getElementById('colHeads');
    const statusEl = document.getElementById('status');
    const scoreEl1 = document.getElementById('s1');
    const scoreEl2 = document.getElementById('s2');

    let theme = (localStorage.getItem('p4-theme') || 'dark');
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');

    let grid, current, over, moves, redoStack, scores = { 1: 0, 2: 0 };

    const modePvp = document.getElementById('mode-pvp');
    const modeAi = document.getElementById('mode-ai');
    const diffEasy = document.getElementById('ai-easy');
    const diffHard = document.getElementById('ai-hard');
    const startP1 = document.getElementById('start-p1');
    const startP2 = document.getElementById('start-p2');

    // Permet de changer qui commence AVANT le lancement
[startP1, startP2].forEach(btn => {
    btn.addEventListener('change', () => {
        current = startP1.checked ? 1 : 2;
        updateStatus();
    });
});

    function newGame(resetScore = false) {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        over = false; moves = []; redoStack = [];
        boardEl.style.setProperty('--cols', COLS);
        boardEl.style.setProperty('--rows', ROWS);
        boardEl.innerHTML = '';
        headsEl.innerHTML = '';

        // Construire plateau
        for (let c = 0; c < COLS; c++) {
            const h = document.createElement('div');
            h.className = 'head';
            headsEl.appendChild(h);
        }
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('role', 'gridcell');
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('mouseenter', () => highlightColumn(c, true));
                cell.addEventListener('mouseleave', () => highlightColumn(c, false));
                cell.addEventListener('click', () => handleTurn(c));
                boardEl.appendChild(cell);
            }
        }

        // Qui commence ?
        if (modeAi.checked) {
            if (startP2.checked) {
                // IA = Joueur 1 → joue direct
                current = 1;
                updateStatus();
                setTimeout(() => aiPlay(), 400);
            } else {
                // Toi = Joueur 1
                current = 1;
                updateStatus();
            }
        } else {
            // Mode JvsJ classique
            current = startP1.checked ? 1 : 2;
            updateStatus();
        }

        clearWinning();
        if (resetScore) { scores = { 1: 0, 2: 0 }; updateScore(); }
    }

    function getCell(r, c) { return boardEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }
    function highlightColumn(c, on) { headsEl.children[c].style.opacity = on ? .9 : .4; }

    function iaPlayer() {
    // Si startP2 est coché, IA = J1
    // Sinon IA = J2
    return startP2.checked ? 1 : 2;
}
 
    function firstEmptyRow(c) {
        for (let r = ROWS - 1; r >= 0; r--) if (grid[r][c] === 0) return r;
        return -1;
    }

    function handleTurn(c) {
        if (over) return;

        const r = firstEmptyRow(c);
        if (r < 0) return bumpColumn(c);

        dropToken(r, c, current);
        grid[r][c] = current;
        moves.push({ r, c, player: current });
        redoStack.length = 0;

        const win = checkWin(r, c, current);
        if (win) {
            celebrate(win);
            scores[current]++;
            updateScore();
            statusEl.textContent = `Victoire du Joueur ${current} ${current === 1 ? '🔴' : '🟡'} !`;
            over = true;
            sound('win');
            return;
        }

        if (isDraw()) {
            statusEl.textContent = 'Match nul. GG à vous deux.';
            over = true;
            sound('drop');
            return;
        }

        // Changement de joueur
        current = 3 - current;
        updateStatus();

        // Mode IA
        if (modeAi.checked) {
            const iaIsP1 = startP2.checked; // si startP2 coché → IA est J1
            const iaPlayerNum = iaIsP1 ? 1 : 2;
            if (current === iaPlayerNum) {
                setTimeout(() => aiPlay(), 320);
            }
        }
    }

    function updateStatus() {
    if (modeAi.checked) {
        const iaNum = iaPlayer();
        if (current === iaNum) {
            statusEl.textContent = (moves.length === 0)
                ? "L'IA commence… 🤖"
                : "L'IA réfléchit… 🤖";
        } else {
            statusEl.textContent = current === 1
                ? "À toi de jouer, Joueur 1 🔴"
                : "À toi de jouer, Joueur 2 🟡";
        }
    } else {
        // Mode JvsJ
        statusEl.textContent = current === 1
            ? "À toi de jouer, Joueur 1 🔴"
            : "À toi de jouer, Joueur 2 🟡";
    }
}


    function updateScore() { scoreEl1.textContent = scores[1]; scoreEl2.textContent = scores[2]; }

    function bumpColumn(c) {
        const cells = Array.from(boardEl.querySelectorAll(`.cell[data-c="${c}"]`));
        cells.forEach(el => el.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }],
            { duration: 160, easing: 'ease-out' }
        ));
        sound('bump');
    }

    function dropToken(r, c, player) {
        const cell = getCell(r, c);
        const token = document.createElement('div');
        token.className = `token p${player} drop`;
        const cs = getComputedStyle(boardEl);
        const distance = (r + 1) * (parseFloat(cs.getPropertyValue('--cell')) + parseFloat(cs.getPropertyValue('--gap')));
        token.style.transform = `translateY(-${distance}px)`;
        cell.appendChild(token);
        requestAnimationFrame(() => { token.style.transform = 'translateY(0)'; });
        sound('drop');
    }

    function removeToken(r, c) {
        const cell = getCell(r, c);
        const token = cell.querySelector('.token');
        if (token) token.remove();
    }

    function markWinning(winCells) { winCells.forEach(({ r, c }) => getCell(r, c).classList.add('win')); }
    function clearWinning() { boardEl.querySelectorAll('.cell.win').forEach(el => el.classList.remove('win')); }
    function isDraw() { for (let c = 0; c < COLS; c++) if (grid[0][c] === 0) return false; return true; }
    function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

    function checkWin(r, c, player) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
            let count = 1; const cells = [{ r, c }];
            let rr = r + dr, cc = c + dc;
            while (inBounds(rr, cc) && grid[rr][cc] === player) { cells.push({ r: rr, c: cc }); count++; rr += dr; cc += dc; }
            rr = r - dr; cc = c - dc;
            while (inBounds(rr, cc) && grid[rr][cc] === player) { cells.unshift({ r: rr, c: cc }); count++; rr -= dr; cc -= dc; }
            if (count >= 4) { markWinning(cells.slice(0, 4)); return cells.slice(0, 4); }
        }
        return null;
    }

    // --- Undo / Redo
    function undo() {
        if (!moves.length || (over && !modeAi.checked)) return;
        if (over) { over = false; clearWinning(); }
        if (modeAi.checked) { const steps = moves.length >= 2 ? 2 : 1; for (let i = 0; i < steps; i++) popMove(); }
        else popMove();
        updateStatus();
    }
    function popMove() {
        const last = moves.pop(); if (!last) return;
        const { r, c, player } = last;
        grid[r][c] = 0; removeToken(r, c); redoStack.push(last); current = player; sound('bump');
    }
    function redo() {
        if (!redoStack.length || over) return;
        const step = modeAi.checked ? Math.min(2, redoStack.length) : 1;
        for (let i = 0; i < step; i++) {
            const mv = redoStack.pop(); if (!mv) return;
            placeWithoutAnim(mv); moves.push(mv); current = 3 - mv.player;
        }
        updateStatus();
    }
    function placeWithoutAnim({ r, c, player }) {
        grid[r][c] = player; const cell = getCell(r, c);
        const token = document.createElement('div'); token.className = `token p${player}`; cell.appendChild(token);
    }

    // --- IA
    function aiPlay() {
        if (over) return;
        const depth = diffHard.checked ? 6 : 4;
        const { col } = minimax(grid, depth, -Infinity, Infinity, true);
        if (col == null) {
            const valid = validColumns(grid);
            const pick = valid[Math.floor(Math.random() * valid.length)];
            handleTurn(pick);
        } else handleTurn(col);
    }
    function validColumns(g) { return [...Array(COLS).keys()].filter(c => g[0][c] === 0); }
    function simulateDrop(g, col, player) {
        let r = -1; for (let i = ROWS - 1; i >= 0; i--) if (g[i][col] === 0) { r = i; break; }
        if (r < 0) return null; const ng = g.map(row => row.slice()); ng[r][col] = player; return { ng, r };
    }
    function scorePosition(g, player) {
        const opponent = 3 - player; let score = 0;
        let centerCount = 0; for (let r = 0; r < ROWS; r++) if (g[r][Math.floor(COLS / 2)] === player) centerCount++;
        score += centerCount * 3;
        function evalWindow(win) {
            const pCount = win.filter(v => v === player).length;
            const oCount = win.filter(v => v === opponent).length;
            const zCount = win.filter(v => v === 0).length;
            if (pCount === 4) score += 10000;
            else if (pCount === 3 && zCount === 1) score += 50;
            else if (pCount === 2 && zCount === 2) score += 6;
            if (oCount === 3 && zCount === 1) score -= 75;
            if (oCount === 4) score -= 10000;
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) evalWindow(g[r].slice(c, c + 4));
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS - 3; r++) evalWindow([g[r][c], g[r + 1][c], g[r + 2][c], g[r + 3][c]]);
        for (let r = 0; r < ROWS - 3; r++) for (let c = 0; c < COLS - 3; c++) evalWindow([g[r][c], g[r + 1][c + 1], g[r + 2][c + 2], g[r + 3][c + 3]]);
        for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS - 3; c++) evalWindow([g[r][c], g[r - 1][c + 1], g[r - 2][c + 2], g[r - 3][c + 3]]);
        return score;
    }
    function hasWin(g, player) {
        return checkLine(g, player, 0, 1) || checkLine(g, player, 1, 0) || checkLine(g, player, 1, 1) || checkLine(g, player, 1, -1);
    }
    function checkLine(g, p, dr, dc) {
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
            if ([...Array(4)].every(k => r + k * dr >= 0 && r + k * dr < ROWS && c + k * dc >= 0 && c + k * dc < COLS && g[r + k * dr][c + k * dc] === p))
                return true;
        return false;
    }
    function terminalState(g) { return hasWin(g, 1) || hasWin(g, 2) || validColumns(g).length === 0; }
    function minimax(g, depth, alpha, beta, maximizing) {
        const valid = validColumns(g);
        if (depth === 0 || terminalState(g)) {
            if (hasWin(g, 2)) return { score: 1000000, col: null };
            if (hasWin(g, 1)) return { score: -1000000, col: null };
            return { score: scorePosition(g, 2), col: null };
        }
        valid.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
        let bestCol = valid[0];
        if (maximizing) {
            let value = -Infinity;
            for (const col of valid) {
                const sim = simulateDrop(g, col, 2); if (!sim) continue;
                const result = minimax(sim.ng, depth - 1, alpha, beta, false);
                if (result.score > value) { value = result.score; bestCol = col; }
                alpha = Math.max(alpha, value); if (alpha >= beta) break;
            }
            return { score: value, col: bestCol };
        } else {
            let value = Infinity;
            for (const col of valid) {
                const sim = simulateDrop(g, col, 1); if (!sim) continue;
                const result = minimax(sim.ng, depth - 1, alpha, beta, true);
                if (result.score < value) { value = result.score; bestCol = col; }
                beta = Math.min(beta, value); if (alpha >= beta) break;
            }
            return { score: value, col: bestCol };
        }
    }

    // --- Confetti
    const confetti = (() => {
        const cnv = document.getElementById('confetti');
        const ctx = cnv.getContext('2d');
        let W, H, parts = [], running = false;
        function resize() { W = cnv.width = innerWidth * devicePixelRatio; H = cnv.height = innerHeight * devicePixelRatio; }
        resize(); addEventListener('resize', resize);
        function launch(color) {
            parts.length = 0;
            for (let i = 0; i < 180; i++) {
                parts.push({ x: Math.random() * W, y: -20, vx: (Math.random() - .5) * 2, vy: Math.random() * 1 + 1, s: Math.random() * 6 + 4, r: Math.random() * Math.PI, c: color });
            }
            if (!running) { running = true; requestAnimationFrame(loop); }
        }
        function loop() {
            ctx.clearRect(0, 0, W, H);
            for (const p of parts) {
                p.vy += 0.02; p.x += p.vx; p.y += p.vy; p.r += 0.05;
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
                ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
            }
            parts = parts.filter(p => p.y < H + 20);
            if (parts.length > 0) requestAnimationFrame(loop); else running = false;
        }
        return { fire: (winner) => launch(winner === 1 ? '#ef4444' : '#f59e0b') };
    })();
    function celebrate(winCells) { markWinning(winCells); confetti.fire(current); }

    // --- Sound
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq = 440, duration = 0.06, type = 'sine', vol = 0.02) {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.type = type; o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
        g.gain.value = vol; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration); o.stop(audioCtx.currentTime + duration);
    }
    function sound(kind) {
        if (kind === 'drop') beep(520, .05, 'triangle', .03);
        else if (kind === 'win') { beep(660, .08, 'sawtooth', .03); setTimeout(() => beep(880, .12, 'square', .025), 60); }
        else if (kind === 'bump') beep(160, .05, 'sine', .02);
    }

    // --- Clavier
    let focusCol = 3;
    function updateHeads() {
        Array.from(headsEl.children).forEach((h, i) => {
            h.style.opacity = i === focusCol ? 1 : .35;
            h.style.outline = i === focusCol ? '2px solid rgba(255,255,255,.2)' : 'none';
        });
    }
    document.addEventListener('keydown', e => {
        if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowLeft') { focusCol = (focusCol + COLS - 1) % COLS; updateHeads(); }
        if (e.key === 'ArrowRight') { focusCol = (focusCol + 1) % COLS; updateHeads(); }
        if (e.key === 'Enter' || e.key === ' ') { handleTurn(focusCol); }
    });

    // --- UI events
    document.getElementById('newBtn').addEventListener('click', () => { newGame(false); clearWinning(); });
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('themeBtn').addEventListener('click', () => {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        document.documentElement.setAttribute('data-theme', isLight ? '' : 'light');
        localStorage.setItem('p4-theme', isLight ? 'dark' : 'light');
    });
    modePvp.addEventListener('change', () => newGame(false));
    modeAi.addEventListener('change', () => newGame(false));
    diffEasy.addEventListener('change', () => newGame(false));
    diffHard.addEventListener('change', () => newGame(false));

    // Boot
    newGame(true); updateHeads();
})();

// Menu burger toggle
document.getElementById('burgerBtn').addEventListener('click', () => {
    document.querySelector('.controls').classList.toggle('show');
});
