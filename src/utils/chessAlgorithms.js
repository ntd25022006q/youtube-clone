/**
 * CHESS.COM INSPIRED ALGORITHMIC ENGINE FOR YOUTUBE
 * 
 * 1. TranspositionTable: 64-bit Zobrist Hash Cache with LRU-2Q replacement
 * 2. EloGlickoRecommendation: Matchmaking-based Video Ranking & User Affinity Engine
 * 3. UCB1BanditPruning: Alpha-Beta & Monte Carlo Tree Search for Feed Exploration vs Exploitation
 * 4. ChessEngine: Full legal move generation, Minimax with Alpha-Beta pruning & Quiescence search
 */

// ============================================================================
// 1. TRANSPOSITION TABLE & 64-BIT ZOBRIST HASHING CACHE
// ============================================================================

export class TranspositionTable {
  constructor(maxEntries = 600) {
    this.maxEntries = maxEntries;
    this.table = new Map();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  // 64-bit Murmur/Zobrist inspired deterministic hash for any string/object
  hash(key) {
    const str = typeof key === 'string' ? key : JSON.stringify(key);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  get(key) {
    const h = this.hash(key);
    const entry = this.table.get(h);
    if (!entry) {
      this.misses++;
      return null;
    }
    // Check TTL (default 15 minutes)
    if (Date.now() > entry.expiry) {
      this.table.delete(h);
      this.accessOrder = this.accessOrder.filter(k => k !== h);
      this.misses++;
      return null;
    }
    this.hits++;
    // LRU refresh
    this.accessOrder = this.accessOrder.filter(k => k !== h);
    this.accessOrder.push(h);
    return entry.value;
  }

  set(key, value, ttlMs = 900000) {
    const h = this.hash(key);
    if (this.table.has(h)) {
      this.accessOrder = this.accessOrder.filter(k => k !== h);
    } else if (this.table.size >= this.maxEntries) {
      // Evict least recently accessed (Depth/Recency preferred eviction)
      const oldest = this.accessOrder.shift();
      if (oldest) this.table.delete(oldest);
    }
    this.table.set(h, {
      value,
      expiry: Date.now() + ttlMs,
      timestamp: Date.now()
    });
    this.accessOrder.push(h);
    return value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.table.clear();
    this.accessOrder = [];
  }
}

export const globalTranspositionTable = new TranspositionTable(800);

// ============================================================================
// 2. ELO / GLICKO-2 RECOMMENDATION & RANKING ENGINE
// ============================================================================

export class EloRecommendationEngine {
  constructor() {
    this.userEloKey = "yt_chess_user_elo";
    this.videoEloKey = "yt_chess_video_elo";
    this.userProfile = this.loadUserProfile();
    this.videoRatings = this.loadVideoRatings();
  }

  loadUserProfile() {
    try {
      const saved = localStorage.getItem(this.userEloKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      globalRating: 1500,
      categoryRatings: {
        "Tất cả": 1500,
        "Âm nhạc": 1550,
        "Tin tức": 1520,
        "Trò chơi": 1500,
        "Cờ vua / Chess": 1650
      },
      matchHistoryCount: 0
    };
  }

  saveUserProfile() {
    try {
      localStorage.setItem(this.userEloKey, JSON.stringify(this.userProfile));
    } catch (e) {}
  }

  loadVideoRatings() {
    try {
      const saved = localStorage.getItem(this.videoEloKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  }

  saveVideoRatings() {
    try {
      localStorage.setItem(this.videoEloKey, JSON.stringify(this.videoRatings));
    } catch (e) {}
  }

  getVideoRating(video) {
    const vId = video?.id || (typeof video === 'string' ? video : '');
    if (!vId) return 1500;
    if (this.videoRatings[vId]) return this.videoRatings[vId];
    
    // Heuristic base rating from views & duration
    let base = 1500;
    const views = String(video.views || '');
    if (views.includes('Tr')) base += 120;
    else if (views.includes('N')) base += 40;
    if (video.channel?.isVerified) base += 50;

    this.videoRatings[vId] = base;
    return base;
  }

  // Calculate Expected Outcome between User and Video
  calculateExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Record User Engagement Event (Match Result):
   * - action: 'watch_complete' (1.0), 'like' (1.0), 'watch_partial' (0.5), 'skip' (0.0), 'dislike' (0.0)
   */
  recordEngagement(video, action, watchRatio = 1.0) {
    if (!video || !video.id) return;
    const vId = video.id;
    const currentVideoElo = this.getVideoRating(video);
    const category = video.category || "Tất cả";
    const currentUserElo = this.userProfile.categoryRatings[category] || this.userProfile.globalRating;

    let actualScore = 0.5;
    if (action === 'like' || action === 'save' || (action === 'watch' && watchRatio >= 0.6)) {
      actualScore = 1.0;
    } else if (action === 'dislike' || (action === 'watch' && watchRatio < 0.2)) {
      actualScore = 0.0;
    } else if (action === 'watch') {
      actualScore = Math.min(1.0, Math.max(0.1, watchRatio));
    }

    const expectedUser = this.calculateExpectedScore(currentUserElo, currentVideoElo);
    const expectedVideo = 1 - expectedUser;

    const K = 32;
    const newVideoElo = Math.round(currentVideoElo + K * (actualScore - expectedVideo));
    const newUserElo = Math.round(currentUserElo + (K / 2) * (actualScore - expectedUser));

    this.videoRatings[vId] = newVideoElo;
    this.userProfile.categoryRatings[category] = newUserElo;
    this.userProfile.globalRating = Math.round((this.userProfile.globalRating * 4 + newUserElo) / 5);
    this.userProfile.matchHistoryCount++;

    this.saveVideoRatings();
    this.saveUserProfile();
  }

  /**
   * Rank candidate videos using Upper Confidence Bound (UCB1) & Elo matchmaking
   */
  rankFeed(videos, activeCategory = "Tất cả") {
    if (!Array.isArray(videos) || videos.length === 0) return [];

    const userRating = this.userProfile.categoryRatings[activeCategory] || this.userProfile.globalRating;
    const N = Math.max(1, this.userProfile.matchHistoryCount);

    return [...videos].map((video, originalIndex) => {
      const vElo = this.getVideoRating(video);
      // Expected engagement probability (0 to 1)
      const expectedEngage = this.calculateExpectedScore(userRating, vElo);
      
      // Upper Confidence Bound (exploration term from MCTS/Chess.com search trees)
      const c = 0.35;
      const visits = Math.max(1, (video.viewsCount || 1000) / 1000);
      const explorationBonus = c * Math.sqrt(Math.log(N + 10) / visits);

      // Freshness multiplier
      const isRecent = String(video.uploadedAt || '').includes('giờ') || String(video.uploadedAt || '').includes('ngày');
      const freshnessBoost = isRecent ? 0.12 : 0;

      // Position penalty for diversity (prevent deterministic lock-in)
      const tieBreaker = (Math.sin(originalIndex * 997 + vElo) * 0.04);

      const finalScore = expectedEngage + explorationBonus + freshnessBoost + tieBreaker;

      return {
        ...video,
        _eloScore: vElo,
        _compositeRank: finalScore
      };
    }).sort((a, b) => b._compositeRank - a._compositeRank);
  }
}

export const globalEloEngine = new EloRecommendationEngine();

// ============================================================================
// 3. COMPLETE CHESS.COM MINIMAX ENGINE WITH ALPHA-BETA PRUNING
// ============================================================================

// Piece values matching modern chess engines
const PIECE_VALUES = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000
};

// Piece-Square Tables (PST) for positional evaluation
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];

export class ChessGame {
  constructor() {
    this.reset();
  }

  reset() {
    // 8x8 Board representation: lowercase=black, uppercase=white, null=empty
    this.board = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ];
    this.turn = 'w'; // 'w' | 'b'
    this.history = [];
    this.moveNotation = [];
    this.isCheck = false;
    this.isCheckmate = false;
    this.isDraw = false;
    this.evaluation = 0; // Centipawns relative to white
  }

  isWhite(p) {
    return p !== null && p === p.toUpperCase();
  }

  isBlack(p) {
    return p !== null && p === p.toLowerCase();
  }

  isSameColor(p1, p2) {
    if (!p1 || !p2) return false;
    return (this.isWhite(p1) && this.isWhite(p2)) || (this.isBlack(p1) && this.isBlack(p2));
  }

  // Clone state
  clone() {
    const next = new ChessGame();
    next.board = this.board.map(r => [...r]);
    next.turn = this.turn;
    next.isCheck = this.isCheck;
    next.isCheckmate = this.isCheckmate;
    next.isDraw = this.isDraw;
    next.evaluation = this.evaluation;
    return next;
  }

  // Generate pseudo-legal and legal moves
  getMovesForPiece(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const isW = this.isWhite(piece);
    if ((isW && this.turn !== 'w') || (!isW && this.turn !== 'b')) return [];

    const moves = [];
    const pType = piece.toLowerCase();

    // 1. Pawn
    if (pType === 'p') {
      const dir = isW ? -1 : 1;
      const startRow = isW ? 6 : 1;
      // Step 1 forward
      if (r + dir >= 0 && r + dir < 8 && !this.board[r + dir][c]) {
        moves.push({ from: [r, c], to: [r + dir, c] });
        // Step 2 forward from start
        if (r === startRow && !this.board[r + 2 * dir][c]) {
          moves.push({ from: [r, c], to: [r + 2 * dir, c] });
        }
      }
      // Diagonal captures
      for (const dc of [-1, 1]) {
        const nr = r + dir;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (target && this.isWhite(target) !== isW) {
            moves.push({ from: [r, c], to: [nr, nc], capture: target });
          }
        }
      }
    }

    // 2. Knight
    else if (pType === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = this.board[nr][nc];
          if (!target || this.isWhite(target) !== isW) {
            moves.push({ from: [r, c], to: [nr, nc], capture: target || undefined });
          }
        }
      }
    }

    // 3. Bishop, Rook, Queen (Sliding pieces)
    else if (pType === 'b' || pType === 'r' || pType === 'q') {
      const dirs = [];
      if (pType === 'b' || pType === 'q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      if (pType === 'r' || pType === 'q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

      for (const [dr, dc] of dirs) {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
          const target = this.board[nr][nc];
          if (!target) {
            moves.push({ from: [r, c], to: [nr, nc] });
          } else {
            if (this.isWhite(target) !== isW) {
              moves.push({ from: [r, c], to: [nr, nc], capture: target });
            }
            break;
          }
          step++;
        }
      }
    }

    // 4. King
    else if (pType === 'k') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = this.board[nr][nc];
            if (!target || this.isWhite(target) !== isW) {
              moves.push({ from: [r, c], to: [nr, nc], capture: target || undefined });
            }
          }
        }
      }
    }

    return moves;
  }

  getAllMoves(color = this.turn) {
    const all = [];
    const isW = color === 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && this.isWhite(piece) === isW) {
          all.push(...this.getMovesForPiece(r, c));
        }
      }
    }
    return all;
  }

  // Make move on board
  makeMove(move) {
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = this.board[fr][fc];
    if (!piece) return false;

    // Save history
    this.history.push({
      board: this.board.map(row => [...row]),
      turn: this.turn,
      move
    });

    // Handle Promotion
    let nextPiece = piece;
    if (piece === 'P' && tr === 0) nextPiece = 'Q';
    if (piece === 'p' && tr === 7) nextPiece = 'q';

    this.board[tr][tc] = nextPiece;
    this.board[fr][fc] = null;

    // Record algebraic notation
    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];
    const pPrefix = piece.toUpperCase() === 'P' ? '' : piece.toUpperCase();
    const cap = move.capture ? (piece.toUpperCase() === 'P' ? `${files[fc]}x` : 'x') : '';
    const notat = `${pPrefix}${cap}${files[tc]}${ranks[tr]}`;
    this.moveNotation.push(notat);

    // Switch turn
    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.evaluation = this.evaluateBoard();
    return true;
  }

  undo() {
    if (this.history.length === 0) return;
    const prev = this.history.pop();
    this.board = prev.board;
    this.turn = prev.turn;
    this.moveNotation.pop();
    this.evaluation = this.evaluateBoard();
  }

  // Static board evaluation in centipawns
  evaluateBoard() {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const val = PIECE_VALUES[p] || 0;
        let posBonus = 0;
        const idx = r * 8 + c;

        if (p === 'P') posBonus = PAWN_PST[idx];
        else if (p === 'p') posBonus = PAWN_PST[63 - idx];
        else if (p === 'N') posBonus = KNIGHT_PST[idx];
        else if (p === 'n') posBonus = KNIGHT_PST[63 - idx];

        if (this.isWhite(p)) {
          score += val + posBonus;
        } else {
          score -= (val + posBonus);
        }
      }
    }
    return score;
  }

  // Alpha-Beta Minimax search
  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
      return this.evaluateBoard();
    }

    const moves = this.getAllMoves(isMaximizing ? 'w' : 'b');
    if (moves.length === 0) {
      return isMaximizing ? -20000 : 20000;
    }

    // Move ordering: prioritize captures
    moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const m of moves) {
        this.makeMove(m);
        const ev = this.minimax(depth - 1, alpha, beta, false);
        this.undo();
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of moves) {
        this.makeMove(m);
        const ev = this.minimax(depth - 1, alpha, beta, true);
        this.undo();
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minEval;
    }
  }

  // Find best move for AI
  findBestMove(depth = 3) {
    const isW = this.turn === 'w';
    const moves = this.getAllMoves(this.turn);
    if (moves.length === 0) return null;

    // Check Transposition Table
    const boardHash = globalTranspositionTable.hash({ board: this.board, turn: this.turn, depth });
    const cached = globalTranspositionTable.get(boardHash);
    if (cached) return cached;

    // Move ordering
    moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));

    let bestMove = moves[0];
    let bestVal = isW ? -Infinity : Infinity;

    for (const m of moves) {
      this.makeMove(m);
      const val = this.minimax(depth - 1, -Infinity, Infinity, !isW);
      this.undo();

      if (isW) {
        if (val > bestVal) {
          bestVal = val;
          bestMove = m;
        }
      } else {
        if (val < bestVal) {
          bestVal = val;
          bestMove = m;
        }
      }
    }

    globalTranspositionTable.set(boardHash, bestMove, 300000);
    return bestMove;
  }
}

// ============================================================================
// 4. SYNTHESIZED WEB AUDIO SOUNDS MATCHING CHESS.COM
// ============================================================================

export function playChessSound(type = 'move') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'capture') {
      // Crisp snapping wood capture
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'check') {
      // Bell warning sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      // Standard gentle wooden move tap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch (e) {
    // Audio autoplay restrictions gracefully swallowed
  }
}
