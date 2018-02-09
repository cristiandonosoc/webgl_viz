import {Vec2} from "./vectors";
import InternalRendererInterface from "./internal_renderer";
import {RendererCanvasToLocal} from "./transforms";


enum MouseButtons {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  NONE = 1000
}

class MousePosition {
  screen: Vec2
  canvas: Vec2
  local: Vec2
  page: Vec2

  static get Zero() : MousePosition {
    let mouse_pos = new MousePosition();
    mouse_pos.screen = Vec2.Zero;
    mouse_pos.canvas = Vec2.Zero;
    mouse_pos.local = Vec2.Zero;
    return mouse_pos;
  }

  static FromRendererEvent(renderer: InternalRendererInterface, event: any) : MousePosition {
    let mouse_pos = new MousePosition();
    // Screen
    mouse_pos.screen = new Vec2(event.screenX,
                                window.screen.height - event.screenY);
    // Page
    mouse_pos.page = new Vec2(event.pageX, event.pageY);

    // Canvas
    let client_pos = new Vec2(event.clientX, event.clientY);
    let bounds = event.target.getBoundingClientRect();
    mouse_pos.canvas = new Vec2(event.clientX - bounds.left,
                                bounds.height - (event.clientY - bounds.top));
    // Local
    mouse_pos.local = RendererCanvasToLocal(renderer, mouse_pos.canvas);
    return mouse_pos;
  }
}


export {MouseButtons};
export {MousePosition};
export default MousePosition;
