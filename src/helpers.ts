import {Bounds, Vec2} from "./vectors";

let INFINITY = 999999999;

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

function CreateMaxBounds(a: Bounds, b: Bounds) : Bounds {
  return Bounds.FromPoints(
    Math.min(a.x.first, b.x.first),
    Math.max(a.x.last, b.x.last),
    Math.min(a.y.first, b.y.first),
    Math.max(a.y.last, b.y.last))
}

class IdManager {

  static GetVisualizerId() : number {
    return IdManager._visualizer_id++;
  }

  private static _visualizer_id : number = 0;
}

export {IdManager}
export {INFINITY}
export {CreateMaxBounds};
export {GetCanvasChildByTag};
export {GetCanvasChildByClass};
