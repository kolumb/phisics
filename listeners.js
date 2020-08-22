"use strict";

const resizeHandler = () => {
    width = innerWidth;
    height = innerHeight;
    canvas.height = height;
    canvas.width = width;

    floor = ((FLOOR_FACTOR - 1) * height) / FLOOR_FACTOR;
    if (pause) render();
};
window.addEventListener("resize", resizeHandler);

const keydownHandler = function(e) {
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
        Input.ctrl = true;
    }
    if (e.code === "Space") {
        pause = !pause;
        Input.drag = false;
        Input.downState = false;
        if (pause === false) {
            frame();
        }
    } else if (e.code === "KeyF") {
        if (pause === false) return;
        for (let i = 0; i < selectedPoints.length; i++) {
            for (let j = i + 1; j < selectedPoints.length; j++) {
                const p1 = selectedPoints[i];
                const p2 = selectedPoints[j];
                let found = false;
                lines.map((l) => {
                    if (
                        (l.p1 === p1 && l.p2 === p2) ||
                        (l.p1 === p2 && l.p2 === p1)
                    ) {
                        found = true;
                    }
                });
                if (found === false) {
                    lines.push(new Line(p1, p2));
                }
            }
        }
    } else if (e.code === "Delete" || e.code === "KeyX") {
        selectedPoints.map((p) => {
            lines.map((l) => {
                if (l.p1 === p || l.p2 === p) {
                    lines.splice(lines.indexOf(l), 1);
                }
            });
            points.splice(points.indexOf(p), 1);
        });
        selectedPoints.length = 0;
        selectedLines.map((l) => {
            lines.splice(lines.indexOf(l), 1);
        });
        selectedLines.length = 0;
        if (alreadyRequestedFrame === false) {
            alreadyRequestedFrame = true;
            requestAnimationFrame(render);
        }
    } else if (e.code === "KeyH") {
        if (e.altKey) {
            points.map((p) => (p.color = p.originalColor));
            lines.map((l) => (l.color = l.originalColor));
        } else {
            const toggleHidden = (x) =>
                (x.color =
                    x.color === "transparent"
                        ? x.originalColor
                        : "transparent");
            selectedPoints.map(toggleHidden);
            selectedLines.map(toggleHidden);
        }
    }
    if (pause && alreadyRequestedFrame === false) {
        alreadyRequestedFrame = true;
        requestAnimationFrame(render);
    }
};
window.addEventListener("keydown", keydownHandler);

const keyupHandler = function(e) {
    if (e.code === "ControlLeft" || e.code === "ControlRight") {
        Input.ctrl = false;
    }
};
window.addEventListener("keyup", keyupHandler);

const pointerDownHandler = function(e) {
    if (e.button === 2) return;
    Input.downPos.set(e.pageX, e.pageY);
    Input.downCellIndex.set(0, 0);
    Input.downState = true;
    let foundPoint = false;
    let foundLine = false;
    let lastSelectedLine;
    points.map((p) => {
        if (foundPoint) return;
        if (p.radius > p.pos.dist(Input.downPos)) {
            foundPoint = true;
            lastSelectedPoint = p;
        }
    });
    if (foundPoint === false) {
        lines.map((l) => {
            if (foundLine) return;
            const d = distToSegmentSquared(Input.pointer, l.p1.pos, l.p2.pos);
            if (d < l.width ** 2) {
                foundLine = true;
                lastSelectedLine = l;
            }
        });
    }
    if (pause) {
        if (foundPoint) {
            selectedLines.length = 0;
            const selectionIndex = selectedPoints.indexOf(lastSelectedPoint);
            if (selectionIndex < 0) {
                if (e.shiftKey === false) {
                    selectedPoints.length = 0;
                }
                selectedPoints.push(lastSelectedPoint);
            } else {
                if (e.shiftKey) {
                    Input.downState = false;
                    const deselectedPoint = selectedPoints.splice(
                        selectionIndex,
                        1
                    )[0];
                    if (deselectedPoint === lastSelectedPoint) {
                        lastSelectedPoint =
                            selectedPoints[selectedPoints.length - 1];
                    }
                }
            }
        } else if (foundLine) {
            selectedPoints.length = 0;
            const selectionIndex = selectedLines.indexOf(lastSelectedLine);
            if (selectionIndex < 0) {
                if (e.shiftKey === false) {
                    selectedLines.length = 0;
                }
                selectedLines.push(lastSelectedLine);
            } else {
                if (e.shiftKey) {
                    Input.downState = false;
                    selectedLines.splice(selectionIndex, 1);
                }
            }
        } else {
            if (e.shiftKey) {
                const newPoint = new Point(Input.downPos.copy());
                points.push(newPoint);
                if (lastSelectedPoint)
                    lines.push(new Line(newPoint, lastSelectedPoint));
                selectedLines.length = 0;
                selectedPoints.length = 0;
                selectedPoints.push(newPoint);
                lastSelectedPoint = newPoint;
            } else {
                if (selectedPoints.length > 0 || selectedLines.length > 0) {
                    selectedPoints.length = 0;
                    selectedLines.length = 0;
                } else {
                    const newPoint = new Point(Input.downPos.copy());
                    points.push(newPoint);
                    selectedPoints.push(newPoint);
                    lastSelectedPoint = newPoint;
                }
            }
        }
        if (alreadyRequestedFrame === false) {
            alreadyRequestedFrame = true;
            requestAnimationFrame(render);
        }
    } else {
        if (foundPoint) {
            grabFix = lastSelectedPoint.pos.sub(Input.downPos);
            Input.drag = true;
        } else {
            Input.downState = false;
        }
    }
};
const pointerMoveHandler = function(e) {
    const pointerPos = new Vector(e.pageX, e.pageY);
    Input.speed = pointerPos.sub(Input.pointer);
    Input.pointer.setFrom(pointerPos);
    hoverPoint = undefined;
    hoverLine = undefined;
    Canvas.classList.remove("interactable");
    points.map((p) => {
        if (hoverPoint) return;
        if (p.radius > p.pos.dist(Input.pointer)) {
            hoverPoint = p;
            Canvas.classList.add("interactable");
        }
    });
    if (hoverPoint === undefined) {
        lines.map((l) => {
            if (hoverLine) return;
            const d = distToSegmentSquared(Input.pointer, l.p1.pos, l.p2.pos);
            if (d < l.width ** 2) {
                hoverLine = l;
                Canvas.classList.add("interactable");
            }
        });
    }
    if (pause) {
        if (Input.downState) {
            if (Input.drag) {
                if (Input.ctrl) {
                    const shift = Input.pointer.sub(Input.downPos);
                    const currentCell = new Vector(
                        Math.round(shift.x / cellSize),
                        Math.round(shift.y / cellSize)
                    );
                    if (
                        currentCell.x !== Input.downCellIndex.x ||
                        currentCell.y !== Input.downCellIndex.y
                    ) {
                        const diff = currentCell.sub(Input.downCellIndex);
                        selectedPoints.map((p) => {
                            p.pos.addMut(diff.scale(cellSize));
                        });
                        Input.downCellIndex.addMut(diff);
                    }
                } else {
                    selectedPoints.map((p) => {
                        p.pos.addMut(Input.speed);
                    });
                }
                const pointsOfSelectedLines = new Set();
                selectedLines.map((l) => {
                    pointsOfSelectedLines.add(l.p1);
                    pointsOfSelectedLines.add(l.p2);
                });
                for (let p of pointsOfSelectedLines) p.pos.addMut(Input.speed);
            } else {
                if (Input.ctrl) {
                    Input.drag = true;
                } else if (Input.downPos.dist(Input.pointer) > DRAG_THRESHOLD) {
                    Input.drag = true;
                    const wasNotDragingVector = Input.pointer.sub(
                        Input.downPos
                    );
                    selectedPoints.map((p) => {
                        p.pos.addMut(wasNotDragingVector);
                    });
                    const pointsOfSelectedLines = new Set();
                    selectedLines.map((l) => {
                        pointsOfSelectedLines.add(l.p1);
                        pointsOfSelectedLines.add(l.p2);
                    });
                    for (let p of pointsOfSelectedLines)
                        p.pos.addMut(wasNotDragingVector);
                }
            }
        }
        if (alreadyRequestedFrame === false) {
            alreadyRequestedFrame = true;
            requestAnimationFrame(render);
        }
    }
};
const pointerUpHandler = function(e) {
    Input.downState = false;
    Input.drag = false;
    render();
};

window.addEventListener("pointerdown", pointerDownHandler);
window.addEventListener("pointermove", pointerMoveHandler);
window.addEventListener("pointerup", pointerUpHandler);
