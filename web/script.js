(function() {
  const n = 3;
  let goal = [];
  let board = [];
  let blankPos = {r: 0, c: 0};
  let targetRowSums = [];
  let targetColSums = [];
  let animating = false;    // flag to disable user moves during animation

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function init() {
    // 1. 生成随机目标布局（goal），并计算目标行列和
    const nums = Array.from({length: n * n - 1}, (_, i) => i + 1);
    nums.push(0);
    shuffleArray(nums);
    goal = [];
    for (let i = 0; i < n; i++) {
      goal.push(nums.slice(i * n, (i + 1) * n));
    }
    targetRowSums = goal.map(row => row.reduce((a, b) => a + b, 0));
    targetColSums = [];
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += goal[r][c];
      }
      targetColSums.push(sum);
    }
    // 2. 从目标布局复制，并通过合法滑动若干次生成可解的初始布局
    board = goal.map(row => row.slice());
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === 0) {
          blankPos = {r, c};
        }
      }
    }
    scramble(1000);
    render();
  }

  function scramble(moves) {
    // scramble with legal moves (no recording for optimal solve)
    const dirs = [
      {dr: -1, dc: 0},
      {dr: 1, dc: 0},
      {dr: 0, dc: -1},
      {dr: 0, dc: 1}
    ];
    for (let i = 0; i < moves; i++) {
      const {r, c} = blankPos;
      const neighbors = [];
      dirs.forEach(d => {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
          neighbors.push({r: nr, c: nc});
        }
      });
      if (neighbors.length > 0) {
        const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
        [board[r][c], board[pick.r][pick.c]] = [board[pick.r][pick.c], board[r][c]];
        blankPos = {r: pick.r, c: pick.c};
      }
    }
  }

  function render() {
    const container = document.getElementById('game-container');
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid';
    const currentRowSums = board.map(row => row.reduce((a, b) => a + b, 0));
    const currentColSums = [];
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += board[r][c];
      }
      currentColSums.push(sum);
    }
    const size = n + 2;
    // 计算当前与目标的差值
    const rowDiffs = currentRowSums.map((sum, i) => sum - targetRowSums[i]);
    const colDiffs = currentColSums.map((sum, i) => sum - targetColSums[i]);
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const cell = document.createElement('div');
        if (row === 0 && col === 0) {
          cell.className = 'label';
          cell.textContent = '';
        } else if (row === 0 && col > 0 && col <= n) {
          // 上方显示当前列和与目标列和之差
          const diff = colDiffs[col - 1];
          cell.className = 'label ' + (diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero');
          cell.textContent = (diff > 0 ? '+' : '') + diff;
        } else if (row === 0 && col === n + 1) {
          cell.className = 'label';
          cell.textContent = '';
        } else if (col === 0 && row > 0 && row <= n) {
          // 左侧显示当前行和与目标行和之差
          const diff = rowDiffs[row - 1];
          cell.className = 'label ' + (diff > 0 ? 'diff-positive' : diff < 0 ? 'diff-negative' : 'diff-zero');
          cell.textContent = (diff > 0 ? '+' : '') + diff;
        } else if (row > 0 && row <= n && col > 0 && col <= n) {
          const val = board[row - 1][col - 1];
          cell.className = 'tile';
          if (val === 0) {
            cell.classList.add('blank');
            cell.textContent = '';
          } else {
            cell.textContent = val;
            cell.addEventListener('click', () => onClick(row - 1, col - 1));
          }
        } else if (col === n + 1 && row > 0 && row <= n) {
          cell.className = 'label';
          cell.textContent = targetRowSums[row - 1];
        } else if (row === n + 1 && col > 0 && col <= n) {
          cell.className = 'label';
          cell.textContent = targetColSums[col - 1];
        } else {
          cell.className = 'label';
          cell.textContent = '';
        }
        grid.appendChild(cell);
      }
    }
    container.appendChild(grid);
  }

  function onClick(r, c) {
    if (animating) return;
    const {r: br, c: bc} = blankPos;
    if (Math.abs(br - r) + Math.abs(bc - c) === 1) {
      [board[br][bc], board[r][c]] = [board[r][c], board[br][bc]];
      blankPos = {r, c};
      render();
      if (checkWin()) {
        setTimeout(() => alert('恭喜！你完成了游戏！'), 100);
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < n; r++) {
      const sum = board[r].reduce((a, b) => a + b, 0);
      if (sum !== targetRowSums[r]) {
        return false;
      }
    }
    for (let c = 0; c < n; c++) {
      let sum = 0;
      for (let r = 0; r < n; r++) {
        sum += board[r][c];
      }
      if (sum !== targetColSums[c]) {
        return false;
      }
    }
    return true;
  }

  /**
   * IDA* search for optimal solution in 8-puzzle
   * Returns array of blank indices to move through, or null if unsolvable
   */
  function solvePuzzle() {
    const size = n * n;
    const solverBoard = [];
    let startBlank = 0;
    // flatten current board
    for (let r = 0, idx = 0; r < n; r++) {
      for (let c = 0; c < n; c++, idx++) {
        const v = board[r][c];
        solverBoard[idx] = v;
        if (v === 0) startBlank = idx;
      }
    }
    // goal positions map
    const goalFlat = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) goalFlat.push(goal[r][c]);
    }
    const goalPos = {};
    for (let i = 0; i < size; i++) goalPos[goalFlat[i]] = i;
    // moves and opposite mapping
    const moves = [ {dr:-1,dc:0}, {dr:1,dc:0}, {dr:0,dc:-1}, {dr:0,dc:1} ];
    const opposite = [1,0,3,2];
    // heuristic: sum of Manhattan distances
    function heuristic(arr) {
      let h = 0;
      for (let i = 0; i < size; i++) {
        const v = arr[i];
        if (v !== 0) {
          const gi = goalPos[v];
          h += Math.abs(Math.floor(i / n) - Math.floor(gi / n))
             + Math.abs((i % n) - (gi % n));
        }
      }
      return h;
    }
    let bound = heuristic(solverBoard);
    let path = [];
    let nextBound;
    function dfs(g, blankIdx, prevDir) {
      const h = heuristic(solverBoard);
      const f = g + h;
      if (f > bound) {
        nextBound = Math.min(nextBound, f);
        return false;
      }
      if (h === 0) return true;
      const r0 = Math.floor(blankIdx / n);
      const c0 = blankIdx % n;
      for (let dir = 0; dir < 4; dir++) {
        if (prevDir >= 0 && dir === opposite[prevDir]) continue;
        const nr = r0 + moves[dir].dr;
        const nc = c0 + moves[dir].dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
        const ni = nr * n + nc;
        // swap
        [solverBoard[blankIdx], solverBoard[ni]] = [solverBoard[ni], solverBoard[blankIdx]];
        path.push(ni);
        if (dfs(g + 1, ni, dir)) return true;
        path.pop();
        // undo
        [solverBoard[ni], solverBoard[blankIdx]] = [solverBoard[blankIdx], solverBoard[ni]];
      }
      return false;
    }
    while (true) {
      nextBound = Infinity;
      if (dfs(0, startBlank, -1)) break;
      if (nextBound === Infinity) return null;
      bound = nextBound;
    }
    return path;
  }
  // Show optimal solution via IDA*
  function showSolution() {
    if (animating) return;
    animating = true;
    const btn = document.getElementById('solve-btn');
    btn.disabled = true;
    const solution = solvePuzzle();
    if (!solution) {
      alert('无法找到最优解');
      animating = false;
      btn.disabled = false;
      return;
    }
    let i = 0;
    const interval = 200;
    const timer = setInterval(() => {
      if (i >= solution.length) {
        clearInterval(timer);
        animating = false;
        btn.disabled = false;
        return;
      }
      const nextIdx = solution[i];
      const br = blankPos.r, bc = blankPos.c;
      const nr = Math.floor(nextIdx / n), nc = nextIdx % n;
      board[br][bc] = board[nr][nc];
      board[nr][nc] = 0;
      blankPos = {r: nr, c: nc};
      render();
      i++;
    }, interval);
  }
  // Initialize game and bind solve button
  window.onload = () => {
    init();
    const btn = document.getElementById('solve-btn');
    btn.addEventListener('click', showSolution);
  };
})();
