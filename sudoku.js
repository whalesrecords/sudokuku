class SudokuGame {
    constructor() {
        this.grid = [];
        this.solution = [];
        this.level = parseInt(localStorage.getItem('sudoku-level') || '1');
        this.score = parseInt(localStorage.getItem('sudoku-score') || '0');
        this.selectedCell = null;
        this.gameMode = localStorage.getItem('sudoku-mode') || 'classic';
        this.startTime = null;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.currentTheme = localStorage.getItem('sudoku-theme') || 'default';
        this.animationsEnabled = localStorage.getItem('sudoku-animations') !== 'false';
        this.achievements = JSON.parse(localStorage.getItem('sudoku-achievements') || '[]');
        this.statistics = JSON.parse(localStorage.getItem('sudoku-statistics') || '{}');
        this.tutorialStep = 1;
        this.difficultySettings = {
            1: { name: 'Facile', cellsToRemove: 35 },
            2: { name: 'Facile', cellsToRemove: 40 },
            3: { name: 'Moyen', cellsToRemove: 45 },
            4: { name: 'Moyen', cellsToRemove: 50 },
            5: { name: 'Difficile', cellsToRemove: 55 },
            6: { name: 'Difficile', cellsToRemove: 60 }
        };
        this.achievementsList = [
            { id: 'first_win', name: 'Premier Succès', description: 'Terminer votre première grille', icon: '🏆' },
            { id: 'speed_demon', name: 'Démon de Vitesse', description: 'Terminer en moins de 3 minutes', icon: '⚡' },
            { id: 'perfectionist', name: 'Perfectionniste', description: 'Terminer sans erreur', icon: '💎' },
            { id: 'streak_master', name: 'Maître des Séries', description: '5 victoires consécutives', icon: '🔥' },
            { id: 'zen_master', name: 'Maître Zen', description: '10 parties en mode Zen', icon: '🧘' }
        ];
        this.init();
    }

    init() {
        this.initializeStatistics();
        this.initializeMemorySystem();
        this.applyTheme();
        this.updateDisplay();
        this.updateDateTime();
        this.generateGrid();
        this.setupEventListeners();
        this.startDateTimeUpdater();
        this.setupDailyChallenge();
        this.checkFirstTime();
        window.sudokuGame = this;
    }

    initializeMemorySystem() {
        this.gameHistory = JSON.parse(localStorage.getItem('sudoku-history') || '[]');
        this.hallOfFame = JSON.parse(localStorage.getItem('sudoku-hall-of-fame') || '[]');
        this.records = JSON.parse(localStorage.getItem('sudoku-records') || '{}');
        this.hintsUsed = 0;
        this.errorsCount = 0;
        this.isGameCompleted = false;
        
        if (!this.records.classic) {
            this.records = {
                classic: { bestTime: null, maxLevel: 0, totalGames: 0 },
                sprint: { bestTime: null, completed: 0, totalGames: 0 },
                zen: { totalGames: 0, totalTime: 0 }
            };
        }
        
        if (!this.statistics.totalHints) {
            this.statistics.totalHints = 0;
            this.statistics.totalErrors = 0;
            this.statistics.gamesAbandoned = 0;
        }
    }

    generateGrid() {
        if (this.startTime && !this.isGameCompleted) {
            this.saveAbandonedGame();
        }
        
        this.grid = this.createEmptyGrid();
        this.solution = this.createEmptyGrid();
        this.hintsUsed = 0;
        this.errorsCount = 0;
        this.isGameCompleted = false;
        
        this.fillGrid(this.solution);
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.grid[i][j] = this.solution[i][j];
            }
        }
        
        this.removeNumbers();
        this.renderGrid();
        this.startTimer();
    }

    createEmptyGrid() {
        return Array(9).fill().map(() => Array(9).fill(0));
    }

    fillGrid(grid) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (let num of numbers) {
                        if (this.isValidMove(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (this.fillGrid(grid)) {
                                return true;
                            }
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    isValidMove(grid, row, col, num) {
        for (let i = 0; i < 9; i++) {
            if (grid[row][i] === num || grid[i][col] === num) {
                return false;
            }
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (grid[i][j] === num) {
                    return false;
                }
            }
        }
        return true;
    }

    removeNumbers() {
        const difficulty = this.difficultySettings[Math.min(this.level, 6)];
        const cellsToRemove = difficulty.cellsToRemove;
        let removed = 0;

        while (removed < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.grid[row][col] !== 0) {
                this.grid[row][col] = 0;
                removed++;
            }
        }
    }

    renderGrid() {
        const gridElement = document.getElementById('sudoku-grid');
        gridElement.innerHTML = '';

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.grid[row][col] !== 0) {
                    cell.textContent = this.grid[row][col];
                    cell.classList.add('given');
                }

                if (row % 3 === 0 && row > 0) cell.classList.add('border-top');
                if (col % 3 === 0 && col > 0) cell.classList.add('border-left');

                cell.addEventListener('click', () => this.selectCell(row, col));
                gridElement.appendChild(cell);
            }
        }
    }

    selectCell(row, col) {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('selected');
        });

        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (!cell.classList.contains('given')) {
            cell.classList.add('selected');
            this.selectedCell = { row, col };
        }
    }

    placeNumber(number) {
        if (!this.selectedCell) return;

        const { row, col } = this.selectedCell;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        
        if (number === 0) {
            this.grid[row][col] = 0;
            cell.textContent = '';
            cell.classList.remove('error');
        } else {
            this.grid[row][col] = number;
            cell.textContent = number;
            
            if (this.isValidMove(this.grid, row, col, number)) {
                cell.classList.remove('error');
            } else {
                cell.classList.add('error');
            }
        }

        if (this.isGridComplete()) {
            this.handleVictory();
        }
    }

    isGridComplete() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return false;
                if (this.grid[row][col] !== this.solution[row][col]) return false;
            }
        }
        return true;
    }

    handleVictory() {
        this.stopTimer();
        const timeBonus = Math.max(0, 300 - this.elapsedTime); // Bonus pour rapidité
        this.score += (this.level * 10) + timeBonus;
        
        // Mettre à jour les statistiques
        this.updateStatistics();
        
        // Vérifier les achievements
        this.checkAchievements();
        
        // Afficher les résultats
        document.getElementById('victory-time').textContent = this.formatTime(this.elapsedTime);
        document.getElementById('victory-score').textContent = this.score;
        
        this.level++;
        this.saveProgress();
        this.updateDisplay();
        document.getElementById('victory-modal').style.display = 'flex';
    }

    giveHint() {
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const { row, col } = randomCell;
            this.grid[row][col] = this.solution[row][col];
            
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.textContent = this.solution[row][col];
            cell.classList.add('hint');
        }
    }

    checkSolution() {
        let hasErrors = false;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (this.grid[row][col] !== 0 && this.grid[row][col] !== this.solution[row][col]) {
                    cell.classList.add('error');
                    hasErrors = true;
                } else {
                    cell.classList.remove('error');
                }
            }
        }
        
        if (!hasErrors && this.isGridComplete()) {
            this.handleVictory();
        }
    }

    updateDisplay() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('score').textContent = this.score;
        const difficulty = this.difficultySettings[Math.min(this.level, 6)];
        document.getElementById('difficulty').textContent = difficulty.name;
    }

    saveProgress() {
        localStorage.setItem('sudoku-level', this.level.toString());
        localStorage.setItem('sudoku-score', this.score.toString());
    }

    updateDateTime() {
        const now = new Date();
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        const time = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const dayName = days[now.getDay()];
        const day = now.getDate();
        const month = months[now.getMonth()];
        
        document.getElementById('current-time').textContent = time;
        document.getElementById('current-date').textContent = `${dayName} ${day} ${month}`;
    }

    startDateTimeUpdater() {
        setInterval(() => {
            this.updateDateTime();
        }, 1000);
    }

    // === TIMER SYSTEM ===
    startTimer() {
        if (this.gameMode === 'zen') return; // Pas de timer en mode zen
        
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.isPaused = false;
        
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
                document.getElementById('timer').textContent = this.formatTime(this.elapsedTime);
                
                // Mode Sprint: limite de temps
                if (this.gameMode === 'sprint' && this.elapsedTime >= 300) {
                    this.handleTimeOut();
                }
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    pauseTimer() {
        this.isPaused = true;
    }

    resumeTimer() {
        this.isPaused = false;
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    handleTimeOut() {
        this.stopTimer();
        alert('Temps écoulé! Essayez encore.');
        this.generateGrid();
    }

    // === GAME MODES ===
    setGameMode(mode) {
        this.gameMode = mode;
        localStorage.setItem('sudoku-mode', mode);
        
        // Mettre à jour l'UI
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        
        // Adapter l'affichage selon le mode
        const timerElement = document.getElementById('timer');
        if (mode === 'zen') {
            timerElement.textContent = '∞';
        } else {
            timerElement.textContent = '00:00';
        }
        
        this.generateGrid();
    }

    // === THEMES SYSTEM ===
    applyTheme() {
        document.body.className = `theme-${this.currentTheme}`;
        if (!this.animationsEnabled) {
            document.body.classList.add('no-animations');
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('sudoku-theme', theme);
        this.applyTheme();
        
        // Mettre à jour l'UI
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    }

    toggleAnimations() {
        this.animationsEnabled = !this.animationsEnabled;
        localStorage.setItem('sudoku-animations', this.animationsEnabled.toString());
        this.applyTheme();
    }

    // === STATISTICS SYSTEM ===
    initializeStatistics() {
        if (!this.statistics.totalGames) {
            this.statistics = {
                totalGames: 0,
                totalScore: 0,
                bestTime: null,
                currentStreak: 0,
                bestStreak: 0,
                gamesWon: 0,
                averageTime: 0,
                zenGames: 0,
                sprintGames: 0,
                classicGames: 0
            };
        }
    }

    updateStatistics() {
        this.statistics.totalGames++;
        this.statistics.gamesWon++;
        this.statistics.totalScore += this.score;
        this.statistics.currentStreak++;
        this.statistics[this.gameMode + 'Games']++;
        
        if (!this.statistics.bestTime || this.elapsedTime < this.statistics.bestTime) {
            this.statistics.bestTime = this.elapsedTime;
        }
        
        if (this.statistics.currentStreak > this.statistics.bestStreak) {
            this.statistics.bestStreak = this.statistics.currentStreak;
        }
        
        const totalTime = (this.statistics.averageTime * (this.statistics.gamesWon - 1)) + this.elapsedTime;
        this.statistics.averageTime = Math.floor(totalTime / this.statistics.gamesWon);
        
        localStorage.setItem('sudoku-statistics', JSON.stringify(this.statistics));
        this.updateStatisticsDisplay();
    }

    updateStatisticsDisplay() {
        document.getElementById('total-games').textContent = this.statistics.totalGames;
        document.getElementById('best-time').textContent = this.statistics.bestTime ? this.formatTime(this.statistics.bestTime) : '--:--';
        document.getElementById('total-score').textContent = this.statistics.totalScore;
        document.getElementById('streak').textContent = this.statistics.currentStreak;
    }

    // === ACHIEVEMENTS SYSTEM ===
    checkAchievements() {
        const newAchievements = [];
        
        // Premier succès
        if (this.statistics.gamesWon === 1 && !this.hasAchievement('first_win')) {
            newAchievements.push('first_win');
        }
        
        // Démon de vitesse
        if (this.elapsedTime < 180 && !this.hasAchievement('speed_demon')) {
            newAchievements.push('speed_demon');
        }
        
        // Maître des séries
        if (this.statistics.currentStreak >= 5 && !this.hasAchievement('streak_master')) {
            newAchievements.push('streak_master');
        }
        
        // Maître Zen
        if (this.statistics.zenGames >= 10 && !this.hasAchievement('zen_master')) {
            newAchievements.push('zen_master');
        }
        
        // Afficher les nouveaux achievements
        newAchievements.forEach(id => {
            this.achievements.push(id);
            this.showAchievement(id);
        });
        
        if (newAchievements.length > 0) {
            localStorage.setItem('sudoku-achievements', JSON.stringify(this.achievements));
        }
    }

    hasAchievement(id) {
        return this.achievements.includes(id);
    }

    showAchievement(id) {
        const achievement = this.achievementsList.find(a => a.id === id);
        const container = document.getElementById('achievements-container');
        
        const achievementElement = document.createElement('div');
        achievementElement.className = 'achievement-earned';
        achievementElement.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
        
        container.appendChild(achievementElement);
    }

    // === DAILY CHALLENGE ===
    setupDailyChallenge() {
        const today = new Date().toDateString();
        const lastChallenge = localStorage.getItem('last-daily-challenge');
        
        if (lastChallenge !== today) {
            document.getElementById('daily-challenge').style.display = 'block';
            this.updateChallengeTimer();
        }
    }

    updateChallengeTimer() {
        setInterval(() => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const diff = tomorrow - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            document.getElementById('challenge-timer').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    startDailyChallenge() {
        const today = new Date().toDateString();
        localStorage.setItem('last-daily-challenge', today);
        document.getElementById('daily-challenge').style.display = 'none';
        
        // Grille spéciale pour le défi
        this.gameMode = 'sprint';
        this.generateGrid();
    }

    // === TUTORIAL SYSTEM ===
    checkFirstTime() {
        if (!localStorage.getItem('sudoku-tutorial-seen')) {
            document.getElementById('tutorial-modal').style.display = 'flex';
        }
    }

    nextTutorialStep() {
        const currentStep = document.querySelector('.tutorial-step.active');
        const nextStep = document.querySelector(`[data-step="${this.tutorialStep + 1}"]`);
        
        if (nextStep) {
            currentStep.classList.remove('active');
            nextStep.classList.add('active');
            
            // Mettre à jour les indicateurs
            document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.tutorialStep);
            });
            
            this.tutorialStep++;
        } else {
            this.closeTutorial();
        }
    }

    prevTutorialStep() {
        if (this.tutorialStep > 1) {
            const currentStep = document.querySelector('.tutorial-step.active');
            const prevStep = document.querySelector(`[data-step="${this.tutorialStep - 1}"]`);
            
            currentStep.classList.remove('active');
            prevStep.classList.add('active');
            
            this.tutorialStep--;
            
            // Mettre à jour les indicateurs
            document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
                indicator.classList.toggle('active', index === this.tutorialStep - 1);
            });
        }
    }

    closeTutorial() {
        document.getElementById('tutorial-modal').style.display = 'none';
        localStorage.setItem('sudoku-tutorial-seen', 'true');
    }

    // === SOCIAL SHARING ===
    shareResult() {
        const text = `🎯 J'ai terminé le niveau ${this.level} de Sudoku Progressive en ${this.formatTime(this.elapsedTime)} !\n\n🏆 Score: ${this.score}\n⚡ Mode: ${this.gameMode}\n\nJouez maintenant: https://whalesrecords.github.io/sudokuku`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Sudoku Progressive',
                text: text,
                url: 'https://whalesrecords.github.io/sudokuku'
            });
        } else {
            // Fallback: copier dans le presse-papier
            navigator.clipboard.writeText(text).then(() => {
                alert('Résultat copié dans le presse-papier!');
            });
        }
    }

    setupEventListeners() {
        // Contrôles de jeu
        document.getElementById('new-game').addEventListener('click', () => {
            this.generateGrid();
        });

        document.getElementById('hint').addEventListener('click', () => {
            this.giveHint();
        });

        document.getElementById('check').addEventListener('click', () => {
            this.checkSolution();
        });

        document.getElementById('next-level').addEventListener('click', () => {
            document.getElementById('victory-modal').style.display = 'none';
            this.generateGrid();
        });

        // Sélecteur de mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setGameMode(btn.dataset.mode);
            });
        });

        // Pavé numérique
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.dataset.number);
                this.placeNumber(number);
            });
        });

        // Paramètres
        document.getElementById('settings').addEventListener('click', () => {
            this.updateStatisticsDisplay();
            document.getElementById('settings-modal').style.display = 'flex';
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('settings-modal').style.display = 'none';
        });

        // Thèmes
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
            });
        });

        // Toggle animations
        document.getElementById('animations-toggle').addEventListener('change', (e) => {
            this.animationsEnabled = e.target.checked;
            localStorage.setItem('sudoku-animations', this.animationsEnabled.toString());
            this.applyTheme();
        });

        // Partage
        document.getElementById('share-result').addEventListener('click', () => {
            this.shareResult();
        });

        // Défi quotidien
        document.getElementById('start-challenge').addEventListener('click', () => {
            this.startDailyChallenge();
        });

        // Tutoriel
        document.getElementById('tutorial-next').addEventListener('click', () => {
            this.nextTutorialStep();
        });

        document.getElementById('tutorial-prev').addEventListener('click', () => {
            this.prevTutorialStep();
        });

        // Fermer les modals en cliquant à l'extérieur
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});