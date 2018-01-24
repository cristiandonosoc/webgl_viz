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

export {GetCanvasChildByTag};
export {GetCanvasChildByClass};
