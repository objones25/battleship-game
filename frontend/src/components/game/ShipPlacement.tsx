import React, { useState, useCallback } from "react";
import type { Ship } from "../../types";
import "../../styles/ShipPlacement.css";

interface ShipPlacementProps {
  onShipsPlaced: (ships: Ship[]) => void;
  onReady: () => void;
  className?: string;
}

interface ShipTemplate {
  name: string;
  length: number;
  count: number;
}

interface PlacementShip {
  id: string;
  name: string;
  length: number;
  positions: { x: number; y: number }[];
  isHorizontal: boolean;
  isPlaced: boolean;
}

const SHIP_TEMPLATES: ShipTemplate[] = [
  { name: "Carrier", length: 5, count: 1 },
  { name: "Battleship", length: 4, count: 1 },
  { name: "Cruiser", length: 3, count: 1 },
  { name: "Submarine", length: 3, count: 1 },
  { name: "Destroyer", length: 2, count: 1 },
];

function ShipPlacement({
  onShipsPlaced,
  onReady,
  className = "",
}: ShipPlacementProps): React.ReactElement {
  const BOARD_SIZE = 10;

  // Initialize ships from templates
  const initializeShips = (): PlacementShip[] => {
    const ships: PlacementShip[] = [];
    SHIP_TEMPLATES.forEach((template, templateIndex) => {
      for (let i = 0; i < template.count; i++) {
        ships.push({
          id: `${template.name}-${templateIndex}-${i}`,
          name: template.name,
          length: template.length,
          positions: [],
          isHorizontal: true,
          isPlaced: false,
        });
      }
    });
    return ships;
  };

  const [ships, setShips] = useState<PlacementShip[]>(initializeShips());
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Get board state for rendering
  const getBoardState = useCallback(() => {
    const board: (string | null)[][] = Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null));

    ships.forEach((ship) => {
      if (ship.isPlaced) {
        ship.positions.forEach((pos) => {
          board[pos.x][pos.y] = ship.id;
        });
      }
    });

    return board;
  }, [ships]);

  // Check if ship placement is valid
  const isValidPlacement = useCallback(
    (ship: PlacementShip, startX: number, startY: number): boolean => {
      const positions: { x: number; y: number }[] = [];

      // Generate positions for the ship
      for (let i = 0; i < ship.length; i++) {
        const x = ship.isHorizontal ? startX : startX + i;
        const y = ship.isHorizontal ? startY + i : startY;

        // Check bounds
        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
          return false;
        }

        positions.push({ x, y });
      }

      // Check for overlaps with other ships
      const board = getBoardState();
      return positions.every((pos) => {
        const cellContent = board[pos.x][pos.y];
        return cellContent === null || cellContent === ship.id;
      });
    },
    [getBoardState]
  );

  // Place ship on the board
  const placeShip = useCallback(
    (shipId: string, startX: number, startY: number): boolean => {
      const ship = ships.find((s) => s.id === shipId);
      if (!ship) return false;

      if (!isValidPlacement(ship, startX, startY)) return false;

      const positions: { x: number; y: number }[] = [];
      for (let i = 0; i < ship.length; i++) {
        const x = ship.isHorizontal ? startX : startX + i;
        const y = ship.isHorizontal ? startY + i : startY;
        positions.push({ x, y });
      }

      setShips((prevShips) =>
        prevShips.map((s) =>
          s.id === shipId ? { ...s, positions, isPlaced: true } : s
        )
      );

      return true;
    },
    [ships, isValidPlacement]
  );

  // Remove ship from board
  const removeShip = useCallback((shipId: string) => {
    setShips((prevShips) =>
      prevShips.map((s) =>
        s.id === shipId ? { ...s, positions: [], isPlaced: false } : s
      )
    );
  }, []);

  // Rotate ship
  const rotateShip = useCallback(
    (shipId: string) => {
      setShips((prevShips) =>
        prevShips.map((s) => {
          if (s.id === shipId) {
            const newShip = { ...s, isHorizontal: !s.isHorizontal };

            // If ship is placed, check if rotation is valid
            if (s.isPlaced && s.positions.length > 0) {
              const startPos = s.positions[0];
              if (!isValidPlacement(newShip, startPos.x, startPos.y)) {
                // If rotation is invalid, remove ship from board
                return { ...newShip, positions: [], isPlaced: false };
              } else {
                // Update positions for new orientation
                const positions: { x: number; y: number }[] = [];
                for (let i = 0; i < newShip.length; i++) {
                  const x = newShip.isHorizontal ? startPos.x : startPos.x + i;
                  const y = newShip.isHorizontal ? startPos.y + i : startPos.y;
                  positions.push({ x, y });
                }
                return { ...newShip, positions };
              }
            }

            return newShip;
          }
          return s;
        })
      );
    },
    [isValidPlacement]
  );

  // Handle cell click
  const handleCellClick = (x: number, y: number) => {
    if (selectedShipId) {
      const success = placeShip(selectedShipId, x, y);
      if (success) {
        setSelectedShipId(null);
      }
    } else {
      // Check if there's a ship at this position to select/remove
      const board = getBoardState();
      const shipId = board[x][y];
      if (shipId) {
        removeShip(shipId);
      }
    }
  };

  // Handle ship selection from dock
  const handleShipSelect = (shipId: string) => {
    const ship = ships.find((s) => s.id === shipId);
    if (ship && !ship.isPlaced) {
      setSelectedShipId(selectedShipId === shipId ? null : shipId);
    }
  };

  // Handle ship rotation from dock
  const handleShipRotate = (e: React.MouseEvent, shipId: string) => {
    e.stopPropagation();
    rotateShip(shipId);
  };

  // Get preview positions for hover
  const getPreviewPositions = (
    x: number,
    y: number
  ): { x: number; y: number }[] => {
    if (!selectedShipId) return [];

    const ship = ships.find((s) => s.id === selectedShipId);
    if (!ship) return [];

    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < ship.length; i++) {
      const posX = ship.isHorizontal ? x : x + i;
      const posY = ship.isHorizontal ? y + i : y;
      positions.push({ x: posX, y: posY });
    }

    return positions;
  };

  // Check if all ships are placed
  const allShipsPlaced = ships.every((ship) => ship.isPlaced);

  // Handle ready button
  const handleReady = () => {
    if (allShipsPlaced) {
      const gameShips: Ship[] = ships.map((ship) => ({
        id: ship.id, // Include the required id field
        name: ship.name,
        length: ship.length,
        positions: ship.positions,
        isDestroyed: false,
      }));

      onShipsPlaced(gameShips);
      onReady();
    }
  };

  // Handle random placement
  const handleRandomPlacement = () => {
    const newShips = [...ships];

    // Clear all ships first
    newShips.forEach((ship) => {
      ship.positions = [];
      ship.isPlaced = false;
    });

    // Try to place each ship randomly
    newShips.forEach((ship) => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        ship.isHorizontal = Math.random() < 0.5;
        const maxX = ship.isHorizontal ? BOARD_SIZE : BOARD_SIZE - ship.length;
        const maxY = ship.isHorizontal ? BOARD_SIZE - ship.length : BOARD_SIZE;

        const startX = Math.floor(Math.random() * maxX);
        const startY = Math.floor(Math.random() * maxY);

        if (isValidPlacement(ship, startX, startY)) {
          const positions: { x: number; y: number }[] = [];
          for (let i = 0; i < ship.length; i++) {
            const x = ship.isHorizontal ? startX : startX + i;
            const y = ship.isHorizontal ? startY + i : startY;
            positions.push({ x, y });
          }
          ship.positions = positions;
          ship.isPlaced = true;
          placed = true;
        }
        attempts++;
      }
    });

    setShips(newShips);
    setSelectedShipId(null);
  };

  // Handle clear all
  const handleClearAll = () => {
    setShips(initializeShips());
    setSelectedShipId(null);
  };

  const board = getBoardState();
  const previewPositions = hoveredCell
    ? getPreviewPositions(hoveredCell.x, hoveredCell.y)
    : [];
  const isValidPreview =
    selectedShipId && hoveredCell
      ? isValidPlacement(
          ships.find((s) => s.id === selectedShipId)!,
          hoveredCell.x,
          hoveredCell.y
        )
      : false;

  return (
    <div className={`ship-placement-container ${className}`}>
      <div className="ship-placement-header">
        <h2 className="text-2xl font-bold text-white mb-2">Place Your Ships</h2>
        <p className="text-blue-200 mb-4">
          Click on a ship below, then click on the board to place it.
          Right-click or use the rotate button to change orientation.
        </p>
      </div>

      <div className="ship-placement-content">
        {/* Game Board */}
        <div className="placement-board-container">
          <div className="placement-board-wrapper">
            {/* Column Labels */}
            <div className="board-labels-top">
              <div className="board-corner"></div>
              {Array.from({ length: BOARD_SIZE }, (_, i) => (
                <div key={i} className="board-label">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>

            {/* Board with Row Labels */}
            <div className="board-with-rows">
              {Array.from({ length: BOARD_SIZE }, (_, row) => (
                <div key={row} className="board-row-container">
                  {/* Row Label */}
                  <div className="board-label board-row-label">{row + 1}</div>

                  {/* Board Row */}
                  <div className="board-row">
                    {Array.from({ length: BOARD_SIZE }, (_, col) => {
                      const cellShipId = board[row][col];
                      const isPreview = previewPositions.some(
                        (pos) => pos.x === row && pos.y === col
                      );
                      const isSelected =
                        selectedShipId && cellShipId === selectedShipId;

                      let cellClass = "placement-cell";
                      if (cellShipId) {
                        cellClass += " has-ship";
                        if (isSelected) cellClass += " selected";
                      }
                      if (isPreview) {
                        cellClass += isValidPreview
                          ? " preview-valid"
                          : " preview-invalid";
                      }

                      return (
                        <button
                          key={`${row}-${col}`}
                          className={cellClass}
                          onClick={() => handleCellClick(row, col)}
                          onMouseEnter={() =>
                            setHoveredCell({ x: row, y: col })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          aria-label={`Cell ${String.fromCharCode(65 + col)}${
                            row + 1
                          }`}
                        >
                          {cellShipId && (
                            <span className="ship-indicator">🚢</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ship Dock */}
        <div className="ship-dock">
          <h3 className="text-lg font-semibold text-white mb-4">Ships</h3>

          <div className="ship-list">
            {ships.map((ship) => (
              <div
                key={ship.id}
                className={`ship-item ${ship.isPlaced ? "placed" : ""} ${
                  selectedShipId === ship.id ? "selected" : ""
                }`}
                onClick={() => handleShipSelect(ship.id)}
              >
                <div className="ship-info">
                  <div className="ship-name">{ship.name}</div>
                  <div className="ship-length">Length: {ship.length}</div>
                </div>

                <div className="ship-visual">
                  {Array.from({ length: ship.length }, (_, i) => (
                    <div
                      key={i}
                      className={`ship-segment ${
                        ship.isHorizontal ? "horizontal" : "vertical"
                      }`}
                    />
                  ))}
                </div>

                <button
                  className="ship-rotate-btn"
                  onClick={(e) => handleShipRotate(e, ship.id)}
                  title="Rotate ship"
                >
                  🔄
                </button>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="placement-controls">
            <button className="btn-secondary" onClick={handleRandomPlacement}>
              Random Placement
            </button>

            <button className="btn-secondary" onClick={handleClearAll}>
              Clear All
            </button>

            <button
              className={`btn-primary ${!allShipsPlaced ? "disabled" : ""}`}
              onClick={handleReady}
              disabled={!allShipsPlaced}
            >
              Ready to Battle!
            </button>
          </div>

          {/* Status */}
          <div className="placement-status">
            <div className="text-sm text-blue-200">
              Ships placed: {ships.filter((s) => s.isPlaced).length} /{" "}
              {ships.length}
            </div>
            {!allShipsPlaced && (
              <div className="text-sm text-yellow-300">
                Place all ships to continue
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShipPlacement;
