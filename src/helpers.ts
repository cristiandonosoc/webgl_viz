import {Bounds, Vec2} from "./vectors";

let g_inf = 9007199254740991;

function GetCanvasChildByTag(el: HTMLElement, tag: string, value: string) : HTMLCanvasElement {
  let children = el.getElementsByTagName("canvas");
  for (let i = 0; i < children.length; i++) {
    let child = children[i];
    if (child.getAttribute(tag) == value) {
      return child;
    }
  }

  return null;
}

function GetCanvasChildByClass(el: HTMLElement, cls: string) : HTMLCanvasElement {
  return GetCanvasChildByTag(el, "class", cls);
}


function GetBoundsFromGraphPoints(points: Array<number>) : Bounds {
    // We post-process the points
    let min = new Vec2(+g_inf, +g_inf);
    let max = new Vec2(-g_inf, -g_inf);
    let arr = new Array<Vec2>(points.length / 2);
    for (let i = 0; i < arr.length; i += 1) {
      let point_index = i * 2;
      let p = new Vec2(points[point_index], points[point_index + 1]);
      arr[i] = p;

      // We track the bounds
      if (p.x < min.x) { min.x = p.x; }
      if (p.x > max.x) { max.x = p.x; }
      if (p.y < min.y) { min.y = p.y; }
      if (p.y > max.y) { max.y = p.y; }
    }

  return Bounds.FromPoints(min.x, max.x, min.y, max.y);
}

function CreateMaxBounds(a: Bounds, b: Bounds) : Bounds {
  return Bounds.FromPoints(
    Math.min(a.x.first, b.x.first),
    Math.max(a.x.last, b.x.last),
    Math.min(a.y.first, b.y.first),
    Math.max(a.y.last, b.y.last))
}



export {CreateMaxBounds};
export {GetBoundsFromGraphPoints};
export {GetCanvasChildByTag};
export {GetCanvasChildByClass};
