let $ = document.querySelector.bind(document);

let video = $("video");
let selectedColour = null;

let constraints = {
  video: {
    facingMode: "environment",
    width: {
      min: 1280,
      ideal: 1920,
      max: 2560,
    },
    height: {
      min: 720,
      ideal: 1080,
      max: 1440
    },
  }
};

let arrToRGB = arr =>
  `rgb(${arr[0]}, ${arr[1]}, ${arr[2]}`;

let toHex = c =>
  c.toString(16).padStart(2, "0");

let rgbToHex = ([r, g, b]) =>
  `#${toHex(r)}${toHex(g)}${ toHex(b)}`;

let createCanvasFrame = ()  => {
  let canvas = document.createElement("canvas");
  canvas.height = video.videoHeight;
  canvas.width = video.videoWidth;
  let ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
  return canvas;
};

let takeFrame = async () => {
  return new Promise(resolve => {
    let canvas = createCanvasFrame();
    let img = document.createElement("img");
    img.addEventListener("load", () => resolve(img));
    img.setAttribute("src", canvas.toDataURL("image/png"));
  })
}

let pickFrameColours = async () => {
  let frame = await takeFrame();

  let vibrant = new Vibrant(frame);
  let swatches = vibrant.swatches();

  let colours = [
    swatches.Vibrant.getRgb(),
    swatches.Muted.getRgb(),
    swatches.DarkVibrant.getRgb(),
  ];

  if (selectedColour) {
    colours.push(selectedColour);
  }

  ["first", "second", "third", "fourth"].map((pos, i) => {

    let colour = $(`#colours .${pos}`);

    if (!colours[i]) {
      colour.classList.add("prompt");
      colour.innerText = "Click to pick colour";
      return;
    }

    colour.classList.remove("prompt");
    let complement = complementryRGBColor(...colours[i]);

    //let colour = $(`#colours .${pos}`);
    colour.innerText = rgbToHex(colours[i]);
    colour.style.color = idealTextColor(colours[i]);
    colour.style.backgroundColor = arrToRGB(colours[i]);

    let comp = $(`#complementary .${pos}`);
    comp.innerText = rgbToHex(complement);
    comp.style.color = idealTextColor(complement);
    comp.style.backgroundColor = arrToRGB(complement);
  });
};

let idealTextColor = ([r, g, b]) => {
  let nThreshold = 105;
  var bgDelta = (r * 0.299) + (g * 0.587) + (b * 0.114);
  return ((255 - bgDelta) < nThreshold) ? "#000000" : "#ffffff";
}

let getColorByBgColor = bg =>
  (parseInt(bg.replace("#", ""), 16) > 0xffffff / 2) ? "#000" : "#fff";

let start = async () => {
  let stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  setInterval(pickFrameColours, 1000);
};

let clickVideo = evt => {
  let offset = evt.target.getBoundingClientRect();
  let x = evt.clientX - offset.left;
  let y = evt.clientY - offset.top;

  // We use 'object-fit' on the video player which we can't use
  // when getting pixel data so we need to rescale the image
  // and add offsets for when parts of the image are clipped.
  let scale;
  if (video.videoWidth > video.videoHeight) {
    scale = video.clientHeight / video.videoHeight;
    x += ((video.videoWidth * scale) - video.clientWidth) / 2;
  } else {
    scale = video.clientWidth / video.videoWidth;
    y += ((video.videoHeight * scale) - video.clientHeight) / 2;
  }

  y = y * (1 / scale);
  x = x * (1 / scale);

  selectedColour = createCanvasFrame()
    .getContext("2d")
    .getImageData(x, y, 1, 1).data;
}

let copyColour = e => {
  if (/#[0-9A-Fa-f]{6}\b/.test(e.target.innerText)) {
    navigator.clipboard.writeText(e.target.innerText);
  }
}

let pause = () => {
  video.paused ? video.play() : video.pause();
  $("#pause").classList.toggle("paused", video.paused);
}

video.addEventListener("click", clickVideo);

$("#colours").addEventListener("click", copyColour);
$("#complementary").addEventListener("click", copyColour);
$("#pause").addEventListener("click", pause);

start();

function complementryRGBColor(r, g, b) {
  if (Math.max(r, g, b) == Math.min(r, g, b)) {
    return [255 - r, 255 - g, 255 - b];
  } else {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h = Math.round((h * 60) + 180) % 360;
    h /= 360;

    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}
