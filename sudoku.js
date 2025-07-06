class SudokuGame {
    constructor() {
        this.grid = [];
        this.solution = [];
        this.level = parseInt(localStorage.getItem('sudoku-level') || '1');
        this.score = parseInt(localStorage.getItem('sudoku-score') || '0');
        this.selectedCell = null;
        this.difficultySettings = {
            1: { name: 'Facile', cellsToRemove: 35 },
            2: { name: 'Facile', cellsToRemove: 40 },
            3: { name: 'Moyen', cellsToRemove: 45 },
            4: { name: 'Moyen', cellsToRemove: 50 },
            5: { name: 'Difficile', cellsToRemove: 55 },
            6: { name: 'Difficile', cellsToRemove: 60 }
        };
        this.init();
    }

    init() {
        this.updateDisplay();
        this.updateDateTime();
        this.generateGrid();
        this.setupEventListeners();
        this.startDateTimeUpdater();
    }

    generateGrid() {
        this.grid = this.createEmptyGrid();
        this.solution = this.createEmptyGrid();
        
        this.fillGrid(this.solution);
        
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                this.grid[i][j] = this.solution[i][j];
            }
        }
        
        this.removeNumbers();
        this.renderGrid();
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
        this.score += this.level * 10;
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

    setupEventListeners() {
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

        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const number = parseInt(btn.dataset.number);
                this.placeNumber(number);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});