/**
 * VisualizerUtils
 * ---------------
 *
 * Set of static calls that are common to all visualizers
 **/

import {Vec2} from "./vectors";

export function SearchForClosest<T>(container: Array<T>,
                                    pos: Vec2,
                                    Extractor: ((t: T) => Vec2)) : number {
  let len = container.length;
  let first = Extractor(container[0]);
  if (pos.x <= first.x) {
    return 0;
  }
  let last = Extractor(container[len-1]);
  if (pos.x >= last.x) {
    return len-1 ;
  }

  // We do binary search
  let min_index = 0;
  let max_index = len - 1;

  while (min_index < max_index) {
    let half = Math.floor((min_index + max_index) / 2);
    let val = Extractor(container[half]).x;

    if (val > pos.x) {
      if (max_index == half) { break; }
      max_index = half;
    } else {
      if (min_index == half) { break; }
      min_index = half;
    }
  }

  // We now have two points
  let min_point = Extractor(container[min_index]);
  let max_point = Extractor(container[max_index]);

  // We want to return the closest (x-wise)
  let dist1 = Math.abs(min_point.x - pos.x);
  let dist2 = Math.abs(max_point.x - pos.x);

  if (dist1 < dist2) {
    return min_index;
  } else {
    return max_index;
  }
}
