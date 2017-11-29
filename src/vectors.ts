class Vec2 {
  x: number;
  y: number;

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


}

export {Vec2}
