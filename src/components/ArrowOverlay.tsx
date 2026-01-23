import React, { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import type { Coord } from "../lib/types";

export type Arrow = {
  from: Coord;
  to: Coord;
  nth: number;
};

const SQUARE_SIZE = 50;
const GRID_SIZE = 8;
const BOARD_PX = SQUARE_SIZE * GRID_SIZE;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function arrowAlpha(nth: number) {
  const clamped = clamp(nth, 1, 5);
  return 0.85 - (clamped - 1) * 0.12;
}

function centerOfSquare(coord: Coord) {
  const [row, col] = coord;
  return {
    x: col * SQUARE_SIZE + SQUARE_SIZE / 2,
    y: row * SQUARE_SIZE + SQUARE_SIZE / 2,
  };
}

function drawArrow(graphics: Graphics, from: Coord, to: Coord, nth: number) {
  const fromPt = centerOfSquare(from);
  const toPt = centerOfSquare(to);
  const dx = toPt.x - fromPt.x;
  const dy = toPt.y - fromPt.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;

  const alpha = arrowAlpha(nth);
  const color = 0x111827;
  const lineWidth = 6;
  const headLength = 14;
  const headWidth = 12;

  const dirX = dx / dist;
  const dirY = dy / dist;

  const isKnight = Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]) === 3;

  graphics.lineStyle(lineWidth, color, alpha, 0.5);

  if (isKnight) {
    const rowDelta = to[0] - from[0];
    const colDelta = to[1] - from[1];
    let corner: { x: number; y: number };

    if (Math.abs(rowDelta) === 2) {
      corner = centerOfSquare([from[0] + Math.sign(rowDelta) * 2, from[1]]);
    } else {
      corner = centerOfSquare([from[0], from[1] + Math.sign(colDelta) * 2]);
    }

    const endVecX = toPt.x - corner.x;
    const endVecY = toPt.y - corner.y;
    const endDist = Math.hypot(endVecX, endVecY) || 1;
    const endDirX = endVecX / endDist;
    const endDirY = endVecY / endDist;

    graphics.moveTo(fromPt.x, fromPt.y);
    graphics.lineTo(corner.x, corner.y);
    graphics.lineTo(toPt.x - endDirX * headLength, toPt.y - endDirY * headLength);

    const leftX = -endDirY;
    const leftY = endDirX;
    graphics.beginFill(color, alpha);
    graphics.moveTo(toPt.x, toPt.y);
    graphics.lineTo(
      toPt.x - endDirX * headLength + leftX * (headWidth / 2),
      toPt.y - endDirY * headLength + leftY * (headWidth / 2)
    );
    graphics.lineTo(
      toPt.x - endDirX * headLength - leftX * (headWidth / 2),
      toPt.y - endDirY * headLength - leftY * (headWidth / 2)
    );
    graphics.lineTo(toPt.x, toPt.y);
    graphics.endFill();
    return;
  }

  graphics.moveTo(fromPt.x, fromPt.y);
  graphics.lineTo(toPt.x - dirX * headLength, toPt.y - dirY * headLength);

  const leftX = -dirY;
  const leftY = dirX;
  graphics.beginFill(color, alpha);
  graphics.moveTo(toPt.x, toPt.y);
  graphics.lineTo(
    toPt.x - dirX * headLength + leftX * (headWidth / 2),
    toPt.y - dirY * headLength + leftY * (headWidth / 2)
  );
  graphics.lineTo(
    toPt.x - dirX * headLength - leftX * (headWidth / 2),
    toPt.y - dirY * headLength - leftY * (headWidth / 2)
  );
  graphics.lineTo(toPt.x, toPt.y);
  graphics.endFill();
}

type ArrowOverlayProps = {
  arrows?: Arrow[];
};

export function ArrowOverlay({ arrows = [] }: ArrowOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const app = new Application();
    appRef.current = app;
    let mounted = true;
    void app
      .init({
        width: BOARD_PX,
        height: BOARD_PX,
        backgroundAlpha: 0,
        antialias: true,
      })
      .then(() => {
        if (!mounted || !containerRef.current) return;
        containerRef.current.appendChild(app.canvas as HTMLCanvasElement);
      });

    return () => {
      mounted = false;
      if (app.renderer) {
        app.destroy(true, { children: true });
      } else {
        app.stage?.removeChildren();
      }
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    if (!app || !app.stage) return;
    app.stage.removeChildren();

    const graphics = new Graphics();
    for (const arrow of arrows) {
      drawArrow(graphics, arrow.from, arrow.to, arrow.nth);
    }
    app.stage.addChild(graphics);
  }, [arrows]);

  return <div className="arrow-overlay" ref={containerRef} />;
}
