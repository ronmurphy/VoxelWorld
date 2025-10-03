class Room {
  constructor(id, bounds, name = "", shape = "rectangle", type = "wall") {
    // Default to 'wall'
    this.id = id;
    this.bounds = bounds;
    this.type = name.startsWith("Room") ? "room" : "wall"; // If it starts with 'Room', it's a room, otherwise it's a wall
    this.name = name || `${this.type === "wall" ? "Wall" : "Room"} ${id}`;
    if (type === "water") {
      this.type = "water";
    } else {
      this.type = name.startsWith("Room") ? "room" : "wall"; // Existing logic
    }
    if (name) {
      this.name = name;
    } else {
      if (this.type === "water") {
        this.name = `Water ${id}`;
      } else {
        this.name = `${this.type === "wall" ? "Wall" : "Room"} ${id}`;
      }
    }
    this.shape = shape;
    this.finalized = false;
    this.thumbnail = null;
    this.element = null;
    this.points = bounds.points || null;
    this.isEditing = false;
    this.visible = true;
    this.locked = false;
  }

  isPointInside(x, y) {
    // For rectangle and circle shapes
    if (this.shape === 'rectangle') {
      return x >= this.bounds.x && x <= this.bounds.x + this.bounds.width &&
        y >= this.bounds.y && y <= this.bounds.y + this.bounds.height;
    }
    else if (this.shape === 'circle') {
      const centerX = this.bounds.x + this.bounds.width / 2;
      const centerY = this.bounds.y + this.bounds.height / 2;
      const radius = Math.max(this.bounds.width, this.bounds.height) / 2;

      const distSq = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
      return distSq <= radius * radius;
    }
    else if (this.shape === 'polygon' && this.points) {
      // For polygon shapes, we need point-in-polygon test
      const absolutePoints = this.points.map(p => ({
        x: p.x + this.bounds.x,
        y: p.y + this.bounds.y
      }));

      return this.isPointInPolygon(x, y, absolutePoints);
    }

    return false;
  }

  // Helper to check if point is in polygon (as method on Room class)
  isPointInPolygon(px, py, vertices) {
    // Ray-casting algorithm
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;

      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  toggleVisibility() {
    this.visible = !this.visible;
    if (this.element) {
      this.element.style.display = this.visible ? "block" : "none";
    }
  }

  createDOMElement(editor) {
    const roomElement = document.createElement("div");
    roomElement.id = `room-${this.id}`;
    roomElement.className = `room-block ${this.shape}-room ${this.type}-room`;
    if (this.type === "water") {
      classNames += " water-area";
    }
    roomElement.style.pointerEvents = "auto";

    if (this.type === "water") {
      roomElement.style.backgroundColor = "rgba(0, 100, 255, 0.3)";
      roomElement.style.border = "1px solid rgba(0, 150, 255, 0.7)";
      roomElement.setAttribute("data-tooltip", "Water Area");
    } else {
      // Add existing tooltip code
      const gridX = Math.floor(this.bounds.x / editor.cellSize);
      const gridY = Math.floor(this.bounds.y / editor.cellSize);
      roomElement.setAttribute(
        "data-tooltip",
        `Grid Position: ${gridX}, ${gridY}`
      );
    }

    // Add position tooltip
    const gridX = Math.floor(this.bounds.x / editor.cellSize);
    const gridY = Math.floor(this.bounds.y / editor.cellSize);
    roomElement.setAttribute(
      "data-tooltip",
      `Grid Position: ${gridX}, ${gridY}`
    );
    // roomElement.style.display = this.visible ? 'block' : 'none';
    // roomElement.style.pointerEvents = 'auto';
    //   console.log(`Creating element for ${this.shape} room`);

    if (this.shape === "polygon" && this.points) {
      // Create SVG element with proper viewBox
      const svg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.setAttribute(
        "viewBox",
        `0 0 ${this.bounds.width} ${this.bounds.height}`
      );
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";
      // svg.style.pointerEvents = "all";
      svg.style.zIndex = "1"; // Ensure SVG is below controls
      svg.style.pointerEvents = "none"; // Allow clicks to pass through

      // Create polygon path using absolute coordinates
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      const pathData =
        this.points
          .map((point, index) => {
            return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
          })
          .join(" ") + " Z";

      path.setAttribute("d", pathData);
      path.setAttribute("class", "polygon-base");
      path.setAttribute("fill", "rgba(128, 128, 128, 0.3)");
      path.setAttribute("stroke", "rgba(255, 255, 255, 0.7)");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("vector-effect", "non-scaling-stroke"); // Maintain stroke width when scaling
      path.style.pointerEvents = "all";

      svg.appendChild(path);
      roomElement.appendChild(svg);

      // Add vertex points using absolute positioning
      this.points.forEach((point, index) => {
        const vertexMarker = document.createElement("div");
        vertexMarker.className = "polygon-vertex";
        vertexMarker.style.cssText = `
                position: absolute;
                left: ${(point.x / this.bounds.width) * 100}%;
                top: ${(point.y / this.bounds.height) * 100}%;
            `;
        roomElement.appendChild(vertexMarker);
      });
    } else {
      // Rest of the code for rectangle/circle rooms...
      const backgroundDiv = document.createElement("div");
      backgroundDiv.className = "room-background";
      roomElement.appendChild(backgroundDiv);
    }

    // Add resize handles (not for polygon)
    // if (this.shape !== 'polygon') {
    ["nw", "ne", "sw", "se"].forEach((pos) => {
      const handle = document.createElement("div");
      handle.className = `resize-handle ${pos}`;
      handle.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        editor.startResizing(this, pos, e);
      });
      roomElement.appendChild(handle);
    });


    const controls = document.createElement("div");
    controls.className = "room-controls";
    controls.style.position = "absolute";
    controls.style.zIndex = "2"; // Place controls above SVG
    controls.style.pointerEvents = "auto";
    controls.innerHTML = `
        <span class="material-icons confirm-btn"
              style="padding: 4px; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer;">
            check
        </span>
        <span class="material-icons edit-btn"
              style="padding: 4px; background: #2196F3; color: white; border-radius: 4px; cursor: pointer;">
            edit
        </span>
        <span class="material-icons cancel-btn"
              style="padding: 4px; background: #f44336; color: white; border-radius: 4px; cursor: pointer;">
            close
        </span>
    `;
    
    // Use mousedown instead of click for better capture chance
    controls.querySelector(".confirm-btn").addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("Confirm button pressed for room:", this.id);
        
        // Use setTimeout to ensure this runs after event handling
        setTimeout(() => {
            try {
                editor.finalizeRoom(this);
                console.log("finalizeRoom called");
            } catch (err) {
                console.error("Error in finalizeRoom:", err);
            }
        }, 0);
        
        return false; // Try to stop propagation
    });
    
    controls.querySelector(".edit-btn").addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("Edit button pressed for room:", this.id);
        
        // Use setTimeout to ensure this runs after event handling
        setTimeout(() => {
            try {
                editor.layersPanel.showPropertiesDialog(this);
                console.log("showPropertiesDialog called");
            } catch (err) {
                console.error("Error in showPropertiesDialog:", err);
            }
        }, 0);
        
        return false; // Try to stop propagation
    });
    
    controls.querySelector(".cancel-btn").addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log("Cancel button pressed for room:", this.id);
        
        // Use setTimeout to ensure this runs after event handling
        setTimeout(() => {
            try {
                editor.deleteRoom(this);
                console.log("deleteRoom called");
            } catch (err) {
                console.error("Error in deleteRoom:", err);
            }
        }, 0);
        
        return false; // Try to stop propagation
    });
    
    // Also handle mouseup and click for absolute certainty
    controls.addEventListener("mouseup", (e) => {
        e.stopPropagation();
        e.preventDefault();
    }, true);
    
    controls.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
    }, true);
    
    roomElement.appendChild(controls);

    // Add dragging functionality (only for non-polygon or finalized polygon)
    // if (this.shape !== 'polygon' || this.finalized) {
    roomElement.addEventListener("mousedown", (e) => {
      if (
        !e.target.classList.contains("resize-handle") &&
        !e.target.classList.contains("material-icons")
      ) {
        editor.startDragging(this, e);
      }
    });


    roomElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!this.isMarkerEditMode) { // Only show if not in marker edit mode
        window.mapEditor.showStructureContextMenu(this, e);
      }
    });

    // Add height indicator if needed 
    if ((this.isRaisedBlock && this.blockHeight > 0) || this.isRegularWall) {
      const heightLabel = document.createElement('div');
      heightLabel.className = 'height-indicator';
      heightLabel.style.cssText = `
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    z-index: 5;
    pointer-events: none;
    user-select: none;
    backdrop-filter: blur(2px);
  `;

      // Determine what to show
      let displayText = '';
      if (this.isRegularWall) {
        displayText = `Wall`;
      } else if (this.isRaisedBlock) {
        const sliderValue = Math.round(this.blockHeight * 2);
        displayText = `H:${sliderValue} (${this.blockHeight})`;
      }

      heightLabel.textContent = displayText;
      roomElement.appendChild(heightLabel);

      if (this.type === "water") {
        const depthLabel = document.createElement('div');
        depthLabel.className = 'depth-indicator';
        depthLabel.style.cssText = `
          position: absolute;
          top: 4px;
          left: 4px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          z-index: 5;
          pointer-events: none;
          user-select: none;
          backdrop-filter: blur(2px);
        `;
        
        depthLabel.textContent = "Water";
        roomElement.appendChild(depthLabel);
      }



    }

    this.element = roomElement;
    this.updateElement();
    return roomElement;
  }

  static createFromSaved(roomData, editor) {
    // Store the current tool
    const previousTool = editor.currentTool;

    // Set tool based on room shape
    switch (roomData.shape) {
      case "circle":
        editor.currentTool = "circle";
        break;
      case "polygon":
        editor.currentTool = "polygon";
        break;
      default:
        editor.currentTool = "rectangle";
    }

    // Create new room instance with saved data
    const room = new Room(
      roomData.id,
      roomData.bounds,
      roomData.name,
      roomData.shape,
      roomData.type // Make sure type is passed here
    );

    if (roomData.points) {
      room.points = roomData.points;
    }

    // Set water area flag
  room.isWaterArea = roomData.isWaterArea || room.type === "water";


    room.thumbnail = roomData.thumbnail;
    room.finalized = roomData.finalized || false;

    // Use the existing createDOMElement method
    const roomElement = room.createDOMElement(editor);
    room.element = roomElement;

    // Restore previous tool
    editor.currentTool = previousTool;

    return room;
  }



  updateEditState(isEditing) {
    this.isEditing = isEditing;
    if (this.element) {
      if (isEditing) {
        this.element.classList.add('editing');
        this.element.style.pointerEvents = 'auto';
        // Make sure resize handles are enabled
        this.element.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.pointerEvents = 'auto';
        });
      } else {
        this.element.classList.remove('editing');
        this.element.style.pointerEvents = 'none';
        // Disable resize handles
        this.element.querySelectorAll('.resize-handle').forEach(handle => {
          handle.style.pointerEvents = 'none';
        });
        // But keep controls interactive
        const controls = this.element.querySelector('.room-controls');
        if (controls) {
          controls.style.pointerEvents = 'auto';
        }
      }
    }
  }

updateElement() {
  if (!this.element) return;

  const editor = window.mapEditor;
  if (!editor) return;

  // Calculate position based on scale and offset
  const left = this.bounds.x * editor.scale + editor.offset.x;
  const top = this.bounds.y * editor.scale + editor.offset.y;
  const width = this.bounds.width * editor.scale;
  const height = this.bounds.height * editor.scale;

  // Update element style
  this.element.style.left = `${left}px`;
  this.element.style.top = `${top}px`;
  this.element.style.width = `${width}px`;
  this.element.style.height = `${height}px`;

  // If this is a polygon room, update vertex positions
  if (this.shape === "polygon" && this.points) {
    const vertices = this.element.querySelectorAll(".polygon-vertex");
    vertices.forEach((vertex, index) => {
      const point = this.points[index];
      vertex.style.left = `${(point.x / this.bounds.width) * 100}%`;
      vertex.style.top = `${(point.y / this.bounds.height) * 100}%`;
    });
  }

  // Update appearance based on type and name
  this.element.classList.remove("wall-room", "room-room", "water-room");
  this.element.classList.add(`${this.type}-room`);

  // Special styling for water areas
  if (this.type === "water") {
    this.element.classList.add("water-area");
    this.element.style.backgroundColor = "rgba(0, 100, 255, 0.3)";
    this.element.style.border = "1px solid rgba(0, 150, 255, 0.7)";
  }
  // Special styling for texture rooms
  else if (this.name === "WallTexture" || this.name === "RoomTexture") {
    this.element.style.border = "2px dashed #4CAF50";
    this.element.style.backgroundColor = "rgba(76, 175, 80, 0.2)";
  }

    // Add or update height indicator for raised blocks and regular walls
    let heightLabel = this.element.querySelector('.height-indicator');
    if ((this.isRaisedBlock && this.blockHeight > 0) || this.isRegularWall) {
      // Create height label if it doesn't exist
      if (!heightLabel) {
        heightLabel = document.createElement('div');
        heightLabel.className = 'height-indicator';
        heightLabel.style.cssText = `
                position: absolute;
                top: 32px;
                left: 4px;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                z-index: 5;
                pointer-events: none;
                user-select: none;
                backdrop-filter: blur(2px);
              `;
        this.element.appendChild(heightLabel);
      }

      // Determine what to show
      let displayText = '';
      if (this.isRegularWall) {
        displayText = `Wall`;
      } else if (this.isRaisedBlock) {
        const sliderValue = Math.round(this.blockHeight * 2);
        displayText = `H:${sliderValue} (${this.blockHeight})`;
      }

      heightLabel.textContent = displayText;
      heightLabel.style.display = 'block';
    } else if (heightLabel) {
      // Hide height label if it exists but no longer needed
      heightLabel.style.display = 'none';
    }
  }


  createThumbnail(canvas) {
    const thumbnailCanvas = document.createElement("canvas");
    thumbnailCanvas.width = 40;
    thumbnailCanvas.height = 40;
    const ctx = thumbnailCanvas.getContext("2d");

    try {
      ctx.clearRect(0, 0, 40, 40);

      if (this.shape === "polygon" && this.points) {
        // Create clipping path for polygon
        ctx.beginPath();
        this.points.forEach((point, index) => {
          const x = (point.x / this.bounds.width) * 40;
          const y = (point.y / this.bounds.height) * 40;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.clip();
      } else if (this.shape === "circle") {
        ctx.beginPath();
        ctx.arc(20, 20, 20, 0, Math.PI * 2);
        ctx.clip();
      }

      // Draw the room portion from the base image
      ctx.drawImage(
        window.mapEditor.baseImage,
        this.bounds.x,
        this.bounds.y,
        this.bounds.width,
        this.bounds.height,
        0,
        0,
        40,
        40
      );

      // Add border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 1;
      if (this.shape === "polygon" && this.points) {
        ctx.beginPath();
        this.points.forEach((point, index) => {
          const x = (point.x / this.bounds.width) * 40;
          const y = (point.y / this.bounds.height) * 40;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      } else if (this.shape === "circle") {
        ctx.beginPath();
        ctx.arc(20, 20, 19.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(0, 0, 40, 40);
      }
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      // Fallback thumbnail
      this.createFallbackThumbnail(ctx);
    }

    this.thumbnail = thumbnailCanvas.toDataURL();
  }

  // Add helper method for fallback thumbnails
  createFallbackThumbnail(ctx) {
    ctx.fillStyle = "#666";
    if (this.shape === "polygon" && this.points) {
      ctx.beginPath();
      this.points.forEach((point, index) => {
        const x = (point.x / this.bounds.width) * 40;
        const y = (point.y / this.bounds.height) * 40;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === "circle") {
      ctx.beginPath();
      ctx.arc(20, 20, 20, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, 40, 40);
    }
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "10px sans-serif";
    ctx.fillText(this.name, 20, 20);
  }
}
