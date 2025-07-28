import React from "react";
import type { Ship } from "../../types";
import "../../styles/GameBoard.css";

interface GameBoardProps {
  board: boolean[][]; // 10x10 grid - true if cell has been targeted
  ships: Ship[]; // Player's ships (only visible on own board)
  hits?: boolean[][]; // Hit positions (for opponent board)
  misses?: boolean[][]; // Miss positions (for opponent board)
  isOwnBoard: boolean; // Whether this is the player's own board or opponent's
  isInteractive: boolean; // Whether clicks are allowed
  currentTurn: boolean; // Whether it's this player's turn
  onCellClick?: (x: number, y: number) => void; // Callback for cell clicks
  className?: string;
}

function GameBoard({
  board,
  ships,
  hits,
  misses,
  isOwnBoard,
  isInteractive,
  currentTurn,
  onCellClick,
  className = "",
}: GameBoardProps): React.ReactElement {
  // Create a 10x10 grid
  const BOARD_SIZE = 10;

  // Debug logging
  console.log(
    `GameBoard render - isOwnBoard: ${isOwnBoard}, ships:`,
    ships,
    "hits:",
    hits,
    "misses:",
    misses
  );

  // Helper function to check if a cell contains a ship
  const hasShip = (x: number, y: number): boolean => {
    return ships.some((ship) =>
      ship.positions.some((pos) => pos.x === x && pos.y === y)
    );
  };

  // Helper function to check if a ship at this position is destroyed
  const isShipDestroyed = (x: number, y: number): boolean => {
    const ship = ships.find((ship) =>
      ship.positions.some((pos) => pos.x === x && pos.y === y)
    );
    return ship ? ship.isDestroyed : false;
  };

  // Helper function to get cell state
  const getCellState = (x: number, y: number): string => {
    const cellHasShip = hasShip(x, y);
    const shipDestroyed = isShipDestroyed(x, y);

    // For own board, always show ships first, then check for attacks
    if (isOwnBoard && cellHasShip) {
      // Check if this cell has been attacked (using hits/misses data)
      const isHit = hits && hits[x] && hits[x][y];
      const isMiss = misses && misses[x] && misses[x][y];

      if (isHit) {
        return shipDestroyed ? "sunk" : "hit";
      } else if (isMiss) {
        return "miss"; // This shouldn't happen for ship cells, but just in case
      } else {
        return "ship"; // Show ship if not attacked
      }
    }

    // For own board non-ship cells, check if attacked
    if (isOwnBoard) {
      const isHit = hits && hits[x] && hits[x][y];
      const isMiss = misses && misses[x] && misses[x][y];

      if (isHit) {
        return "hit"; // This shouldn't happen for non-ship cells, but just in case
      } else if (isMiss) {
        return "miss";
      }
    }

    // For opponent board, use hits/misses data
    if (!isOwnBoard) {
      if (hits && hits[x] && hits[x][y]) {
        // This is a hit - we don't know if ship is destroyed on opponent board
        return "hit";
      }

      if (misses && misses[x] && misses[x][y]) {
        return "miss";
      }
    }

    // Fallback to board-based logic
    const isTargeted = board[x] && board[x][y];
    if (isTargeted) {
      if (cellHasShip) {
        return shipDestroyed ? "sunk" : "hit";
      } else {
        return "miss";
      }
    }

    // Empty cell
    return "empty";
  };

  // Helper function to get cell CSS classes
  const getCellClasses = (x: number, y: number): string => {
    const state = getCellState(x, y);
    const baseClasses = "board-cell";

    let stateClasses = "";
    switch (state) {
      case "ship":
        stateClasses = "ship";
        break;
      case "hit":
        stateClasses = "hit";
        break;
      case "miss":
        stateClasses = "miss";
        break;
      case "sunk":
        stateClasses = "sunk";
        break;
      default:
        stateClasses = "";
    }

    // Add interactive classes
    const interactiveClasses =
      isInteractive && currentTurn && !board[x]?.[y]
        ? "cursor-pointer hover:bg-blue-400/30"
        : "";

    return `${baseClasses} ${stateClasses} ${interactiveClasses}`.trim();
  };

  // Handle cell click
  const handleCellClick = (x: number, y: number): void => {
    if (!isInteractive || !currentTurn || !onCellClick) return;

    // Don't allow clicking on already targeted cells
    if (board[x] && board[x][y]) return;

    onCellClick(x, y);
  };

  // Generate column labels (A-J)
  const columnLabels = Array.from({ length: BOARD_SIZE }, (_, i) =>
    String.fromCharCode(65 + i)
  );

  // Generate row labels (1-10)
  const rowLabels = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);

  return (
    <div className={`game-board-container ${className}`}>
      {/* Board Title */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {isOwnBoard ? "Your Board" : "Opponent's Board"}
        </h3>
        {!isOwnBoard && (
          <p className="text-sm text-blue-200">
            {currentTurn ? "Your turn - Click to fire!" : "Opponent's turn"}
          </p>
        )}
      </div>

      {/* Game Board */}
      <div className="game-board-wrapper">
        {/* Column Labels */}
        <div className="board-labels-top">
          <div className="board-corner"></div>
          {columnLabels.map((label) => (
            <div key={label} className="board-label">
              {label}
            </div>
          ))}
        </div>

        {/* Board with Row Labels */}
        <div className="board-with-rows">
          {Array.from({ length: BOARD_SIZE }, (_, row) => (
            <div key={row} className="board-row-container">
              {/* Row Label */}
              <div className="board-label board-row-label">
                {rowLabels[row]}
              </div>

              {/* Board Row */}
              <div className="board-row">
                {Array.from({ length: BOARD_SIZE }, (_, col) => (
                  <button
                    key={`${row}-${col}`}
                    className={getCellClasses(row, col)}
                    onClick={() => handleCellClick(row, col)}
                    disabled={!isInteractive || !currentTurn}
                    aria-label={`Cell ${columnLabels[col]}${rowLabels[row]}`}
                  >
                    {/* Cell content based on state */}
                    {(() => {
                      const state = getCellState(row, col);
                      switch (state) {
                        case "hit":
                          return <span className="cell-icon">💥</span>;
                        case "miss":
                          return <span className="cell-icon">💧</span>;
                        case "sunk":
                          return <span className="cell-icon">💀</span>;
                        case "ship":
                          return <span className="cell-icon">🚢</span>;
                        default:
                          return null;
                      }
                    })()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board Legend */}
      <div className="board-legend mt-4">
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          {isOwnBoard && (
            <div className="legend-item">
              <span className="legend-icon">🚢</span>
              <span className="text-blue-200">Your Ships</span>
            </div>
          )}
          <div className="legend-item">
            <span className="legend-icon">💥</span>
            <span className="text-red-200">Hit</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">💧</span>
            <span className="text-blue-200">Miss</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">💀</span>
            <span className="text-gray-200">Sunk</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameBoard;
