      class Token {
        constructor(x, y, size, image, type = "monster") {
          this.x = x;
          this.y = y;
          this.size = size || 1;
          this.image = image;
          this.type = type;
          this.height = 2; // Height above ground
        }
      }
