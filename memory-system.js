// === MEMORY & STATISTICS EXTENSIONS ===

// Ajouter les nouvelles méthodes à la classe SudokuGame
SudokuGame.prototype.initializeMemorySystem = function() {
    // Initialiser les nouvelles propriétés de mémoire
    this.gameHistory = JSON.parse(localStorage.getItem('sudoku-history') || '[]');
    this.hallOfFame = JSON.parse(localStorage.getItem('sudoku-hall-of-fame') || '[]');
    this.records = JSON.parse(localStorage.getItem('sudoku-records') || '{}');
    this.hintsUsed = 0;
    this.errorsCount = 0;
    this.isGameCompleted = false;
    
    // Initialiser les records par mode si nécessaire
    if (!this.records.classic) {
        this.records = {
            classic: { bestTime: null, maxLevel: 0, totalGames: 0 },
            sprint: { bestTime: null, completed: 0, totalGames: 0 },
            zen: { totalGames: 0, totalTime: 0 }
        };
    }
    
    // Étendre les statistiques
    if (!this.statistics.totalHints) {
        this.statistics.totalHints = 0;
        this.statistics.totalErrors = 0;
        this.statistics.gamesAbandoned = 0;
    }
};

// Sauvegarder une partie dans l'historique
SudokuGame.prototype.saveGameToHistory = function(completed = false) {
    const gameRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        mode: this.gameMode,
        level: this.level,
        time: this.elapsedTime,
        score: this.score,
        hintsUsed: this.hintsUsed,
        errorsCount: this.errorsCount,
        completed: completed
    };
    
    this.gameHistory.unshift(gameRecord);
    
    // Garder seulement les 100 dernières parties
    if (this.gameHistory.length > 100) {
        this.gameHistory = this.gameHistory.slice(0, 100);
    }
    
    localStorage.setItem('sudoku-history', JSON.stringify(this.gameHistory));
};

// Sauvegarder une partie abandonnée
SudokuGame.prototype.saveAbandonedGame = function() {
    this.statistics.gamesAbandoned++;
    this.statistics.currentStreak = 0;
    this.saveGameToHistory(false);
    localStorage.setItem('sudoku-statistics', JSON.stringify(this.statistics));
};

// Mettre à jour les records par mode
SudokuGame.prototype.updateRecords = function() {
    const modeRecord = this.records[this.gameMode];
    
    if (this.gameMode === 'classic') {
        if (!modeRecord.bestTime || this.elapsedTime < modeRecord.bestTime) {
            modeRecord.bestTime = this.elapsedTime;
        }
        if (this.level > modeRecord.maxLevel) {
            modeRecord.maxLevel = this.level;
        }
        modeRecord.totalGames++;
    } else if (this.gameMode === 'sprint') {
        if (!modeRecord.bestTime || this.elapsedTime < modeRecord.bestTime) {
            modeRecord.bestTime = this.elapsedTime;
        }
        modeRecord.completed++;
        modeRecord.totalGames++;
    } else if (this.gameMode === 'zen') {
        modeRecord.totalGames++;
        modeRecord.totalTime += this.elapsedTime;
    }
    
    localStorage.setItem('sudoku-records', JSON.stringify(this.records));
};

// Mettre à jour le Hall of Fame
SudokuGame.prototype.updateHallOfFame = function() {
    const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        mode: this.gameMode,
        level: this.level,
        time: this.elapsedTime,
        score: this.score,
        efficiency: Math.round((this.score / this.elapsedTime) * 100) / 100
    };
    
    this.hallOfFame.push(entry);
    
    // Trier par score décroissant et garder les 50 meilleurs
    this.hallOfFame.sort((a, b) => b.score - a.score);
    this.hallOfFame = this.hallOfFame.slice(0, 50);
    
    localStorage.setItem('sudoku-hall-of-fame', JSON.stringify(this.hallOfFame));
};

// Afficher les statistiques détaillées
SudokuGame.prototype.showDetailedStats = function() {
    this.updateDetailedStatsDisplay();
    document.getElementById('detailed-stats-modal').style.display = 'flex';
};

// Mettre à jour l'affichage des statistiques détaillées
SudokuGame.prototype.updateDetailedStatsDisplay = function() {
    this.displayHallOfFame();
    this.displayModeRecords();
    this.displayGameHistory();
    this.displayPerformanceAnalysis();
};

// Afficher le Hall of Fame
SudokuGame.prototype.displayHallOfFame = function() {
    const container = document.getElementById('hall-of-fame');
    container.innerHTML = '';
    
    if (this.hallOfFame.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun record pour le moment. Jouez pour établir vos premiers scores !</p>';
        return;
    }
    
    this.hallOfFame.slice(0, 10).forEach((entry, index) => {
        const entryElement = document.createElement('div');
        entryElement.className = 'hall-entry';
        
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
        const date = new Date(entry.date).toLocaleDateString('fr-FR');
        
        entryElement.innerHTML = `
            <div class="hall-rank">${medal}</div>
            <div class="hall-details">
                <div class="hall-score">${entry.score} pts</div>
                <div class="hall-info">${this.formatTime(entry.time)} • ${entry.mode} • ${date}</div>
            </div>
        `;
        
        container.appendChild(entryElement);
    });
};

// Afficher les records par mode
SudokuGame.prototype.displayModeRecords = function() {
    // Classique
    document.getElementById('classic-best').textContent = 
        this.records.classic.bestTime ? this.formatTime(this.records.classic.bestTime) : '--:--';
    document.getElementById('classic-level').textContent = this.records.classic.maxLevel;
    
    // Sprint
    document.getElementById('sprint-best').textContent = 
        this.records.sprint.bestTime ? this.formatTime(this.records.sprint.bestTime) : '--:--';
    document.getElementById('sprint-completed').textContent = this.records.sprint.completed;
    
    // Zen
    document.getElementById('zen-games').textContent = this.records.zen.totalGames;
    const zenHours = Math.floor(this.records.zen.totalTime / 3600);
    const zenMinutes = Math.floor((this.records.zen.totalTime % 3600) / 60);
    document.getElementById('zen-time').textContent = `${zenHours}h ${zenMinutes}m`;
};

// Afficher l'historique des parties
SudokuGame.prototype.displayGameHistory = function() {
    const container = document.getElementById('history-list');
    const filter = document.getElementById('history-filter').value;
    
    container.innerHTML = '';
    
    let filteredHistory = this.gameHistory;
    if (filter !== 'all') {
        filteredHistory = this.gameHistory.filter(game => game.mode === filter);
    }
    
    if (filteredHistory.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune partie dans l\'historique.</p>';
        return;
    }
    
    filteredHistory.slice(0, 20).forEach(game => {
        const gameElement = document.createElement('div');
        gameElement.className = `history-entry ${game.completed ? 'completed' : 'abandoned'}`;
        
        const date = new Date(game.date).toLocaleDateString('fr-FR');
        const time = new Date(game.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const status = game.completed ? '✅' : '❌';
        
        gameElement.innerHTML = `
            <div class="history-status">${status}</div>
            <div class="history-details">
                <div class="history-main">
                    ${game.mode} - Niveau ${game.level}
                    ${game.completed ? `- ${this.formatTime(game.time)}` : '- Abandonné'}
                </div>
                <div class="history-meta">
                    ${date} ${time} • Score: ${game.score} • Indices: ${game.hintsUsed}
                </div>
            </div>
        `;
        
        container.appendChild(gameElement);
    });
};

// Afficher l'analyse de performance
SudokuGame.prototype.displayPerformanceAnalysis = function() {
    const totalGames = this.statistics.totalGames;
    const gamesWon = this.statistics.gamesWon;
    
    // Taux de précision
    const accuracy = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100) : 0;
    document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
    
    // Vitesse moyenne
    document.getElementById('avg-speed').textContent = 
        this.statistics.averageTime ? this.formatTime(this.statistics.averageTime) : '--:--';
    
    // Meilleure série
    document.getElementById('best-streak').textContent = this.statistics.bestStreak;
    
    // Total indices
    document.getElementById('total-hints').textContent = this.statistics.totalHints || 0;
};

// Vider l'historique
SudokuGame.prototype.clearGameHistory = function() {
    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
        this.gameHistory = [];
        localStorage.setItem('sudoku-history', JSON.stringify(this.gameHistory));
        this.displayGameHistory();
    }
};

// Changer d'onglet dans les statistiques détaillées
SudokuGame.prototype.switchStatsTab = function(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Désactiver tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Afficher l'onglet sélectionné
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Actualiser le contenu selon l'onglet
    if (tabName === 'history') {
        this.displayGameHistory();
    } else if (tabName === 'analysis') {
        this.displayPerformanceAnalysis();
    }
};

// Fonction d'initialisation globale pour le système de mémoire
function initializeMemorySystem() {
    // Attendre que le DOM soit chargé
    document.addEventListener('DOMContentLoaded', function() {
        // Ajouter les event listeners pour le système de mémoire
        
        // Bouton statistiques détaillées
        const viewStatsBtn = document.getElementById('view-detailed-stats');
        if (viewStatsBtn) {
            viewStatsBtn.addEventListener('click', function() {
                window.sudokuGame.showDetailedStats();
            });
        }
        
        // Fermer les statistiques détaillées
        const closeStatsBtn = document.getElementById('close-detailed-stats');
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', function() {
                document.getElementById('detailed-stats-modal').style.display = 'none';
            });
        }
        
        // Onglets des statistiques
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                window.sudokuGame.switchStatsTab(btn.dataset.tab);
            });
        });
        
        // Filtre historique
        const historyFilter = document.getElementById('history-filter');
        if (historyFilter) {
            historyFilter.addEventListener('change', function() {
                window.sudokuGame.displayGameHistory();
            });
        }
        
        // Vider l'historique
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', function() {
                window.sudokuGame.clearGameHistory();
            });
        }
    });
}

// Initialiser le système de mémoire
initializeMemorySystem();