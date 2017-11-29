class Vec2 {
  x: number;
  y: number;

  /*********************
   * GETTERS ALIASES
   *********************/

  get first() : number {
    return this.x;
  }
  get last() : number {
    return this.y;
  }

  AsArray() : number[] {
    return [this.x, this.y];
  }

  constructor(x: number, y: number) {
    this.Set(x, y);
  }

  Set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }


  static Sum(v1: Vec2, v2: Vec2) : Vec2 {
    return new Vec2(v1.x + v2.x,
                    v1.y + v2.y);
  }

  static get Zero() : Vec2 {
    return new Vec2(0, 0);
  }
}

class Bounds {
  x: Vec2
  y: Vec2

  static FromPoints(x1: number, x2: number, y1: number, y2: number) : Bounds {
    let b = new Bounds();
    b.x = new Vec2(x1, x2);
    b.y = new Vec2(y1, y2);
    return b;
  }

  static FromVecs(x: Vec2, y: Vec2) : Bounds {
    let b = new Bounds();
    b.x = x;
    b.y = y;
    return b;
  }

  static get Zero() : Bounds {
    return Bounds.FromPoints(0, 0, 0, 0);
  }

}

export {Vec2}
export {Bounds}
