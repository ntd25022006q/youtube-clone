import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Minimize2, Maximize2, RotateCcw, Volume2, VolumeX, RefreshCw, Cpu, Trophy, User } from "lucide-react";
import { ChessGame, playChessSound, globalEloEngine } from "../utils/chessAlgorithms";
import "./chessModal.css";

// ============================================================================
// CHESS PIECE VECTOR ICONS (High-fidelity SVGs)
// ============================================================================
const PieceSvg = ({ piece }) => {
  if (!piece) return null;
  const isWhite = piece === piece.toUpperCase();
  const type = piece.toLowerCase();

  const fill = isWhite ? "#ffffff" : "#262421";
  const stroke = isWhite ? "#111111" : "#ffffff";
  const strokeWidth = "1.5";

  switch (type) {
    case 'p': // Pawn
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'n': // Knight
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <path
            d="m 22,10 c 10.5,1 16.5,8 16,29 H 15 c 0,-9 10,-6.5 8,-21 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <path
            d="m 24,18 c 0.38,2.91 -5.55,7.37 -8,9 -3,2 -2.82,4.34 -5,4 -1.04,-0.94 -1.12,-2.72 0,-4 1,-1 2.5,-1 3.5,-2.5 1,-1.5 1.5,-2 1.5,-3.5 0,-1.5 -1.5,-2.5 -1,-4 0.5,-1.5 2.5,-3 4,-3.5 1.5,-0.5 4,1 5,4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case 'b': // Bishop
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
            <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,23.5 C 27.5,21 29,18 27.5,15.5 C 26,13 24.5,12 22.5,10 C 20.5,12 19,13 17.5,15.5 C 16,18 17.5,21 17.5,23.5 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
            <path d="M 22.5,8 A 1.5,1.5 0 0 1 21,9.5 A 1.5,1.5 0 0 1 19.5,8 A 1.5,1.5 0 0 1 21,6.5 A 1.5,1.5 0 0 1 22.5,8 z" />
          </g>
          <path d="M 17.5,26 H 27.5 M 15,30 H 30 M 22.5,15.5 V 20 M 20,17.5 H 25" stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'r': // Rook
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 12,14 L 33,14 L 31,32 L 14,32 z" />
          </g>
        </svg>
      );
    case 'q': // Queen
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 11.5,36.5 33.5,36.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z" />
            <circle cx="6.5" cy="12.5" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="7.5" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="38.5" cy="12.5" r="2" />
          </g>
        </svg>
      );
    case 'k': // King
      return (
        <svg viewBox="0 0 45 45" className="piece-svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6 M 20,8 L 25,8" stroke={stroke} strokeWidth={strokeWidth} />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 24,11.5 21,11.5 22.5,25 z" />
            <path d="M 12.5,37 C 15,40.5 30,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 35.5,13.5 29,16.5 22.5,21 C 16,16.5 9.5,13.5 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 z" />
            <path d="M 11.5,30 C 17,27 28,27 33.5,30" />
            <path d="M 12,33.5 C 18,31 27,31 33,33.5" />
          </g>
        </svg>
      );
    default:
      return null;
  }
};

export const ChessModal = ({ isOpen, onClose, isMinimized, onToggleMinimize }) => {
  const [game, setGame] = useState(() => new ChessGame());
  const [selectedSquare, setSelectedSquare] = useState(null); // [r, c]
  const [legalMoves, setLegalMoves] = useState([]); // array of moves from selectedSquare
  const [lastMove, setLastMove] = useState(null); // { from, to }
  const [botThinking, setBotThinking] = useState(false);
  const [botDepth, setBotDepth] = useState(3); // depth 1 to 4
  const [botElo, setBotElo] = useState(1600); // 800, 1200, 1600, 2000
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Lượt của bạn (Quân Trắng)");

  const historyEndRef = useRef(null);

  // Auto-scroll move history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [game.moveNotation]);

  // Play audio safely
  const triggerSound = (type) => {
    if (soundEnabled) {
      playChessSound(type);
    }
  };

  // Bot move trigger
  const makeBotMove = () => {
    if (game.turn !== 'b') return;
    setBotThinking(true);
    setStatusMessage(`ChessBot (${botElo} Elo) đang suy nghĩ nước đi...`);

    // Natural bot delay (300ms - 700ms)
    setTimeout(() => {
      const bestMove = game.findBestMove(botDepth);
      if (bestMove) {
        const isCap = !!bestMove.capture;
        game.makeMove(bestMove);
        setLastMove(bestMove);
        triggerSound(isCap ? 'capture' : 'move');

        // Check if user is in check
        const userMoves = game.getAllMoves('w');
        if (userMoves.length === 0) {
          setStatusMessage("Chiếu hết! Bot đã thắng.");
          triggerSound('check');
        } else {
          setStatusMessage("Lượt của bạn (Quân Trắng)");
        }
      } else {
        setStatusMessage("Hòa cờ! Hết nước đi hợp lệ.");
      }
      setBotThinking(false);
      setGame(game.clone());
    }, 450);
  };

  // Handle Square Click
  const handleSquareClick = (r, c) => {
    if (botThinking || game.turn !== 'w') return;

    const piece = game.board[r][c];

    // Case 1: An existing square is selected, check if clicked square is a target
    if (selectedSquare) {
      const [sr, sc] = selectedSquare;
      const targetMove = legalMoves.find(m => m.to[0] === r && m.to[1] === c);

      if (targetMove) {
        // Execute move
        const isCap = !!targetMove.capture;
        game.makeMove(targetMove);
        setLastMove(targetMove);
        setSelectedSquare(null);
        setLegalMoves([]);
        triggerSound(isCap ? 'capture' : 'move');

        // Check response
        const botMoves = game.getAllMoves('b');
        if (botMoves.length === 0) {
          setStatusMessage("Chiếu hết! Bạn đã chiến thắng! 🏆");
          triggerSound('check');
          globalEloEngine.recordEngagement({ id: "chess_win", category: "Cờ vua / Chess" }, "watch", 1.0);
        } else {
          setStatusMessage(`Bot đang tính toán...`);
          setGame(game.clone());
          // Trigger bot turn
          setTimeout(makeBotMove, 200);
          return;
        }
        setGame(game.clone());
        return;
      }
    }

    // Case 2: Select friendly white piece
    if (piece && game.isWhite(piece)) {
      setSelectedSquare([r, c]);
      const moves = game.getMovesForPiece(r, c);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Reset Game
  const handleNewGame = () => {
    const nextGame = new ChessGame();
    setGame(nextGame);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setBotThinking(false);
    setStatusMessage("Ván mới đã bắt đầu! Lượt của bạn (Trắng)");
    triggerSound('move');
  };

  // Undo Move (undoes bot's move and user's move)
  const handleUndo = () => {
    if (botThinking) return;
    if (game.history.length >= 2) {
      game.undo(); // Undo black
      game.undo(); // Undo white
      setLastMove(game.history[game.history.length - 1]?.move || null);
      setSelectedSquare(null);
      setLegalMoves([]);
      setStatusMessage("Đã đi lại nước cờ.");
      setGame(game.clone());
      triggerSound('move');
    }
  };

  // Bot Elo Level selector
  const handleDifficultyChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setBotElo(val);
    if (val === 800) setBotDepth(1);
    else if (val === 1200) setBotDepth(2);
    else if (val === 1600) setBotDepth(3);
    else setBotDepth(4);
  };

  // Calculate Evaluation Bar percentages
  const { whiteHeightPct, evalText } = useMemo(() => {
    const ev = game.evaluation;
    // Map centipawns to 0-100% win chance using standard logistic/atan formula
    const winProb = 50 + (50 * (2 / Math.PI) * Math.atan(ev / 350));
    const clamped = Math.max(5, Math.min(95, winProb));
    const scoreFormatted = ev === 0 ? "0.0" : (ev > 0 ? `+${(ev / 100).toFixed(1)}` : `${(ev / 100).toFixed(1)}`);
    return {
      whiteHeightPct: clamped,
      evalText: scoreFormatted
    };
  }, [game.evaluation]);

  // Group Move notation into numbered turns
  const formattedMoves = useMemo(() => {
    const rows = [];
    const notations = game.moveNotation;
    for (let i = 0; i < notations.length; i += 2) {
      rows.push({
        num: Math.floor(i / 2) + 1,
        white: notations[i],
        black: notations[i + 1] || ""
      });
    }
    return rows;
  }, [game.moveNotation]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // RENDER: MINIMIZED FLOATING PIP MODE (Play while watching YouTube)
  // --------------------------------------------------------------------------
  if (isMinimized) {
    return (
      <div className="chess-floating-pip" role="dialog" aria-label="Cờ vua thu nhỏ">
        <div className="chess-pip-header">
          <div className="chess-pip-title">
            <span>♟️ Cờ vua (vs Bot {botElo})</span>
          </div>
          <div className="chess-header-actions">
            <button className="chess-icon-btn" onClick={onToggleMinimize} title="Mở rộng">
              <Maximize2 size={16} />
            </button>
            <button className="chess-icon-btn" onClick={onClose} title="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="chess-pip-board-container">
          <div className="chess-pip-board">
            {game.board.map((row, r) =>
              row.map((piece, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                const isTarget = legalMoves.some(m => m.to[0] === r && m.to[1] === c);

                return (
                  <div
                    key={`pip_${r}_${c}`}
                    className={`chess-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSquareClick(r, c)}
                  >
                    {piece && (
                      <div className="chess-piece">
                        <PieceSvg piece={piece} />
                      </div>
                    )}
                    {isTarget && <div className="chess-move-dot" />}
                  </div>
                );
              })
            )}
          </div>
          <div className="chess-pip-info">
            <span>{statusMessage}</span>
            <span style={{ fontWeight: 700, color: game.evaluation >= 0 ? "#81b64c" : "#e02424" }}>
              {evalText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: FULL DIALOG MODAL MODE
  // --------------------------------------------------------------------------
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="chess-modal-overlay" onClick={onClose}>
      <div className="chess-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chess-modal-header">
          <div className="chess-header-left">
            <div className="chess-logo-badge">
              <svg viewBox="0 0 24 24" className="chess-logo-icon">
                <path d="M19 22H5V20H19V22M17 10C15.58 10 14.26 10.77 13.55 12H13V7H16V5H13V2H11V5H8V7H11V16.74L8 18.24V14H6V20H18V13.88C18.65 13.55 19.18 13.06 19.55 12.44C19.84 11.97 20 11.42 20 10.84C20 9.83 19.19 9 18.17 9C17.7 9 17.27 9.17 16.94 9.47L17 10Z" />
              </svg>
              <span>Chess.com AI</span>
            </div>
            <span className="chess-header-title">Trận đấu Cờ vua Đỉnh cao & Thuật toán Minimax</span>
          </div>
          <div className="chess-header-actions">
            <button className="chess-icon-btn" onClick={() => setSoundEnabled(!soundEnabled)} title="Bật/Tắt âm thanh">
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="chess-icon-btn" onClick={onToggleMinimize} title="Thu nhỏ (Chơi khi xem video)">
              <Minimize2 size={18} />
            </button>
            <button className="chess-icon-btn" onClick={onClose} title="Đóng">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="chess-modal-body">
          {/* Board Section */}
          <div className="chess-board-section">
            {/* Dynamic Evaluation Bar */}
            <div className="chess-eval-bar-wrapper" title={`Lượng giá thế trận: ${evalText}`}>
              <div
                className="chess-eval-black"
                style={{ height: `${100 - whiteHeightPct}%` }}
              >
                {whiteHeightPct <= 50 && (
                  <span className="chess-eval-score-text top">{evalText}</span>
                )}
              </div>
              <div
                className="chess-eval-white"
                style={{ height: `${whiteHeightPct}%` }}
              >
                {whiteHeightPct > 50 && (
                  <span className="chess-eval-score-text bottom">{evalText}</span>
                )}
              </div>
            </div>

            {/* 8x8 Chessboard */}
            <div className="chess-board">
              {game.board.map((row, r) =>
                row.map((piece, c) => {
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                  const isLastMoveFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c;
                  const isLastMoveTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c;
                  const isLastMove = isLastMoveFrom || isLastMoveTo;

                  const targetMove = legalMoves.find(m => m.to[0] === r && m.to[1] === c);
                  const isTarget = !!targetMove;
                  const isCapture = isTarget && !!targetMove.capture;

                  return (
                    <div
                      key={`sq_${r}_${c}`}
                      className={`chess-square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isLastMove ? (isLight ? "last-move-light" : "last-move-dark") : ""}`}
                      onClick={() => handleSquareClick(r, c)}
                    >
                      {/* Square Coordinate Labels */}
                      {r === 7 && <span className="chess-coord-file">{files[c]}</span>}
                      {c === 0 && <span className="chess-coord-rank">{ranks[r]}</span>}

                      {/* Piece Icon */}
                      {piece && (
                        <div className="chess-piece">
                          <PieceSvg piece={piece} />
                        </div>
                      )}

                      {/* Move indicators */}
                      {isTarget && !isCapture && <div className="chess-move-dot" />}
                      {isCapture && <div className="chess-capture-ring" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sidebar / Engine Details */}
          <div className="chess-sidebar">
            {/* Bot Opponent Card */}
            <div className="chess-player-card">
              <div className="chess-player-left">
                <Cpu size={28} color="#81b64c" />
                <div>
                  <div className="chess-player-name">ChessBot (Đen)</div>
                  <div className="chess-player-elo">Elo {botElo} • Minimax</div>
                </div>
              </div>
              {botThinking && (
                <div className="chess-thinking-badge">
                  <span>Suy nghĩ...</span>
                </div>
              )}
            </div>

            {/* Status Banner */}
            <div className={`chess-status-banner ${game.isCheck ? "check" : ""}`}>
              {statusMessage}
            </div>

            {/* Difficulty Selector */}
            <select
              className="chess-diff-select"
              value={botElo}
              onChange={handleDifficultyChange}
              disabled={botThinking}
            >
              <option value="800">🥉 Tân thủ (Elo 800 - Minimax D1)</option>
              <option value="1200">🥈 Nghiệp dư (Elo 1200 - Minimax D2)</option>
              <option value="1600">🥇 Kiện tướng (Elo 1600 - Alpha-Beta D3)</option>
              <option value="2000">👑 Grandmaster (Elo 2000 - Alpha-Beta D4)</option>
            </select>

            {/* Move History Table */}
            <div className="chess-history-container">
              {formattedMoves.length === 0 ? (
                <div style={{ color: "#777", textAlign: "center", padding: "20px 0" }}>
                  Chưa có nước đi nào. Hãy bắt đầu ván cờ!
                </div>
              ) : (
                formattedMoves.map((item) => (
                  <div key={`h_${item.num}`} className="chess-history-row">
                    <span className="chess-history-num">{item.num}.</span>
                    <span className={`chess-history-move ${!item.black ? "active" : ""}`}>
                      {item.white}
                    </span>
                    <span className={`chess-history-move ${item.black ? "active" : ""}`}>
                      {item.black}
                    </span>
                  </div>
                ))
              )}
              <div ref={historyEndRef} />
            </div>

            {/* Player Card */}
            <div className="chess-player-card">
              <div className="chess-player-left">
                <User size={28} color="#f1f1f1" />
                <div>
                  <div className="chess-player-name">Bạn (Trắng)</div>
                  <div className="chess-player-elo">Đang chơi • Điểm: {evalText}</div>
                </div>
              </div>
              <Trophy size={18} color="#ffd700" />
            </div>

            {/* Action Buttons */}
            <div className="chess-controls-grid">
              <button className="chess-btn-secondary" onClick={handleUndo} title="Đi lại">
                <RotateCcw size={14} />
                <span>Đi lại</span>
              </button>
              <button className="chess-btn-secondary" onClick={() => setFlipped(!flipped)} title="Đổi màu">
                <RefreshCw size={14} />
                <span>Lật cờ</span>
              </button>
              <button className="chess-btn-secondary" onClick={onToggleMinimize} title="Chơi khi xem video">
                <Minimize2 size={14} />
                <span>Thu nhỏ</span>
              </button>
              <button className="chess-btn-primary" onClick={handleNewGame}>
                <span>Ván mới (Chơi lại)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessModal;
