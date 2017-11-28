class LabelManager {
  labels: {
    x: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
    y: {
      bottom: HTMLInputElement,
      top: HTMLInputElement
    },
  };

  constructor(canvas: HTMLCanvasElement) {
    var graph_container = canvas.parentNode.parentNode;

    this.labels = {
      x: {
        bottom: document.querySelector(".x-labels .bottom"),
        top: document.querySelector(".x-labels .top")
      },
      y: {
        bottom: document.querySelector(".y-labels .bottom"),
        top: document.querySelector(".y-labels .top")
      }
    };
  }

  Update(transforms: any) {
    var offset = transforms.offset;
    this.labels.x.bottom.value = String(-1 - offset[0]);
    this.labels.x.top.value = String(1 - offset[0]);

    this.labels.y.bottom.value = String(-1 - offset[1]);
    this.labels.y.top.value = String(1 - offset[1]);
  }
}

export default LabelManager
