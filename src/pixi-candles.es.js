/* eslint-disable */

/*!
 * @pixi/candles - v0.2.0
 * Compiled Sun, 13 Jun 2021 11:15:36 UTC
 *
 * @pixi/candles is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 *
 * Copyright 2019-2020, Ivan Popelyshev, All Rights Reserved
 */
import {
  Program,
  Texture,
  Geometry,
  Buffer,
  BaseTexture,
  BatchDrawCall,
  BatchTextureArray,
  State,
  Shader,
  BatchGeometry,
  AbstractBatchRenderer,
  BatchShaderGenerator,
  Renderer
} from "@pixi/core";
import { MeshMaterial, Mesh } from "@pixi/mesh";
import {
  createIndicesForQuads,
  hex2string,
  rgb2hex,
  hex2rgb,
  earcut,
  premultiplyTint
} from "@pixi/utils";
import { TYPES, WRAP_MODES, DRAW_MODES, BLEND_MODES } from "@pixi/constants";
import {
  LINE_JOIN,
  LINE_CAP,
  graphicsUtils,
  FillStyle,
  LineStyle,
  Graphics
} from "@pixi/graphics";
import {
  SHAPES,
  Point,
  Matrix,
  Polygon,
  PI_2,
  Rectangle,
  RoundedRectangle,
  Circle,
  Ellipse
} from "@pixi/math";
import { Bounds, Container } from "@pixi/display";

const barVert = `
attribute vec4 aRect;
attribute vec2 aQuad;
attribute vec4 aColor;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform float resolution;
uniform vec4 uColor;

varying vec4 vPixelPos;
varying vec4 vPixelRect;
varying vec4 vColor;

void main(void){
vec2 p1 = (translationMatrix * vec3(aRect.xy, 1.0)).xy;
vec2 p2 = (translationMatrix * vec3(aRect.xy + aRect.zw, 1.0)).xy;

vec2 leftTop = p1;
vec2 rightBottom = p2;
vec2 sign = aQuad;

// handle negative width/height, or translationMatrix .a .d < 0
if (p1.x > p2.x) {
    sign.x = 1.0 - aQuad.x;
    leftTop.x = p2.x;
    rightBottom.x = p1.x;
}
if (p1.y > p2.y) {
    sign.y = 1.0 - aQuad.y;
    leftTop.y = p2.y;
    rightBottom.y = p1.y;
}

vPixelRect = vec4(leftTop * resolution, rightBottom * resolution);

vec2 pos = (translationMatrix * vec3(aRect.xy + aRect.zw * aQuad, 1.0)).xy;
pos = floor(pos * resolution + 0.01 + sign * 0.98);
vPixelPos = vec4(pos - 0.5, pos + 0.5);
gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);

vColor = aColor * uColor;
}`;
const barFrag = `
varying vec4 vPixelPos;
varying vec4 vPixelRect;
varying vec4 vColor;

void main(void) {
vec2 leftTop = max(vPixelPos.xy, vPixelRect.xy);
vec2 rightBottom = min(vPixelPos.zw, vPixelRect.zw);
vec2 area = max(rightBottom - leftTop, 0.0);
float clip = area.x * area.y;

gl_FragColor = vColor * clip;
}`;

class BarsShader extends MeshMaterial {
  static __initStatic() {
    this._prog = null;
  }

  static getProgram() {
    if (!BarsShader._prog) {
      BarsShader._prog = new Program(barVert, barFrag);
    }
    return BarsShader._prog;
  }

  constructor() {
    super(Texture.WHITE, {
      uniforms: {
        resolution: 1
      },
      program: BarsShader.getProgram()
    });
  }
}
BarsShader.__initStatic();

class BarsGeometry extends Geometry {
  constructor(_static = false) {
    super();
    BarsGeometry.prototype.__init.call(this);
    BarsGeometry.prototype.__init2.call(this);
    BarsGeometry.prototype.__init3.call(this);
    BarsGeometry.prototype.__init4.call(this);
    BarsGeometry.prototype.__init5.call(this);
    BarsGeometry.prototype.__init6.call(this);
    BarsGeometry.prototype.__init7.call(this);
    BarsGeometry.prototype.__init8.call(this);
    BarsGeometry.prototype.__init9.call(this);
    BarsGeometry.prototype.__init10.call(this);
    BarsGeometry.prototype.__init11.call(this);
    BarsGeometry.prototype.__init12.call(this);
    BarsGeometry.prototype.__init13.call(this);
    BarsGeometry.prototype.__init14.call(this);
    this.initGeom(_static);
    this.reset();
  }

  __init() {
    this.lastLen = 0;
  }
  __init2() {
    this.lastPointNum = 0;
  }
  __init3() {
    this.lastPointData = 0;
  }
  __init4() {
    this.points = [];
  }
  __init5() {
    this._floatView = null;
  }
  __init6() {
    this._u32View = null;
  }
  __init7() {
    this._buffer = null;
  }
  __init8() {
    this._quad = null;
  }
  __init9() {
    this._indexBuffer = null;
  }

  initGeom(_static) {
    this._buffer = new Buffer(new Float32Array(0), _static, false);

    this._quad = new Buffer(
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      true,
      false
    );

    this._indexBuffer = new Buffer(
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      true,
      true
    );

    this.addAttribute(
      "aRect",
      this._buffer,
      4,
      false,
      TYPES.FLOAT,
      undefined,
      undefined,
      true
    )
      .addAttribute(
        "aColor",
        this._buffer,
        4,
        true,
        TYPES.UNSIGNED_BYTE,
        undefined,
        undefined,
        true
      )
      .addAttribute("aQuad", this._quad, 2, false, TYPES.FLOAT)
      .addIndex(this._indexBuffer);
  }

  __init10() {
    this.stridePoints = 5;
  }
  __init11() {
    this.strideFloats = 5;
  }
  __init12() {
    this.strideBytes = 20;
  }

  addRect(x, y, w, h, color) {
    const { points } = this;
    points.push(x);
    points.push(y);
    points.push(w);
    points.push(h);
    points.push(color);
  }

  invalidate(pointNum = 0) {
    this.lastPointNum = Math.min(pointNum, this.lastPointNum);
  }

  reset() {
    if (this.lastLen > 0) {
      this.clearBufferData();
    }
    this.lastLen = 0;
    this.lastPointData = 0;
    this.points.length = 0;
    this.instanceCount = 0;
  }

  clearBufferData() {
    const { points, strideBytes, stridePoints } = this;
    this.lastPointNum = 0;
    this.lastPointData = 0;
    const arrBuf = new ArrayBuffer(
      (strideBytes * points.length) / stridePoints
    );
    this.lastLen = points.length;
    this._floatView = new Float32Array(arrBuf);
    this._u32View = new Uint32Array(arrBuf);
    this._buffer.update(arrBuf);
  }

  updateBuffer() {
    const { points, stridePoints, strideFloats } = this;

    if (this.lastLen > points.length) {
      this.lastLen = -1;
    }
    if (this.lastLen < points.length || this.lastPointNum < this.lastLen) {
      // TODO: partial upload
      this.clearBufferData();
    }

    if (this.lastPointNum == this.lastLen) {
      return;
    }

    const { _floatView, _u32View } = this;
    this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
    let j = Math.round((this.lastPointNum * strideFloats) / stridePoints); //actually that's int division
    for (let i = this.lastPointNum; i < points.length; i += stridePoints) {
      _floatView[j++] = points[i];
      _floatView[j++] = points[i + 1];
      _floatView[j++] = points[i + 2];
      _floatView[j++] = points[i + 3];

      const rgb = points[i + 4];
      const bgra =
        ((rgb >> 16) & 0xff) |
        (rgb & 0xff00) |
        ((rgb & 0xff) << 16) |
        (255 << 24);
      _u32View[j++] = bgra;
    }
    this._buffer.update();
    this.instanceCount = Math.round(points.length / stridePoints);

    this.lastPointNum = this.lastLen;
    this.lastPointData = this.lastLen; // TODO: partial upload

    if (this.legacyGeom) {
      this.updateLegacy();
    }
  }

  __init13() {
    this.legacyGeom = null;
  }
  __init14() {
    this.legacyBuffer = null;
  }

  initLegacy() {
    if (this.legacyGeom) {
      return;
    }
    this.legacyGeom = new Geometry();
    this.legacyBuffer = new Buffer(new Float32Array(0), false, false);
    this.legacyGeom
      .addAttribute("aRect", this.legacyBuffer, 4, false, TYPES.FLOAT)
      .addAttribute("aColor", this.legacyBuffer, 4, true, TYPES.UNSIGNED_BYTE)
      .addAttribute("aQuad", this.legacyBuffer, 2, false, TYPES.FLOAT)
      .addIndex(new Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), false, true));
  }

  updateLegacy() {
    const { legacyBuffer, _floatView, _u32View, strideFloats } = this;
    const strideLegacy = 7;
    const quadsCount = this._floatView.length / strideFloats;
    const legacyLen = quadsCount * strideLegacy * 4;
    if (legacyBuffer.data.length !== legacyLen) {
      legacyBuffer.data = new Float32Array(legacyLen);
      this.legacyGeom.getIndex().update(createIndicesForQuads(quadsCount));
    }
    const floats = legacyBuffer.data;
    const quad = this._quad.data;

    for (let i = 0, j = 0; i < this._floatView.length; ) {
      for (let k = 0; k < 4; k++) {
        floats[j++] = _floatView[i];
        floats[j++] = _floatView[i + 1];
        floats[j++] = _floatView[i + 2];
        floats[j++] = _floatView[i + 3];
        floats[j++] = _floatView[i + 4];
        floats[j++] = quad[k * 2];
        floats[j++] = quad[k * 2 + 1];
      }
      i += strideFloats;
    }
    legacyBuffer.update();
  }
}

class Bars extends Mesh {
  constructor() {
    super(new BarsGeometry(), new BarsShader());
  }

  addRect(x, y, w, h, color) {
    const geometry = this.geometry;
    geometry.addRect(x, y, w, h, color);
  }

  clear() {
    this.geometry.reset();
  }

  _renderDefault(renderer) {
    const geometry = this.geometry;

    const useLegacy = !renderer.geometry.hasInstance;
    if (useLegacy) {
      geometry.initLegacy();
    }
    geometry.updateBuffer();
    if (geometry.instanceCount === 0) {
      return;
    }
    const rt = renderer.renderTexture.current;
    this.shader.uniforms.resolution = rt
      ? rt.baseTexture.resolution
      : renderer.resolution;

    if (useLegacy) {
      // hacky!
      this.geometry = geometry.legacyGeom;
      super._renderDefault(renderer);
      this.geometry = geometry;
      return;
    }
    super._renderDefault(renderer);
  }

  _renderCanvas(renderer) {
    const { points } = this.geometry;
    const { context } = renderer;

    renderer.setContextTransform(this.transform.worldTransform);

    context.beginPath();
    let clr = -1;
    for (let i = 0; i < points.length; i += 5) {
      if (clr !== points[i + 4]) {
        clr = points[i + 4];
        let fill = hex2string(clr);
        context.fillStyle = fill;
      }
      context.beginPath();
      context.rect(points[i], points[i + 1], points[i + 2], points[i + 3]);
      context.fill();
    }
    context.beginPath();
  }
}

const plotVert = `
attribute vec2 aPoint0;
attribute vec2 aPoint1;
attribute vec2 aSides;
attribute vec2 aQuad;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform float resolution;
uniform vec2 lineWidth;
uniform float miterLimit;

varying vec3 line;
varying vec3 lineLeft;
varying vec3 lineRight;
varying vec4 vPixelPos;

const float eps = 0.001;

void main(void) {
float lenX = length(translationMatrix * vec3(1.0, 0.0, 0.0));
float w = (lineWidth.x * lenX + lineWidth.y) * 0.5 * resolution;

vec2 p0 = (translationMatrix * vec3(aPoint0, 1.0)).xy;
vec2 p1 = (translationMatrix * vec3(aPoint1, 1.0)).xy;

p0 *= resolution;
p1 *= resolution;

vec2 k0 = (translationMatrix * vec3(1.0, aSides[0], 0.0)).xy;
vec2 k1 = (translationMatrix * vec3(1.0, aSides[1], 0.0)).xy;

if (p0.x > p1.x) {
    // make everything positive
    vec2 tmp = p0;
    p0 = p1;
    p1 = tmp;
    tmp = k0;
    k0 = k1;
    k1 = tmp;
}

line.x = (p1.y - p0.y) / (p1.x - p0.x);
line.y = p0.y - line.x * p0.x;
line.z = w * sqrt(line.x * line.x + 1.0);

lineLeft.x = k0.y / k0.x;
lineLeft.y = p0.y - lineLeft.x * p0.x;
lineLeft.z = w * sqrt(lineLeft.x * lineLeft.x + 1.0);

lineRight.x = k1.y / k1.x;
lineRight.y = p1.y - lineRight.x * p1.x;
lineRight.z = w * sqrt(lineRight.x * lineRight.x + 1.0);

// calculating quad
vec2 pos = vec2(0.0);

vec2 sign = aQuad;
// strange rounding
if (abs(line.x) < 10.0 && p1.x - p0.x > 3.0) {
    sign.x = 0.5;
}

float H = 0.0;
if (aQuad.x < 0.5) {
    H = min(miterLimit * line.z, max(lineLeft.z, line.z));
    pos = p0;
} else {
    H = min(miterLimit * line.z, max(lineRight.z, line.z));
    pos = p1;
}
H += 2.0;
pos.y += H * (aQuad.y * 2.0 - 1.0);

pos.y -= (pos.x - floor(pos.x + eps + sign.x)) * line.x;
pos = floor(pos + eps + sign * (1.0 - 2.0 * eps));
vPixelPos = vec4(pos - 0.5, pos + 0.5);
gl_Position = vec4((projectionMatrix * vec3(pos / resolution, 1.0)).xy, 0.0, 1.0);
}`;
const plotFrag = `
varying vec3 line;
varying vec3 lineLeft;
varying vec3 lineRight;
varying vec4 vPixelPos;
uniform vec4 uColor;
uniform vec4 uGeomColor;

float cut(float x, float y1, float y2) {
vec2 range = vec2(dot(line, vec3(x, 1.0, -1.0)), dot(line, vec3(x, 1.0, 1.0)));
if (line.x + lineLeft.x > 0.0) {
    float v = dot(lineLeft, vec3(x, 1.0, -1.0));
    if (line.x < lineLeft.x) {
        range.x = min(range.x, v);
    } else {
        range.x = max(range.x, v);
    }
} else {
    float v = dot(lineLeft, vec3(x, 1.0, 1.0));
    if (line.x < lineLeft.x) {
        range.y = min(range.y, v);
    } else {
        range.y = max(range.y, v);
    }
}

if (line.x + lineRight.x < 0.0) {
    float v = dot(lineRight, vec3(x, 1.0, -1.0));
    if (line.x > lineRight.x) {
        range.x = min(range.x, v);
    } else {
        range.x = max(range.x, v);
    }
} else {
    float v = dot(lineRight, vec3(x, 1.0, 1.0));
    if (line.x > lineRight.x) {
        range.y = min(range.y, v);
    } else {
        range.y = max(range.y, v);
    }
}

range.x = max(range.x, y1);
range.y = min(range.y, y2);
return max(range.y - range.x, 0.0);
}

const float N = 8.0;
const float step = 1.0 / N;
const float div = 1.0 / (N + 1.0);

void main(void) {
// float cutLeft = cut(vPixelPos.x, vPixelPos.y, vPixelPos.w);
// float cutRight = cut(vPixelPos.z, vPixelPos.y, vPixelPos.w);
// float clip = (cutLeft + cutRight) / 2.0;

float d = (vPixelPos.z - vPixelPos.x);
float clip = 0.0;
for (float i = 0.0; i < N; i += 1.) {
    clip += cut(vPixelPos.x + d * i * step, vPixelPos.y, vPixelPos.w);
}
clip *= div;

gl_FragColor = uColor * clip + uGeomColor * (1.0 - clip);
}`;

class PlotShader extends MeshMaterial {
  static __initStatic() {
    this._prog = null;
  }

  static getProgram() {
    if (!PlotShader._prog) {
      PlotShader._prog = new Program(plotVert, plotFrag);
    }
    return PlotShader._prog;
  }

  constructor() {
    super(Texture.WHITE, {
      uniforms: {
        resolution: 1,
        lineWidth: new Float32Array([1, 0]),
        miterLimit: 5,
        uGeomColor: new Float32Array([0, 0, 0, 0])
      },
      program: PlotShader.getProgram()
    });
  }
}
PlotShader.__initStatic();

class PlotGeometry extends Geometry {
  constructor(_static = false) {
    super();
    PlotGeometry.prototype.__init.call(this);
    PlotGeometry.prototype.__init2.call(this);
    PlotGeometry.prototype.__init3.call(this);
    PlotGeometry.prototype.__init4.call(this);
    PlotGeometry.prototype.__init5.call(this);
    PlotGeometry.prototype.__init6.call(this);
    PlotGeometry.prototype.__init7.call(this);
    PlotGeometry.prototype.__init8.call(this);
    PlotGeometry.prototype.__init9.call(this);
    PlotGeometry.prototype.__init10.call(this);
    PlotGeometry.prototype.__init11.call(this);
    PlotGeometry.prototype.__init12.call(this);
    PlotGeometry.prototype.__init13.call(this);
    PlotGeometry.prototype.__init14.call(this);
    PlotGeometry.prototype.__init15.call(this);
    PlotGeometry.prototype.__init16.call(this);
    this.initGeom(_static);
    this.reset();
  }

  __init() {
    this.jointStyle = LINE_JOIN.BEVEL;
  }
  __init2() {
    this.lastLen = 0;
  }
  __init3() {
    this.lastPointNum = 0;
  }
  __init4() {
    this.lastPointData = 0;
  }
  __init5() {
    this.updateId = 0;
  }
  __init6() {
    this.points = [];
  }
  __init7() {
    this._floatView = null;
  }
  __init8() {
    this._u32View = null;
  }
  __init9() {
    this._buffer = null;
  }
  __init10() {
    this._quad = null;
  }
  __init11() {
    this._indexBuffer = null;
  }

  initGeom(_static) {
    this._buffer = new Buffer(new Float32Array(0), _static, false);

    this._quad = new Buffer(
      new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      true,
      false
    );

    this._indexBuffer = new Buffer(
      new Uint16Array([0, 1, 2, 0, 2, 3]),
      true,
      true
    );

    this.addAttribute(
      "aPoint0",
      this._buffer,
      2,
      false,
      TYPES.FLOAT,
      undefined,
      undefined,
      true
    )
      .addAttribute(
        "aPoint1",
        this._buffer,
        2,
        false,
        TYPES.FLOAT,
        undefined,
        undefined,
        true
      )
      .addAttribute(
        "aSides",
        this._buffer,
        2,
        false,
        TYPES.FLOAT,
        undefined,
        undefined,
        true
      )
      .addAttribute("aQuad", this._quad, 2, false, TYPES.FLOAT)
      .addIndex(this._indexBuffer);
  }

  __init12() {
    this.stridePoints = 2;
  }
  __init13() {
    this.strideFloats = 6;
  }
  __init14() {
    this.strideBytes = 24;
  }

  moveTo(x, y) {
    const { points } = this;
    points.push(x);
    points.push(y);
  }

  lineTo(x, y) {
    const { points } = this;
    points.push(x);
    points.push(y);
  }

  lineBy(dx, dy) {
    const { points, stridePoints } = this;

    const x = points[points.length - stridePoints];
    const y = points[points.length - stridePoints + 1];

    points.push(x + dx);
    points.push(y + dy);
  }

  invalidate(pointNum = 0) {
    this.lastPointNum = Math.min(pointNum, this.lastPointNum);
    this.updateId++;
  }

  reset() {
    if (this.lastLen > 0) {
      this.clearBufferData();
    }
    this.updateId++;
    this.lastLen = 0;
    this.lastPointData = 0;
    this.points.length = 0;
    this.instanceCount = 0;
  }

  clearBufferData() {
    const { points, strideBytes, stridePoints } = this;
    this.lastPointNum = 0;
    this.lastPointData = 0;
    const arrayLen = Math.max(0, points.length / stridePoints - 1);
    const arrBuf = new ArrayBuffer(strideBytes * arrayLen);
    this.lastLen = points.length;
    this._floatView = new Float32Array(arrBuf);
    this._u32View = new Uint32Array(arrBuf);
    this._buffer.update(arrBuf);
  }

  updateBuffer() {
    const { points, stridePoints, strideFloats } = this;

    if (this.lastLen > points.length) {
      this.lastLen = -1;
    }
    if (this.lastLen < points.length || this.lastPointNum < this.lastLen) {
      // TODO: partial upload
      this.clearBufferData();
    }

    if (this.lastPointNum == this.lastLen) {
      return;
    }

    const { _floatView, _u32View } = this;
    const bevel = this.jointStyle === LINE_JOIN.BEVEL;
    this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
    let j = Math.round((this.lastPointNum * strideFloats) / stridePoints); //actually that's int division
    for (
      let i = this.lastPointNum;
      i < points.length - stridePoints;
      i += stridePoints
    ) {
      const prev = i - stridePoints;
      const next = i + stridePoints;
      const next2 = i + stridePoints * 2;

      _floatView[j++] = points[i];
      _floatView[j++] = points[i + 1];
      _floatView[j++] = points[next];
      _floatView[j++] = points[next + 1];

      const dx = points[next] - points[i];
      const dy = points[next + 1] - points[i + 1];
      const D = Math.sqrt(dx * dx + dy * dy);

      const k = dy / dx;
      if (prev >= 0) {
        const dx2 = points[i] - points[prev];
        const dy2 = points[i + 1] - points[prev + 1];
        if (bevel) {
          const D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
        } else {
          _floatView[j++] = dy2 / dx2;
        }
      } else {
        _floatView[j++] = k;
      }

      if (next2 < points.length) {
        const dx2 = points[next2] - points[next];
        const dy2 = points[next2 + 1] - points[next + 1];
        if (bevel) {
          const D2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          _floatView[j++] = (dy2 * D + dy * D2) / (dx2 * D + dx * D2);
        } else {
          _floatView[j++] = dy2 / dx2;
        }
      } else {
        _floatView[j++] = k;
      }
    }
    this._buffer.update();
    this.instanceCount = Math.round(points.length / stridePoints - 1);

    this.lastPointNum = this.lastLen;
    this.lastPointData = this.lastLen; // TODO: partial upload

    if (this.legacyGeom) {
      this.updateLegacy();
    }
  }

  __init15() {
    this.legacyGeom = null;
  }
  __init16() {
    this.legacyBuffer = null;
  }

  initLegacy() {
    if (this.legacyGeom) {
      return;
    }
    this.legacyGeom = new Geometry();
    this.legacyBuffer = new Buffer(new Float32Array(0), false, false);
    this.legacyGeom
      .addAttribute("aPoint0", this.legacyBuffer, 2, false, TYPES.FLOAT)
      .addAttribute("aPoint1", this.legacyBuffer, 2, false, TYPES.FLOAT)
      .addAttribute("aSides", this.legacyBuffer, 2, false, TYPES.FLOAT)
      .addAttribute("aQuad", this.legacyBuffer, 2, false, TYPES.FLOAT)
      .addIndex(new Buffer(new Uint16Array([0, 1, 2, 0, 2, 3]), false, true));
  }

  updateLegacy() {
    const { legacyBuffer, _floatView, _u32View, strideFloats } = this;
    const strideLegacy = 8;
    const quadsCount = this._floatView.length / strideFloats;
    const legacyLen = quadsCount * strideLegacy * 4;
    if (legacyBuffer.data.length !== legacyLen) {
      legacyBuffer.data = new Float32Array(legacyLen);
      this.legacyGeom.getIndex().update(createIndicesForQuads(quadsCount));
    }
    const floats = legacyBuffer.data;
    const quad = this._quad.data;

    for (let i = 0, j = 0; i < this._floatView.length; ) {
      for (let k = 0; k < 4; k++) {
        floats[j++] = _floatView[i];
        floats[j++] = _floatView[i + 1];
        floats[j++] = _floatView[i + 2];
        floats[j++] = _floatView[i + 3];
        floats[j++] = _floatView[i + 4];
        floats[j++] = _floatView[i + 5];
        floats[j++] = quad[k * 2];
        floats[j++] = quad[k * 2 + 1];
      }
      i += strideFloats;
    }
  }
}

class Plot extends Mesh {
  constructor(options) {
    const geometry = new PlotGeometry();
    const shader = new PlotShader();
    if (options) {
      if (options.jointStyle !== undefined) {
        geometry.jointStyle = options.jointStyle;
      }
      if (options.lineWidth !== undefined) {
        shader.uniforms.lineWidth[0] = options.lineWidth;
      }
      if (options.nativeLineWidth !== undefined) {
        shader.uniforms.lineWidth[1] = options.nativeLineWidth;
      }
    }

    super(geometry, shader);
  }

  moveTo(x, y) {
    const geometry = this.geometry;
    geometry.moveTo(x, y);
  }

  lineTo(x, y) {
    const geometry = this.geometry;
    geometry.lineTo(x, y);
  }

  lineBy(x, y) {
    const geometry = this.geometry;
    geometry.lineBy(x, y);
  }

  lineStyle(width, nativeWidth, jointStyle) {
    const geometry = this.geometry;
    if (width !== undefined) {
      this.shader.uniforms.lineWidth[0] = width;
    }
    if (nativeWidth !== undefined) {
      this.shader.uniforms.lineWidth[1] = nativeWidth;
    }
    if (jointStyle !== undefined) {
      geometry.jointStyle = jointStyle;
    }
    geometry.invalidate();
  }

  clear() {
    this.geometry.reset();
  }

  _renderDefault(renderer) {
    const geometry = this.geometry;

    const useLegacy = !renderer.geometry.hasInstance;
    if (useLegacy) {
      geometry.initLegacy();
    }
    geometry.updateBuffer();
    if (geometry.instanceCount === 0) {
      return;
    }
    const rt = renderer.renderTexture.current;
    this.shader.uniforms.resolution = rt
      ? rt.baseTexture.resolution
      : renderer.resolution;

    if (useLegacy) {
      // hacky!
      this.geometry = geometry.legacyGeom;
      super._renderDefault(renderer);
      this.geometry = geometry;
      return;
    }
    super._renderDefault(renderer);
  }

  _renderCanvas(renderer) {
    const { points, stridePoints } = this.geometry;
    const { context } = renderer;
    const len = points.length;
    if (len < 2) {
      return;
    }
    const wt = this.transform.worldTransform;
    renderer.setContextTransform(wt);

    const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
    context.lineWidth =
      this.shader.uniforms.lineWidth[0] +
      this.shader.uniforms.lineWidth[1] / scale;

    context.strokeStyle = hex2string(this.tint);
    context.globalAlpha = this.worldAlpha;

    context.beginPath();
    context.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += stridePoints) {
      context.lineTo(points[i], points[i + 1]);
    }
    context.stroke();
    context.beginPath();

    context.globalAlpha = 1.0;
  }
}

const gradVert = `
attribute vec2 aVertexPosition;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec2 rangeY;

varying float vOrdinate;

void main(void)
{
vec2 pos = (translationMatrix * vec3(aVertexPosition, 1.0)).xy;
if (pos.y > rangeY.y) {
    pos.y = rangeY.y;
}
gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
vOrdinate = pos.y;
}`;
const gradFrag = `
varying float vOrdinate;

uniform vec4 colorTop;
uniform vec4 colorBottom;
uniform vec4 uColor;
uniform vec2 rangeY2;

void main(void)
{
vec4 color = colorTop;
if (vOrdinate > rangeY2.x) {
    if (vOrdinate >= rangeY2.y) {
        color = colorBottom;
    } else {
        color = colorTop + (colorBottom - colorTop) * (vOrdinate - rangeY2.x) / (rangeY2.y - rangeY2.x);
    }
}

color.rgb *= color.a;
gl_FragColor = color * uColor;
}
`;

class PlotGradientShader extends MeshMaterial {
  static __initStatic() {
    this._prog = null;
  }

  static getProgram() {
    if (!PlotGradientShader._prog) {
      PlotGradientShader._prog = new Program(gradVert, gradFrag);
    }
    return PlotGradientShader._prog;
  }

  constructor() {
    const rangeY = new Float32Array(2);
    super(Texture.WHITE, {
      uniforms: {
        resolution: 1,
        colorTop: new Float32Array([1, 1, 1, 1]),
        colorBottom: new Float32Array([1, 1, 1, 1]),
        rangeY: rangeY,
        rangeY2: rangeY
      },
      program: PlotGradientShader.getProgram()
    });
  }
}
PlotGradientShader.__initStatic();

class PlotGradientGeometry extends Geometry {
  constructor(_static = false) {
    super();
    PlotGradientGeometry.prototype.__init.call(this);
    PlotGradientGeometry.prototype.__init2.call(this);
    PlotGradientGeometry.prototype.__init3.call(this);
    PlotGradientGeometry.prototype.__init4.call(this);
    PlotGradientGeometry.prototype.__init5.call(this);
    PlotGradientGeometry.prototype.__init6.call(this);
    PlotGradientGeometry.prototype.__init7.call(this);
    PlotGradientGeometry.prototype.__init8.call(this);
    PlotGradientGeometry.prototype.__init9.call(this);
    this.initGeom(_static);
    this.reset();
  }

  __init() {
    this.lastLen = 0;
  }
  __init2() {
    this.lastPointNum = 0;
  }
  __init3() {
    this.lastPointData = 0;
  }
  __init4() {
    this.points = [];
  }
  __init5() {
    this._floatView = null;
  }
  __init6() {
    this._buffer = null;
  }

  initGeom(_static) {
    this._buffer = new Buffer(new Float32Array(0), _static, false);

    this.addAttribute("aVertexPosition", this._buffer, 2, false, TYPES.FLOAT);
  }

  __init7() {
    this.stridePoints = 2;
  }
  __init8() {
    this.strideFloats = 2 * 6;
  }
  __init9() {
    this.strideBytes = 8 * 6;
  }

  moveTo(x, y) {
    const { points } = this;
    points.push(x);
    points.push(y);
  }

  lineTo(x, y) {
    const { points } = this;
    points.push(x);
    points.push(y);
  }

  invalidate(pointNum = 0) {
    this.lastPointNum = Math.min(pointNum, this.lastPointNum);
  }

  reset() {
    if (this.lastLen > 0) {
      this.clearBufferData();
    }
    this.lastLen = 0;
    this.lastPointData = 0;
    this.points.length = 0;
  }

  clearBufferData() {
    const { points, strideFloats, stridePoints } = this;
    this.lastPointNum = 0;
    this.lastPointData = 0;
    const arrayLen = Math.max(0, points.length / stridePoints - 1);
    this._floatView = new Float32Array(strideFloats * arrayLen);
    this._buffer.update(this._floatView);
    this.lastLen = points.length;
  }

  updateBuffer() {
    const { points, stridePoints, strideFloats } = this;

    if (this.lastLen > points.length) {
      this.lastLen = -1;
    }
    if (this.lastLen < points.length || this.lastPointNum < this.lastLen) {
      // TODO: partial upload
      this.clearBufferData();
    }

    if (this.lastPointNum == this.lastLen) {
      return;
    }

    const { _floatView } = this;
    this.lastPointData = Math.min(this.lastPointData, this.lastPointNum);
    let j = Math.round((this.lastPointNum * strideFloats) / stridePoints);
    for (
      let i = this.lastPointNum;
      i < points.length - stridePoints;
      i += stridePoints
    ) {
      const next = i + stridePoints;

      const x = points[i],
        y = points[i + 1],
        x2 = points[next],
        y2 = points[next + 1];

      const bottomLine = 10000.0;

      _floatView[j++] = x;
      _floatView[j++] = y;
      _floatView[j++] = x2;
      _floatView[j++] = y2;
      _floatView[j++] = x2;
      _floatView[j++] = bottomLine;
      _floatView[j++] = x;
      _floatView[j++] = y;
      _floatView[j++] = x2;
      _floatView[j++] = bottomLine;
      _floatView[j++] = x;
      _floatView[j++] = bottomLine;
    }
    this._buffer.update();

    this.lastPointNum = this.lastLen;
    this.lastPointData = this.lastLen; // TODO: partial upload
  }
}

class PlotGradient extends Mesh {
  constructor() {
    super(new PlotGradientGeometry(), new PlotGradientShader());
    PlotGradient.prototype.__init10.call(this);
    PlotGradient.prototype.__init11.call(this);
  }

  get coordTop() {
    return this.shader.uniforms.rangeY[0];
  }

  set coordTop(value) {
    this.shader.uniforms.rangeY[0] = value;
  }

  get coordBottom() {
    return this.shader.uniforms.rangeY[1];
  }

  set coordBottom(value) {
    this.shader.uniforms.rangeY[1] = value;
  }

  get alphaTop() {
    return this.shader.uniforms.colorTop[3];
  }

  set alphaTop(value) {
    this.shader.uniforms.colorTop[3] = value;
  }

  get alphaBottom() {
    return this.shader.uniforms.colorBottom[3];
  }

  set alphaBottom(value) {
    this.shader.uniforms.colorBottom[3] = value;
  }

  get colorBottom() {
    return rgb2hex(this.shader.uniforms.colorBottom);
  }

  set colorBottom(value) {
    hex2rgb(value, this.shader.uniforms.colorBottom);
  }

  get colorTop() {
    return rgb2hex(this.shader.uniforms.colorTop);
  }

  set colorTop(value) {
    hex2rgb(value, this.shader.uniforms.colorTop);
  }

  __init10() {
    this.masterPlot = null;
  }
  __init11() {
    this.plotUpdateId = -1;
  }

  clear() {
    if (!this.masterPlot) {
      this.geometry.reset();
    }
  }

  moveTo(x, y) {
    this.lineTo(x, y);
  }

  lineTo(x, y) {
    if (!this.masterPlot) {
      this.geometry.lineTo(x, y);
    }
  }

  _render(renderer) {
    const geom = this.geometry;
    if (this.masterPlot) {
      const plotGeom = this.masterPlot.geometry;
      if (this.plotUpdateId !== plotGeom.updateId) {
        this.plotUpdateId = plotGeom.updateId;
        geom.points = plotGeom.points;
        geom.invalidate();
      }
    }
    geom.updateBuffer();

    this._renderDefault(renderer);
  }

  _renderCanvas(renderer) {
    this.geometry;
    // let points = geom.points;
    // if (this.masterPlot) {
    //     const plotGeom = this.masterPlot.geometry as PlotGeometry;
    //     if (this.plotUpdateId !== plotGeom.updateId) {
    //         this.plotUpdateId = plotGeom.updateId
    //         geom.points = plotGeom.points;
    //     }
    // }
    //
    //
    // const {points, stridePoints} = this.geometry as BarsGeometry;
    // const {context} = renderer;
    // const len = points.length;
    // if (len < 2) {
    //     return;
    // }
    // const wt = this.transform.worldTransform;
    // renderer.setContextTransform(wt);
    //
    // const scale = Math.sqrt(wt.a * wt.a + wt.b * wt.b);
    // context.lineWidth = this.shader.uniforms.lineWidth[0] + this.shader.uniforms.lineWidth[1] / scale;
    //
    // context.strokeStyle = utils.hex2string(this.tint);
    // context.globalAlpha = this.worldAlpha;
    //
    // context.beginPath();
    // context.moveTo(points[0], points[1]);
    // for (let i = 2; i < points.length; i += stridePoints) {
    //     context.lineTo(points[i], points[i + 1]);
    // }
    // context.stroke();
    // context.beginPath();
    //
    // context.globalAlpha = 1.0;
  }
}

class BuildData {
  constructor() {
    BuildData.prototype.__init.call(this);
    BuildData.prototype.__init2.call(this);
    BuildData.prototype.__init3.call(this);
    BuildData.prototype.__init4.call(this);
    BuildData.prototype.__init5.call(this);
  }
  __init() {
    this.verts = [];
  }
  __init2() {
    this.joints = [];
  }
  __init3() {
    this.vertexSize = 0;
  }
  __init4() {
    this.indexSize = 0;
  }
  __init5() {
    this.closePointEps = 1e-4;
  }

  clear() {
    this.verts.length = 0;
    this.joints.length = 0;
    this.vertexSize = 0;
    this.indexSize = 0;
  }

  destroy() {
    this.verts.length = 0;
    this.joints.length = 0;
  }
}

var JOINT_TYPE;
(function (JOINT_TYPE) {
  const NONE = 0;
  JOINT_TYPE[(JOINT_TYPE["NONE"] = NONE)] = "NONE";
  const FILL = 1;
  JOINT_TYPE[(JOINT_TYPE["FILL"] = FILL)] = "FILL";
  const JOINT_BEVEL = 4;
  JOINT_TYPE[(JOINT_TYPE["JOINT_BEVEL"] = JOINT_BEVEL)] = "JOINT_BEVEL";
  const JOINT_MITER = 8;
  JOINT_TYPE[(JOINT_TYPE["JOINT_MITER"] = JOINT_MITER)] = "JOINT_MITER";
  const JOINT_ROUND = 12;
  JOINT_TYPE[(JOINT_TYPE["JOINT_ROUND"] = JOINT_ROUND)] = "JOINT_ROUND";
  const JOINT_CAP_BUTT = 16;
  JOINT_TYPE[(JOINT_TYPE["JOINT_CAP_BUTT"] = JOINT_CAP_BUTT)] =
    "JOINT_CAP_BUTT";
  const JOINT_CAP_SQUARE = 18;
  JOINT_TYPE[(JOINT_TYPE["JOINT_CAP_SQUARE"] = JOINT_CAP_SQUARE)] =
    "JOINT_CAP_SQUARE";
  const JOINT_CAP_ROUND = 20;
  JOINT_TYPE[(JOINT_TYPE["JOINT_CAP_ROUND"] = JOINT_CAP_ROUND)] =
    "JOINT_CAP_ROUND";
  const FILL_EXPAND = 24;
  JOINT_TYPE[(JOINT_TYPE["FILL_EXPAND"] = FILL_EXPAND)] = "FILL_EXPAND";
  const CAP_BUTT = 1 << 5;
  JOINT_TYPE[(JOINT_TYPE["CAP_BUTT"] = CAP_BUTT)] = "CAP_BUTT";
  const CAP_SQUARE = 2 << 5;
  JOINT_TYPE[(JOINT_TYPE["CAP_SQUARE"] = CAP_SQUARE)] = "CAP_SQUARE";
  const CAP_ROUND = 3 << 5;
  JOINT_TYPE[(JOINT_TYPE["CAP_ROUND"] = CAP_ROUND)] = "CAP_ROUND";
  const CAP_BUTT2 = 4 << 5;
  JOINT_TYPE[(JOINT_TYPE["CAP_BUTT2"] = CAP_BUTT2)] = "CAP_BUTT2";
})(JOINT_TYPE || (JOINT_TYPE = {}));

class SegmentPacker {
  constructor() {
    SegmentPacker.prototype.__init.call(this);
    SegmentPacker.prototype.__init2.call(this);
    SegmentPacker.prototype.__init3.call(this);
  }
  static __initStatic() {
    this.vertsByJoint = [];
  }

  __init() {
    this.strideFloats = 12;
  }

  updateBufferSize(jointStart, jointLen, triangles, target) {
    const { joints } = target;
    let foundTriangle = false;

    let vertexSize = 0;
    let indexSize = 0;
    for (let i = jointStart; i < jointStart + jointLen; i++) {
      const prevCap = joints[i] & ~31;
      const joint = joints[i] & 31;

      if (joint === JOINT_TYPE.FILL) {
        foundTriangle = true;
        vertexSize++;
        continue;
      }

      if (joint >= JOINT_TYPE.FILL_EXPAND) {
        vertexSize += 3;
        indexSize += 3;
        continue;
      }

      const vs =
        SegmentPacker.vertsByJoint[joint] + SegmentPacker.vertsByJoint[prevCap];
      if (vs >= 3) {
        vertexSize += vs;
        indexSize += (vs - 2) * 3;
      }
    }
    if (foundTriangle) {
      indexSize += triangles;
    }

    target.vertexSize += vertexSize;
    target.indexSize += indexSize;
  }

  __init2() {
    this.bufferPos = 0;
  }
  __init3() {
    this.indexPos = 0;
  }

  beginPack(
    buildData,
    bufFloat,
    bufUint,
    indices,
    bufferPos = 0,
    indexPos = 0
  ) {
    this.buildData = buildData;
    this.bufFloat = bufFloat;
    this.bufUint = bufUint;
    this.indices = indices;
    this.bufferPos = bufferPos;
    this.indexPos = indexPos;
  }

  endPack() {
    this.buildData = null;
    this.bufFloat = null;
    this.bufUint = null;
    this.indices = null;
  }

  packInterleavedGeometry(jointStart, jointLen, triangles, lineStyle, color) {
    const { bufFloat, bufUint, indices, buildData, strideFloats } = this;
    const { joints, verts } = buildData;

    let bufPos = this.bufferPos;
    let indPos = this.indexPos;
    let index = this.bufferPos / this.strideFloats;

    let x1, y1, x2, y2, prevX, prevY, nextX, nextY;
    let hasTriangle = false;

    for (let j = jointStart; j < jointStart + jointLen; j++) {
      const fullJoint = joints[j];
      const prevCap = joints[j] & ~31;
      const joint = joints[j] & 31;

      if (joint === JOINT_TYPE.FILL) {
        // just one vertex
        hasTriangle = true;
        x1 = verts[j * 2];
        y1 = verts[j * 2 + 1];
        bufFloat[bufPos] = x1;
        bufFloat[bufPos + 1] = y1;
        bufFloat[bufPos + 2] = x1;
        bufFloat[bufPos + 3] = y1;
        bufFloat[bufPos + 4] = x1;
        bufFloat[bufPos + 5] = y1;
        bufFloat[bufPos + 6] = x1;
        bufFloat[bufPos + 7] = y1;
        bufFloat[bufPos + 8] = 16 * joint;
        bufFloat[bufPos + 9] = 0;
        bufFloat[bufPos + 10] = 0;
        bufUint[bufPos + 11] = color;
        bufPos += strideFloats;
        continue;
      }

      if (joint >= JOINT_TYPE.FILL_EXPAND) {
        prevX = verts[j * 2];
        prevY = verts[j * 2 + 1];
        x1 = verts[j * 2 + 2];
        y1 = verts[j * 2 + 3];
        x2 = verts[j * 2 + 4];
        y2 = verts[j * 2 + 5];

        const bis = j + 3;
        for (let i = 0; i < 3; i++) {
          bufFloat[bufPos] = prevX;
          bufFloat[bufPos + 1] = prevY;
          bufFloat[bufPos + 2] = x1;
          bufFloat[bufPos + 3] = y1;
          bufFloat[bufPos + 4] = x2;
          bufFloat[bufPos + 5] = y2;
          bufFloat[bufPos + 6] = verts[(bis + i) * 2];
          bufFloat[bufPos + 7] = verts[(bis + i) * 2 + 1];
          bufFloat[bufPos + 8] = 16 * fullJoint + i;
          bufFloat[bufPos + 9] = 0;
          bufFloat[bufPos + 10] = 0;
          bufUint[bufPos + 11] = color;
          bufPos += strideFloats;
        }

        indices[indPos] = index;
        indices[indPos + 1] = index + 1;
        indices[indPos + 2] = index + 2;
        indPos += 3;
        index += 3;
        continue;
      }

      const vs =
        SegmentPacker.vertsByJoint[joint] + SegmentPacker.vertsByJoint[prevCap];
      if (vs === 0) {
        continue;
      }
      x1 = verts[j * 2];
      y1 = verts[j * 2 + 1];
      x2 = verts[j * 2 + 2];
      y2 = verts[j * 2 + 3];
      //TODO: caps here
      prevX = verts[j * 2 - 2];
      prevY = verts[j * 2 - 1];

      if ((joint & ~2) !== JOINT_TYPE.JOINT_CAP_BUTT) {
        nextX = verts[j * 2 + 4];
        nextY = verts[j * 2 + 5];
      } else {
        nextX = x1;
        nextY = y1;
      }

      for (let i = 0; i < vs; i++) {
        bufFloat[bufPos] = prevX;
        bufFloat[bufPos + 1] = prevY;
        bufFloat[bufPos + 2] = x1;
        bufFloat[bufPos + 3] = y1;
        bufFloat[bufPos + 4] = x2;
        bufFloat[bufPos + 5] = y2;
        bufFloat[bufPos + 6] = nextX;
        bufFloat[bufPos + 7] = nextY;
        bufFloat[bufPos + 8] = 16 * fullJoint + i;
        bufFloat[bufPos + 9] = lineStyle;
        bufFloat[bufPos + 10] = 0;
        bufUint[bufPos + 11] = color;
        bufPos += strideFloats;
      }

      indices[indPos] = index;
      indices[indPos + 1] = index + 1;
      indices[indPos + 2] = index + 2;
      indices[indPos + 3] = index;
      indices[indPos + 4] = index + 2;
      indices[indPos + 5] = index + 3;
      indPos += 6;
      for (let j = 5; j + 1 < vs; j++) {
        indices[indPos] = index + 4;
        indices[indPos + 1] = index + j;
        indices[indPos + 2] = index + j + 1;
        indPos += 3;
      }
      index += vs;
    }

    if (hasTriangle) {
      for (let i = 0; i < triangles.length; i++) {
        indices[indPos + i] = triangles[i] + index;
      }
      indPos += triangles.length;
    }

    this.bufferPos = bufPos;
    this.indexPos = indPos;
  }
}
SegmentPacker.__initStatic();

const verts = SegmentPacker.vertsByJoint;
for (let i = 0; i < 256; i++) verts.push(0);
// simple fill
verts[JOINT_TYPE.FILL] = 1;

for (let i = 0; i < 8; i++) {
  verts[JOINT_TYPE.FILL_EXPAND + i] = 3;
}

// no caps for now
verts[JOINT_TYPE.JOINT_BEVEL] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 1] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 2] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 3] = 4 + 3;
verts[JOINT_TYPE.JOINT_ROUND] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 1] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 2] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 3] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER] = 4 + 4;
verts[JOINT_TYPE.JOINT_MITER + 1] = 4 + 4;
verts[JOINT_TYPE.JOINT_MITER + 2] = 4;
verts[JOINT_TYPE.JOINT_MITER + 3] = 4;
verts[JOINT_TYPE.JOINT_CAP_BUTT] = 4;
verts[JOINT_TYPE.JOINT_CAP_BUTT + 1] = 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE] = 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE + 1] = 4;
verts[JOINT_TYPE.JOINT_CAP_ROUND] = 4 + 4;
verts[JOINT_TYPE.JOINT_CAP_ROUND + 1] = 4 + 4;

verts[JOINT_TYPE.CAP_ROUND] = 4;

/**
 * A class to contain data useful for Graphics objects
 *
 * @class
 * @memberof PIXI
 */
class SmoothGraphicsData {
  // result of simplification

  // indices in build

  constructor(shape, fillStyle = null, lineStyle = null, matrix = null) {
    this.shape = shape;

    this.lineStyle = lineStyle;

    this.fillStyle = fillStyle;

    this.matrix = matrix;

    this.type = shape.type;

    this.points = [];

    this.holes = [];

    this.triangles = [];

    this.closeStroke = false;

    this.clearBuild();
  }

  clearPath() {
    this.points.length = 0;
    this.closeStroke = true;
  }

  clearBuild() {
    this.triangles.length = 0;
    this.fillStart = 0;
    this.fillLen = 0;
    this.strokeStart = 0;
    this.strokeLen = 0;
    this.fillAA = false;
  }

  clone() {
    return new SmoothGraphicsData(
      this.shape,
      this.fillStyle,
      this.lineStyle,
      this.matrix
    );
  }

  capType() {
    let cap;
    switch (this.lineStyle.cap) {
      case LINE_CAP.SQUARE:
        cap = JOINT_TYPE.CAP_SQUARE;
        break;
      case LINE_CAP.ROUND:
        cap = JOINT_TYPE.CAP_ROUND;
        break;
      default:
        cap = JOINT_TYPE.CAP_BUTT;
        break;
    }
    return cap;
  }

  jointType() {
    let joint;
    switch (this.lineStyle.join) {
      case LINE_JOIN.BEVEL:
        joint = JOINT_TYPE.JOINT_BEVEL;
        break;
      case LINE_JOIN.ROUND:
        joint = JOINT_TYPE.JOINT_ROUND;
        break;
      default:
        joint = JOINT_TYPE.JOINT_MITER;
        break;
    }
    return joint;
  }

  destroy() {
    this.shape = null;
    this.holes.length = 0;
    this.holes = null;
    this.points.length = 0;
    this.points = null;
    this.lineStyle = null;
    this.fillStyle = null;
    this.triangles = null;
  }
}

// for type only

class CircleBuilder {
  path(graphicsData, target) {
    // need to convert points to a nice regular data
    const circleData = graphicsData.shape;
    const points = graphicsData.points;
    const x = circleData.x;
    const y = circleData.y;
    let width;
    let height;
    // TODO - bit hacky??
    if (graphicsData.type === SHAPES.CIRC) {
      width = circleData.radius;
      height = circleData.radius;
    } else {
      const ellipseData = graphicsData.shape;

      width = ellipseData.width;
      height = ellipseData.height;
    }

    if (width === 0 || height === 0) {
      return;
    }

    points.push(x, y);

    let totalSegs =
      Math.floor(30 * Math.sqrt(circleData.radius)) ||
      Math.floor(15 * Math.sqrt(width + height));

    totalSegs /= 2.3;
    if (totalSegs < 3) {
      totalSegs = 3;
    }

    const seg = (Math.PI * 2) / totalSegs;

    for (let i = 0; i < totalSegs - 0.5; i++) {
      points.push(
        x + Math.sin(-seg * i) * width,
        y + Math.cos(-seg * i) * height
      );
    }
  }

  fill(graphicsData, target) {
    const { verts, joints } = target;
    const { points, triangles } = graphicsData;

    let vertPos = 1;
    const center = 0;

    if (!graphicsData.fillAA) {
      for (let i = 0; i < points.length; i += 2) {
        verts.push(points[i], points[i + 1]);
        joints.push(JOINT_TYPE.FILL);
        if (i > 2) {
          triangles.push(vertPos++, center, vertPos);
        }
      }
      triangles.push(vertPos, center, 1);
      return;
    }

    let cx = points[0],
      cy = points[1];
    let rad = graphicsData.shape.radius;

    for (let i = 2; i < points.length; i += 2) {
      let cur = i,
        next = i + 2 < points.length ? i + 2 : 2;
      verts.push(cx);
      verts.push(cy);
      verts.push(points[cur]);
      verts.push(points[cur + 1]);
      verts.push(points[next]);
      verts.push(points[next + 1]);

      verts.push(0);
      verts.push(0);
      verts.push((points[cur] - cx) / rad);
      verts.push((points[cur + 1] - cy) / rad);
      verts.push((points[next] - cx) / rad);
      verts.push((points[next + 1] - cy) / rad);

      joints.push(JOINT_TYPE.FILL_EXPAND + 2);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
    }
  }

  line(graphicsData, target) {
    const { verts, joints } = target;
    const { points } = graphicsData;
    const joint = graphicsData.jointType();
    const len = points.length;

    verts.push(points[len - 2], points[len - 1]);
    joints.push(JOINT_TYPE.NONE);
    for (let i = 2; i < len; i += 2) {
      verts.push(points[i], points[i + 1]);
      joints.push(joint + 3);
    }
    verts.push(points[2], points[3]);
    joints.push(JOINT_TYPE.NONE);
    verts.push(points[4], points[5]);
    joints.push(JOINT_TYPE.NONE);
  }
}

class RectangleBuilder {
  path(graphicsData, target) {
    // --- //
    // need to convert points to a nice regular data
    //
    const rectData = graphicsData.shape;
    const x = rectData.x;
    const y = rectData.y;
    const width = rectData.width;
    const height = rectData.height;
    const points = graphicsData.points;

    points.length = 0;

    points.push(x, y, x + width, y, x + width, y + height, x, y + height);
  }

  line(graphicsData, target) {
    const { verts, joints } = target;
    const { points } = graphicsData;

    const joint = graphicsData.jointType();
    const len = points.length;

    verts.push(points[len - 2], points[len - 1]);
    joints.push(JOINT_TYPE.NONE);
    for (let i = 0; i < len; i += 2) {
      verts.push(points[i], points[i + 1]);
      joints.push(joint + 3);
    }
    verts.push(points[0], points[1]);
    joints.push(JOINT_TYPE.NONE);
    verts.push(points[2], points[3]);
    joints.push(JOINT_TYPE.NONE);
  }

  fill(graphicsData, target) {
    const { verts, joints } = target;
    const { points, triangles } = graphicsData;

    triangles.length = 0;

    verts.length / 2;

    verts.push(
      points[0],
      points[1],
      points[2],
      points[3],
      points[4],
      points[5],
      points[6],
      points[7]
    );

    joints.push(
      JOINT_TYPE.FILL,
      JOINT_TYPE.FILL,
      JOINT_TYPE.FILL,
      JOINT_TYPE.FILL
    );
    triangles.push(0, 1, 2, 0, 2, 3);
  }
}

function getPt(n1, n2, perc) {
  const diff = n2 - n1;

  return n1 + diff * perc;
}

function quadraticBezierCurve(fromX, fromY, cpX, cpY, toX, toY, out = []) {
  const n = 20;
  const points = out;

  let xa = 0;
  let ya = 0;
  let xb = 0;
  let yb = 0;
  let x = 0;
  let y = 0;

  for (let i = 0, j = 0; i <= n; ++i) {
    j = i / n;

    // The Green Line
    xa = getPt(fromX, cpX, j);
    ya = getPt(fromY, cpY, j);
    xb = getPt(cpX, toX, j);
    yb = getPt(cpY, toY, j);

    // The Black Dot
    x = getPt(xa, xb, j);
    y = getPt(ya, yb, j);

    points.push(x, y);
  }

  return points;
}

class RoundedRectangleBuilder {
  path(graphicsData, target) {
    const rrectData = graphicsData.shape;
    const { points } = graphicsData;
    const x = rrectData.x;
    const y = rrectData.y;
    const width = rrectData.width;
    const height = rrectData.height;

    // Don't allow negative radius or greater than half the smallest width
    const radius = Math.max(
      0,
      Math.min(rrectData.radius, Math.min(width, height) / 2)
    );

    points.length = 0;

    // No radius, do a simple rectangle
    if (!radius) {
      points.push(x, y, x + width, y, x + width, y + height, x, y + height);
    } else {
      quadraticBezierCurve(x, y + radius, x, y, x + radius, y, points);
      quadraticBezierCurve(
        x + width - radius,
        y,
        x + width,
        y,
        x + width,
        y + radius,
        points
      );
      quadraticBezierCurve(
        x + width,
        y + height - radius,
        x + width,
        y + height,
        x + width - radius,
        y + height,
        points
      );
      quadraticBezierCurve(
        x + radius,
        y + height,
        x,
        y + height,
        x,
        y + height - radius,
        points
      );
    }
  }

  line(graphicsData, target) {
    const { verts, joints } = target;
    const { points } = graphicsData;

    const joint = graphicsData.jointType();
    const len = points.length;

    verts.push(points[len - 2], points[len - 1]);
    joints.push(JOINT_TYPE.NONE);
    for (let i = 0; i < len; i += 2) {
      verts.push(points[i], points[i + 1]);
      joints.push(joint + 3);
    }
    verts.push(points[0], points[1]);
    joints.push(JOINT_TYPE.NONE);
  }

  fill(graphicsData, target) {
    const { verts, joints } = target;
    const { points, triangles } = graphicsData;

    verts.length / 2;

    graphicsData.triangles = earcut(points, null, 2);

    for (let i = 0, j = points.length; i < j; i++) {
      verts.push(points[i], points[++i]);
      joints.push(JOINT_TYPE.FILL);
    }
  }
}

let tempArr = [];

class PolyBuilder {
  path(graphicsData, buildData) {
    const shape = graphicsData.shape;
    let points = (graphicsData.points = shape.points.slice());
    const eps = buildData.closePointEps;
    const eps2 = eps * eps;

    if (points.length === 0) {
      return;
    }

    const firstPoint = new Point(points[0], points[1]);
    const lastPoint = new Point(
      points[points.length - 2],
      points[points.length - 1]
    );
    const closedShape = (graphicsData.closeStroke = shape.closeStroke);

    let len = points.length;
    let newLen = 2;

    // 1. remove equal points
    for (let i = 2; i < len; i += 2) {
      const x1 = points[i - 2],
        y1 = points[i - 1],
        x2 = points[i],
        y2 = points[i + 1];
      let flag = true;
      if (Math.abs(x1 - x2) < eps && Math.abs(y1 - y2) < eps) {
        flag = false;
      }

      if (flag) {
        points[newLen] = points[i];
        points[newLen + 1] = points[i + 1];
        newLen += 2;
      }
    }
    points.length = len = newLen;

    newLen = 2;
    // 2. remove middle points
    for (let i = 2; i + 2 < len; i += 2) {
      let x1 = points[i - 2],
        y1 = points[i - 1],
        x2 = points[i],
        y2 = points[i + 1],
        x3 = points[i + 2],
        y3 = points[i + 3];

      x1 -= x2;
      y1 -= y2;
      x3 -= x2;
      y3 -= y2;
      let flag = true;
      if (Math.abs(x3 * y1 - y3 * x1) < eps2) {
        if (x1 * x2 + y1 * y2 < -eps2) {
          flag = false;
        }
      }

      if (flag) {
        points[newLen] = points[i];
        points[newLen + 1] = points[i + 1];
        newLen += 2;
      }
    }
    points[newLen] = points[len - 2];
    points[newLen + 1] = points[len - 1];
    newLen += 2;

    points.length = len = newLen;

    if (len <= 2) {
      // suddenly, nothing
      return;
    }

    if (closedShape) {
      // first point should be last point in closed line!
      const closedPath =
        Math.abs(firstPoint.x - lastPoint.x) < eps &&
        Math.abs(firstPoint.y - lastPoint.y) < eps;

      if (closedPath) {
        points.pop();
        points.pop();
      }
    }
  }

  line(graphicsData, buildData) {
    const { closeStroke, points } = graphicsData;
    const eps = buildData.closePointEps;
    const len = points.length;
    graphicsData.lineStyle;

    if (len <= 2) {
      return;
    }
    const { verts, joints } = buildData;

    //TODO: alignment

    let joint = graphicsData.jointType();
    let cap = graphicsData.capType();
    let prevCap = 0;

    let prevX, prevY;
    if (closeStroke) {
      prevX = points[len - 2];
      prevY = points[len - 1];
      joints.push(JOINT_TYPE.NONE);
    } else {
      prevX = points[2];
      prevY = points[3];
      if (cap === JOINT_TYPE.CAP_ROUND) {
        verts.push(points[0], points[1]);
        joints.push(JOINT_TYPE.NONE);
        joints.push(JOINT_TYPE.CAP_ROUND);
        prevCap = 0;
      } else {
        prevCap = cap;
        joints.push(JOINT_TYPE.NONE);
      }
    }
    verts.push(prevX, prevY);

    /* Line segments of interest where (x1,y1) forms the corner. */
    for (let i = 0; i < len; i += 2) {
      const x1 = points[i],
        y1 = points[i + 1];

      let x2, y2;
      if (i + 2 < len) {
        x2 = points[i + 2];
        y2 = points[i + 3];
      } else {
        x2 = points[0];
        y2 = points[1];
      }

      const dx = x2 - x1;
      const dy = y2 - y1;
      let nextX, nextY;

      let endJoint = joint;
      if (i + 2 >= len) {
        nextX = points[2];
        nextY = points[3];
        if (!closeStroke) {
          endJoint = JOINT_TYPE.NONE;
        }
      } else if (i + 4 >= len) {
        nextX = points[0];
        nextY = points[1];
        if (!closeStroke) {
          if (cap === JOINT_TYPE.CAP_ROUND) {
            endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
          }
          if (cap === JOINT_TYPE.CAP_BUTT) {
            endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
          }
          if (cap === JOINT_TYPE.CAP_SQUARE) {
            endJoint = JOINT_TYPE.JOINT_CAP_SQUARE;
          }
        }
      } else {
        nextX = points[i + 4];
        nextY = points[i + 5];
      }

      const dx3 = x1 - prevX;
      const dy3 = y1 - prevY;

      if (joint >= JOINT_TYPE.JOINT_BEVEL && joint <= JOINT_TYPE.JOINT_MITER) {
        const dx2 = nextX - x2;
        const dy2 = nextY - y2;
        if (
          endJoint >= JOINT_TYPE.JOINT_BEVEL &&
          endJoint <= JOINT_TYPE.JOINT_MITER + 3
        ) {
          const D = dx2 * dy - dy2 * dx;
          if (Math.abs(D) < eps) {
            switch (joint & ~3) {
              case JOINT_TYPE.JOINT_ROUND:
                endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
                break;
              default:
                endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
                break;
            }
          }
        }

        if (joint === JOINT_TYPE.JOINT_MITER) {
          let jointAdd = 0;
          if (dx3 * dx + dy3 * dy > -eps) {
            jointAdd++;
          }
          if (
            endJoint === JOINT_TYPE.JOINT_MITER &&
            dx2 * dx + dy2 * dy > -eps
          ) {
            jointAdd += 2;
          }
          endJoint += jointAdd;
        }
      }
      if (prevCap === 0) {
        if (Math.abs(dx3 * dy - dy3 * dx) < eps) {
          prevCap = JOINT_TYPE.CAP_BUTT2;
        }
      }
      endJoint += prevCap;
      prevCap = 0;

      verts.push(x1, y1);
      joints.push(endJoint);

      prevX = x1;
      prevY = y1;
    }

    if (closeStroke) {
      verts.push(points[0], points[1]);
      joints.push(JOINT_TYPE.NONE);
      verts.push(points[2], points[3]);
      joints.push(JOINT_TYPE.NONE);
    } else {
      verts.push(points[len - 4], points[len - 3]);
      joints.push(JOINT_TYPE.NONE);
    }
  }

  fill(graphicsData, buildData) {
    let points = graphicsData.points;
    //TODO: simplify holes too!
    const holes = graphicsData.holes;
    const eps = buildData.closePointEps;

    const { verts, joints } = buildData;

    if (points.length < 6) {
      return;
    }
    const holeArray = [];
    let len = points.length;
    // Process holes..

    for (let i = 0; i < holes.length; i++) {
      const hole = holes[i];

      holeArray.push(points.length / 2);
      points = points.concat(hole.points);
    }

    //TODO: reduce size later?
    const pn = tempArr;
    if (pn.length < points.length) {
      pn.length = points.length;
    }
    let start = 0;
    for (let i = 0; i <= holeArray.length; i++) {
      let finish = len / 2;
      if (i > 0) {
        if (i < holeArray.length) {
          finish = holeArray[i];
        } else {
          finish = points.length >> 1;
        }
      }
      pn[start * 2] = finish - 1;
      pn[(finish - 1) * 2 + 1] = 0;
      for (let j = start; j + 1 < finish; j++) {
        pn[j * 2 + 1] = j + 1;
        pn[j * 2 + 2] = j;
      }
    }

    // sort color
    graphicsData.triangles = earcut(points, holeArray, 2);

    if (!graphicsData.triangles) {
      return;
    }

    if (!graphicsData.fillAA) {
      for (let i = 0; i < points.length; i += 2) {
        verts.push(points[i], points[i + 1]);
        joints.push(JOINT_TYPE.FILL);
      }
      return;
    }

    const { triangles } = graphicsData;
    len = points.length;

    for (let i = 0; i < triangles.length; i += 3) {
      //TODO: holes prev/next!!!
      let flag = 0;
      for (let j = 0; j < 3; j++) {
        const ind1 = triangles[i + j];
        const ind2 = triangles[i + ((j + 1) % 3)];
        if (pn[ind1 * 2] === ind2 || pn[ind1 * 2 + 1] === ind2) {
          flag |= 1 << j;
        }
      }
      joints.push(JOINT_TYPE.FILL_EXPAND + flag);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
      joints.push(JOINT_TYPE.NONE);
    }

    // bisect, re-using pn
    for (let ind = 0; ind < len / 2; ind++) {
      let prev = pn[ind * 2];
      let next = pn[ind * 2 + 1];
      let nx1 = points[next * 2 + 1] - points[ind * 2 + 1],
        ny1 = -(points[next * 2] - points[ind * 2]);
      let nx2 = points[ind * 2 + 1] - points[prev * 2 + 1],
        ny2 = -(points[ind * 2] - points[prev * 2]);
      let D1 = Math.sqrt(nx1 * nx1 + ny1 * ny1);
      nx1 /= D1;
      ny1 /= D1;
      let D2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);
      nx2 /= D2;
      ny2 /= D2;

      let bx = nx1 + nx2;
      let by = ny1 + ny2;
      let D = bx * nx1 + by * ny1;
      if (Math.abs(D) < eps) {
        bx = nx1;
        by = ny1;
      } else {
        bx /= D;
        by /= D;
      }
      pn[ind * 2] = bx;
      pn[ind * 2 + 1] = by;
    }

    for (let i = 0; i < triangles.length; i += 3) {
      const prev = triangles[i];
      const ind = triangles[i + 1];
      const next = triangles[i + 2];
      let nx1 = points[next * 2 + 1] - points[ind * 2 + 1],
        ny1 = -(points[next * 2] - points[ind * 2]);
      let nx2 = points[ind * 2 + 1] - points[prev * 2 + 1],
        ny2 = -(points[ind * 2] - points[prev * 2]);

      let j1 = 1;
      if (nx1 * ny2 - nx2 * ny1 > 0.0) {
        j1 = 2;
      }

      for (let j = 0; j < 3; j++) {
        let ind = triangles[i + ((j * j1) % 3)];
        verts.push(points[ind * 2], points[ind * 2 + 1]);
      }
      for (let j = 0; j < 3; j++) {
        let ind = triangles[i + ((j * j1) % 3)];
        verts.push(pn[ind * 2], pn[ind * 2 + 1]);
      }
    }
  }
}

const FILL_COMMANDS = {
  [SHAPES.POLY]: new PolyBuilder(),
  [SHAPES.CIRC]: new CircleBuilder(),
  [SHAPES.ELIP]: new CircleBuilder(),
  [SHAPES.RECT]: new RectangleBuilder(),
  [SHAPES.RREC]: new RoundedRectangleBuilder()
};

const { buildLine, BatchPart, BATCH_POOL, DRAW_CALL_POOL } = graphicsUtils;

/*
 * Complex shape type
 * @todo Move to Math shapes
 */

const tmpPoint = new Point();
const tmpBounds = new Bounds();

class SmoothBatchPart {
  constructor() {
    this.reset();
  }

  begin(style, startIndex, attribStart) {
    this.reset();
    this.style = style;
    this.start = startIndex;
    this.attribStart = attribStart;
  }

  end(endIndex, endAttrib) {
    this.attribSize = endAttrib - this.attribStart;
    this.size = endIndex - this.start;
  }

  reset() {
    this.style = null;
    this.size = 0;
    this.start = 0;
    this.attribStart = 0;
    this.attribSize = 0;
  }
}

class SmoothGraphicsGeometry extends Geometry {
  static __initStatic() {
    this.BATCHABLE_SIZE = 100;
  }

  __init() {
    this.indicesUint16 = null;
  }

  get points() {
    return this.buildData.verts;
  }

  get closePointEps() {
    return this.buildData.closePointEps;
  }

  initAttributes(_static) {
    this._buffer = new Buffer(null, _static, false);
    this._bufferFloats = new Float32Array();
    this._bufferUint = new Uint32Array();

    this._indexBuffer = new Buffer(null, _static, true);
    this.addAttribute("aPrev", this._buffer, 2, false, TYPES.FLOAT)
      .addAttribute("aPoint1", this._buffer, 2, false, TYPES.FLOAT)
      .addAttribute("aPoint2", this._buffer, 2, false, TYPES.FLOAT)
      .addAttribute("aNext", this._buffer, 2, false, TYPES.FLOAT)
      // number of vertex
      .addAttribute("aVertexJoint", this._buffer, 1, false, TYPES.FLOAT)
      // line width, alignment
      .addAttribute("aLineStyle", this._buffer, 2, false, TYPES.FLOAT)
      // the usual
      .addAttribute("aColor", this._buffer, 4, true, TYPES.UNSIGNED_BYTE)
      .addIndex(this._indexBuffer);

    this.strideFloats = 12;
  }

  constructor() {
    super();
    SmoothGraphicsGeometry.prototype.__init.call(this);
    this.initAttributes(false);

    this.buildData = new BuildData();

    this.graphicsData = [];

    this.dirty = 0;

    this.batchDirty = -1;

    this.cacheDirty = -1;

    this.clearDirty = 0;

    this.drawCalls = [];

    this.batches = [];

    this.shapeBuildIndex = 0;

    this.shapeBatchIndex = 0;

    this._bounds = new Bounds();

    this.boundsDirty = -1;

    this.boundsPadding = 0;

    this.batchable = false;

    this.indicesUint16 = null;

    this.packer = null;
    this.packSize = 0;
    this.pack32index = null;
  }

  checkInstancing(instanced, allow32Indices) {
    if (this.packer) {
      return;
    }
    this.packer = new SegmentPacker();
    this.pack32index = allow32Indices;
  }

  /**
   * Get the current bounds of the graphic geometry.
   *
   * @member {PIXI.Bounds}
   * @readonly
   */
  get bounds() {
    if (this.boundsDirty !== this.dirty) {
      this.boundsDirty = this.dirty;
      this.calculateBounds();
    }

    return this._bounds;
  }

  /**
   * Call if you changed graphicsData manually.
   * Empties all batch buffers.
   */
  invalidate() {
    this.boundsDirty = -1;
    this.dirty++;
    this.batchDirty++;
    this.shapeBuildIndex = 0;
    this.shapeBatchIndex = 0;
    this.packSize = 0;

    this.buildData.clear();

    for (let i = 0; i < this.drawCalls.length; i++) {
      this.drawCalls[i].texArray.clear();
      DRAW_CALL_POOL.push(this.drawCalls[i]);
    }

    this.drawCalls.length = 0;

    for (let i = 0; i < this.batches.length; i++) {
      const batchPart = this.batches[i];

      batchPart.reset();
      BATCH_POOL.push(batchPart);
    }

    this.batches.length = 0;
  }

  clear() {
    if (this.graphicsData.length > 0) {
      this.invalidate();
      this.clearDirty++;
      this.graphicsData.length = 0;
    }

    return this;
  }

  drawShape(shape, fillStyle = null, lineStyle = null, matrix = null) {
    const data = new SmoothGraphicsData(shape, fillStyle, lineStyle, matrix);

    this.graphicsData.push(data);
    this.dirty++;

    return this;
  }

  drawHole(shape, matrix = null) {
    if (!this.graphicsData.length) {
      return null;
    }

    const data = new SmoothGraphicsData(shape, null, null, matrix);

    const lastShape = this.graphicsData[this.graphicsData.length - 1];

    data.lineStyle = lastShape.lineStyle;

    lastShape.holes.push(data);

    this.dirty++;

    return this;
  }

  destroy() {
    super.destroy();

    // destroy each of the SmoothGraphicsData objects
    for (let i = 0; i < this.graphicsData.length; ++i) {
      this.graphicsData[i].destroy();
    }

    this.buildData.destroy();
    this.buildData = null;
    this.indexBuffer.destroy();
    this.indexBuffer = null;
    this.graphicsData.length = 0;
    this.graphicsData = null;
    this.drawCalls.length = 0;
    this.drawCalls = null;
    this.batches.length = 0;
    this.batches = null;
    this._bounds = null;
  }

  /**
   * Check to see if a point is contained within this geometry.
   *
   * @param {PIXI.IPointData} point - Point to check if it's contained.
   * @return {Boolean} `true` if the point is contained within geometry.
   */
  containsPoint(point) {
    const graphicsData = this.graphicsData;

    for (let i = 0; i < graphicsData.length; ++i) {
      const data = graphicsData[i];

      if (!data.fillStyle.visible) {
        continue;
      }

      // only deal with fills..
      if (data.shape) {
        if (data.matrix) {
          data.matrix.applyInverse(point, tmpPoint);
        } else {
          tmpPoint.copyFrom(point);
        }

        if (data.shape.contains(tmpPoint.x, tmpPoint.y)) {
          let hitHole = false;

          if (data.holes) {
            for (let i = 0; i < data.holes.length; i++) {
              const hole = data.holes[i];

              if (hole.shape.contains(tmpPoint.x, tmpPoint.y)) {
                hitHole = true;
                break;
              }
            }
          }

          if (!hitHole) {
            return true;
          }
        }
      }
    }

    return false;
  }

  updatePoints() {}

  updateBufferSize() {
    this._buffer.update(new Float32Array());
  }

  updateBuild() {
    const { graphicsData, buildData } = this;
    const len = graphicsData.length;

    for (let i = this.shapeBuildIndex; i < len; i++) {
      const data = graphicsData[i];

      data.strokeStart = 0;
      data.strokeLen = 0;
      data.fillStart = 0;
      data.fillLen = 0;
      const { fillStyle, lineStyle, holes } = data;
      if (!fillStyle.visible && !lineStyle.visible) {
        continue;
      }

      const command = FILL_COMMANDS[data.type];
      data.clearPath();

      command.path(data, buildData);
      if (data.matrix) {
        this.transformPoints(data.points, data.matrix);
      }

      data.clearBuild();
      if (fillStyle.visible) {
        if (holes.length) {
          this.processHoles(holes);
        }
        data.fillAA =
          data.fillStyle.smooth &&
          !(
            data.lineStyle.visible &&
            data.lineStyle.alpha >= 0.99 &&
            data.lineStyle.width >= 0.99
          );

        data.fillStart = buildData.joints.length;
        command.fill(data, buildData);
        data.fillLen = buildData.joints.length - data.fillStart;
      }
      if (lineStyle.visible) {
        data.strokeStart = buildData.joints.length;
        command.line(data, buildData);
        data.strokeLen = buildData.joints.length - data.strokeStart;
      }
    }
    this.shapeBuildIndex = len;
  }

  updateBatches() {
    if (!this.graphicsData.length) {
      this.batchable = true;

      return;
    }
    this.updateBuild();

    if (!this.validateBatching()) {
      return;
    }

    const { buildData, graphicsData, packer } = this;
    const len = graphicsData.length;

    this.cacheDirty = this.dirty;

    let batchPart = null;

    let currentStyle = null;

    if (this.batches.length > 0) {
      batchPart = this.batches[this.batches.length - 1];
      currentStyle = batchPart.style;
    }

    for (let i = this.shapeBatchIndex; i < len; i++) {
      const data = graphicsData[i];
      const fillStyle = data.fillStyle;
      const lineStyle = data.lineStyle;

      if (data.matrix) {
        this.transformPoints(data.points, data.matrix);
      }
      if (!fillStyle.visible && !lineStyle.visible) {
        continue;
      }
      for (let j = 0; j < 2; j++) {
        const style = j === 0 ? fillStyle : lineStyle;

        if (!style.visible) continue;

        const nextTexture = style.texture.baseTexture;
        const attribOld = buildData.vertexSize;
        const indexOld = buildData.indexSize;

        nextTexture.wrapMode = WRAP_MODES.REPEAT;

        if (j === 0) {
          this.packer.updateBufferSize(
            data.fillStart,
            data.fillLen,
            data.triangles.length,
            buildData
          );
        } else {
          this.packer.updateBufferSize(
            data.strokeStart,
            data.strokeLen,
            data.triangles.length,
            buildData
          );
        }

        const attribSize = buildData.vertexSize;

        if (attribSize === attribOld) continue;
        // close batch if style is different
        if (batchPart && !this._compareStyles(currentStyle, style)) {
          batchPart.end(indexOld, attribOld);
          batchPart = null;
        }
        // spawn new batch if its first batch or previous was closed
        if (!batchPart) {
          batchPart = BATCH_POOL.pop() || new BatchPart();
          batchPart.begin(style, indexOld, attribOld);
          this.batches.push(batchPart);
          currentStyle = style;
        }
      }
    }
    this.shapeBatchIndex = len;

    if (batchPart) {
      batchPart.end(buildData.indexSize, buildData.vertexSize);
    }

    if (this.batches.length === 0) {
      // there are no visible styles in SmoothGraphicsData
      // its possible that someone wants Graphics just for the bounds
      this.batchable = true;

      return;
    }

    // TODO make this a const..
    this.batchable = this.isBatchable();

    if (this.batchable) {
      this.packBatches();
    } else {
      this.updatePack();
      this.buildDrawCalls();
    }
  }

  updatePack() {
    const { vertexSize, indexSize } = this.buildData;

    if (this.packSize === vertexSize) {
      return;
    }

    const { strideFloats, packer, buildData } = this;
    const buffer = this._buffer;
    const index = this._indexBuffer;
    const floatsSize = vertexSize * strideFloats;

    if (buffer.data.length !== floatsSize) {
      const arrBuf = new ArrayBuffer(floatsSize * 4);
      this._bufferFloats = new Float32Array(arrBuf);
      this._bufferUint = new Uint32Array(arrBuf);
      buffer.data = this._bufferFloats;
    }
    if (index.data.length !== indexSize) {
      if (vertexSize > 0xffff && this.pack32index) {
        index.data = new Uint32Array(indexSize);
      } else {
        index.data = new Uint16Array(indexSize);
      }
    }

    packer.beginPack(
      buildData,
      this._bufferFloats,
      this._bufferUint,
      index.data
    );

    for (let i = 0; i < this.graphicsData.length; i++) {
      const data = this.graphicsData[i];

      if (data.fillLen) {
        const lineStyle = 0;
        const color = data.fillStyle.color;
        const rgb = (color >> 16) + (color & 0xff00) + ((color & 0xff) << 16);
        const rgba = premultiplyTint(rgb, data.fillStyle.alpha);

        packer.packInterleavedGeometry(
          data.fillStart,
          data.fillLen,
          data.triangles,
          lineStyle,
          rgba
        );
      }
      if (data.strokeLen) {
        const lineStyle = data.lineStyle.width;
        const color = data.lineStyle.color;
        const rgb = (color >> 16) + (color & 0xff00) + ((color & 0xff) << 16);
        const rgba = premultiplyTint(rgb, data.lineStyle.alpha);

        packer.packInterleavedGeometry(
          data.strokeStart,
          data.strokeLen,
          data.triangles,
          lineStyle,
          rgba
        );
      }
    }

    buffer.update();
    index.update();
    this.packSize = vertexSize;
  }

  /**
   * Affinity check
   *
   * @param {PIXI.FillStyle | PIXI.LineStyle} styleA
   * @param {PIXI.FillStyle | PIXI.LineStyle} styleB
   */
  _compareStyles(styleA, styleB) {
    if (!styleA || !styleB) {
      return false;
    }

    if (styleA.texture.baseTexture !== styleB.texture.baseTexture) {
      return false;
    }

    if (styleA.color + styleA.alpha !== styleB.color + styleB.alpha) {
      return false;
    }

    if (!!styleA.native !== !!styleB.native) {
      return false;
    }

    //TODO: propagate width for FillStyle
    if (!!styleA.width !== !!styleB.width) {
      return false;
    }

    return true;
  }

  /**
   * Test geometry for batching process.
   *
   * @protected
   */
  validateBatching() {
    if (this.dirty === this.cacheDirty || !this.graphicsData.length) {
      return false;
    }

    for (let i = 0, l = this.graphicsData.length; i < l; i++) {
      const data = this.graphicsData[i];
      const fill = data.fillStyle;
      const line = data.lineStyle;

      if (fill && !fill.texture.baseTexture.valid) return false;
      if (line && !line.texture.baseTexture.valid) return false;
    }

    return true;
  }

  /**
   * Offset the indices so that it works with the batcher.
   *
   * @protected
   */
  packBatches() {
    this.batchDirty++;
    const batches = this.batches;

    for (let i = 0, l = batches.length; i < l; i++) {
      const batch = batches[i];

      for (let j = 0; j < batch.size; j++) {
        const index = batch.start + j;

        this.indicesUint16[index] =
          this.indicesUint16[index] - batch.attribStart;
      }
    }
  }

  isBatchable() {
    return false;

    // prevent heavy mesh batching
    // if (this.points.length > 0xffff * 2) {
    //     return false;
    // }
    //
    // const batches = this.batches;
    //
    // for (let i = 0; i < batches.length; i++) {
    //     if ((batches[i].style as LineStyle).native) {
    //         return false;
    //     }
    // }
    //
    // return (this.points.length < SmoothGraphicsGeometry.BATCHABLE_SIZE * 2);
  }

  /**
   * Converts intermediate batches data to drawCalls.
   *
   * @protected
   */
  buildDrawCalls() {
    let TICK = ++BaseTexture._globalBatch;

    for (let i = 0; i < this.drawCalls.length; i++) {
      this.drawCalls[i].texArray.clear();
      DRAW_CALL_POOL.push(this.drawCalls[i]);
    }

    this.drawCalls.length = 0;

    let currentGroup = DRAW_CALL_POOL.pop();

    if (!currentGroup) {
      currentGroup = new BatchDrawCall();
      currentGroup.texArray = new BatchTextureArray();
    }
    currentGroup.texArray.count = 0;
    currentGroup.start = 0;
    currentGroup.size = 0;
    currentGroup.type = DRAW_MODES.TRIANGLES;

    let textureCount = 0;
    let currentTexture = null;
    let native = false;
    let drawMode = DRAW_MODES.TRIANGLES;

    let index = 0;

    this.drawCalls.push(currentGroup);

    // TODO - this can be simplified
    for (let i = 0; i < this.batches.length; i++) {
      const data = this.batches[i];

      // TODO add some full on MAX_TEXTURE CODE..
      const MAX_TEXTURES = 8;

      // Forced cast for checking `native` without errors
      const style = data.style;

      const nextTexture = style.texture.baseTexture;

      if (native !== !!style.native) {
        native = !!style.native;
        drawMode = native ? DRAW_MODES.LINES : DRAW_MODES.TRIANGLES;

        // force the batch to break!
        currentTexture = null;
        textureCount = MAX_TEXTURES;
        TICK++;
      }

      if (currentTexture !== nextTexture) {
        currentTexture = nextTexture;

        if (nextTexture._batchEnabled !== TICK) {
          if (textureCount === MAX_TEXTURES) {
            TICK++;

            textureCount = 0;

            if (currentGroup.size > 0) {
              currentGroup = DRAW_CALL_POOL.pop();
              if (!currentGroup) {
                currentGroup = new BatchDrawCall();
                currentGroup.texArray = new BatchTextureArray();
              }
              this.drawCalls.push(currentGroup);
            }

            currentGroup.start = index;
            currentGroup.size = 0;
            currentGroup.texArray.count = 0;
            currentGroup.type = drawMode;
          }

          // TODO add this to the render part..
          // Hack! Because texture has protected `touched`
          nextTexture.touched = 1; // touch;

          nextTexture._batchEnabled = TICK;
          nextTexture._batchLocation = textureCount;
          nextTexture.wrapMode = 10497;

          currentGroup.texArray.elements[
            currentGroup.texArray.count++
          ] = nextTexture;
          textureCount++;
        }
      }

      currentGroup.size += data.size;
      index += data.size;

      nextTexture._batchLocation;

      // this.addColors(colors, style.color, style.alpha, data.attribSize);
      // this.addTextureIds(textureIds, textureId, data.attribSize);
    }

    BaseTexture._globalBatch = TICK;
  }

  processHoles(holes) {
    for (let i = 0; i < holes.length; i++) {
      const hole = holes[i];
      const command = FILL_COMMANDS[hole.type];

      command.path(hole, this.buildData);

      if (hole.matrix) {
        this.transformPoints(hole.points, hole.matrix);
      }
    }
  }

  /**
   * Update the local bounds of the object. Expensive to use performance-wise.
   *
   * @protected
   */
  calculateBounds() {
    const bounds = this._bounds;
    const sequenceBounds = tmpBounds;
    let curMatrix = Matrix.IDENTITY;

    this._bounds.clear();
    sequenceBounds.clear();

    for (let i = 0; i < this.graphicsData.length; i++) {
      const data = this.graphicsData[i];
      const shape = data.shape;
      const type = data.type;
      const lineStyle = data.lineStyle;
      const nextMatrix = data.matrix || Matrix.IDENTITY;
      let lineWidth = 0.0;

      if (lineStyle && lineStyle.visible) {
        const alignment = lineStyle.alignment;

        lineWidth = lineStyle.width;

        if (type === SHAPES.POLY) {
          lineWidth = lineWidth * (0.5 + Math.abs(0.5 - alignment));
        } else {
          lineWidth = lineWidth * Math.max(0, alignment);
        }
      }

      if (curMatrix !== nextMatrix) {
        if (!sequenceBounds.isEmpty()) {
          bounds.addBoundsMatrix(sequenceBounds, curMatrix);
          sequenceBounds.clear();
        }
        curMatrix = nextMatrix;
      }

      if (type === SHAPES.RECT || type === SHAPES.RREC) {
        const rect = shape;

        sequenceBounds.addFramePad(
          rect.x,
          rect.y,
          rect.x + rect.width,
          rect.y + rect.height,
          lineWidth,
          lineWidth
        );
      } else if (type === SHAPES.CIRC) {
        const circle = shape;

        sequenceBounds.addFramePad(
          circle.x,
          circle.y,
          circle.x,
          circle.y,
          circle.radius + lineWidth,
          circle.radius + lineWidth
        );
      } else if (type === SHAPES.ELIP) {
        const ellipse = shape;

        sequenceBounds.addFramePad(
          ellipse.x,
          ellipse.y,
          ellipse.x,
          ellipse.y,
          ellipse.width + lineWidth,
          ellipse.height + lineWidth
        );
      } else {
        const poly = shape;
        // adding directly to the bounds

        bounds.addVerticesMatrix(
          curMatrix,
          poly.points,
          0,
          poly.points.length,
          lineWidth,
          lineWidth
        );
      }
    }

    if (!sequenceBounds.isEmpty()) {
      bounds.addBoundsMatrix(sequenceBounds, curMatrix);
    }

    bounds.pad(this.boundsPadding, this.boundsPadding);
  }

  /**
   * Transform points using matrix.
   *
   * @protected
   * @param {number[]} points - Points to transform
   * @param {PIXI.Matrix} matrix - Transform matrix
   */
  transformPoints(points, matrix) {
    for (let i = 0; i < points.length / 2; i++) {
      const x = points[i * 2];
      const y = points[i * 2 + 1];

      points[i * 2] = matrix.a * x + matrix.c * y + matrix.tx;
      points[i * 2 + 1] = matrix.b * x + matrix.d * y + matrix.ty;
    }
  }

  /**
   * Add colors.
   *
   * @protected
   * @param {number[]} colors - List of colors to add to
   * @param {number} color - Color to add
   * @param {number} alpha - Alpha to use
   * @param {number} size - Number of colors to add
   */
  addColors(colors, color, alpha, size) {
    // TODO use the premultiply bits Ivan added
    const rgb = (color >> 16) + (color & 0xff00) + ((color & 0xff) << 16);

    const rgba = premultiplyTint(rgb, alpha);

    while (size-- > 0) {
      colors.push(rgba);
    }
  }

  /**
   * Add texture id that the shader/fragment wants to use.
   *
   * @protected
   * @param {number[]} textureIds
   * @param {number} id
   * @param {number} size
   */
  addTextureIds(textureIds, id, size) {
    while (size-- > 0) {
      textureIds.push(id);
    }
  }

  /**
   * Generates the UVs for a shape.
   *
   * @protected
   * @param {number[]} verts - Vertices
   * @param {number[]} uvs - UVs
   * @param {PIXI.Texture} texture - Reference to Texture
   * @param {number} start - Index buffer start index.
   * @param {number} size - The size/length for index buffer.
   * @param {PIXI.Matrix} [matrix] - Optional transform for all points.
   */
  addUvs(verts, uvs, texture, start, size, matrix = null) {
    let index = 0;
    const uvsStart = uvs.length;
    const frame = texture.frame;

    while (index < size) {
      let x = verts[(start + index) * 2];
      let y = verts[(start + index) * 2 + 1];

      if (matrix) {
        const nx = matrix.a * x + matrix.c * y + matrix.tx;

        y = matrix.b * x + matrix.d * y + matrix.ty;
        x = nx;
      }

      index++;

      uvs.push(x / frame.width, y / frame.height);
    }

    const baseTexture = texture.baseTexture;

    if (frame.width < baseTexture.width || frame.height < baseTexture.height) {
      this.adjustUvs(uvs, texture, uvsStart, size);
    }
  }

  /**
   * Modify uvs array according to position of texture region
   * Does not work with rotated or trimmed textures
   *
   * @param {number[]} uvs - array
   * @param {PIXI.Texture} texture - region
   * @param {number} start - starting index for uvs
   * @param {number} size - how many points to adjust
   */
  adjustUvs(uvs, texture, start, size) {
    const baseTexture = texture.baseTexture;
    const eps = 1e-6;
    const finish = start + size * 2;
    const frame = texture.frame;
    const scaleX = frame.width / baseTexture.width;
    const scaleY = frame.height / baseTexture.height;
    let offsetX = frame.x / frame.width;
    let offsetY = frame.y / frame.height;
    let minX = Math.floor(uvs[start] + eps);
    let minY = Math.floor(uvs[start + 1] + eps);

    for (let i = start + 2; i < finish; i += 2) {
      minX = Math.min(minX, Math.floor(uvs[i] + eps));
      minY = Math.min(minY, Math.floor(uvs[i + 1] + eps));
    }
    offsetX -= minX;
    offsetY -= minY;
    for (let i = start; i < finish; i += 2) {
      uvs[i] = (uvs[i] + offsetX) * scaleX;
      uvs[i + 1] = (uvs[i + 1] + offsetY) * scaleY;
    }
  }
}
SmoothGraphicsGeometry.__initStatic();

const { BezierUtils, QuadraticUtils, ArcUtils } = graphicsUtils;

const temp = new Float32Array(3);
// a default shaders map used by graphics..
const DEFAULT_SHADERS = {};

FillStyle.prototype.clone = function () {
  const obj = new FillStyle();

  obj.color = this.color;
  obj.alpha = this.alpha;
  obj.texture = this.texture;
  obj.matrix = this.matrix;
  obj.visible = this.visible;
  obj.smooth = this.smooth;

  return obj;
};

class SmoothGraphics extends Container {
  /**
   * Temporary point to use for containsPoint
   *
   * @static
   * @private
   * @member {PIXI.Point}
   */

  static __initStatic() {
    this._TEMP_POINT = new Point();
  }

  get geometry() {
    return this._geometry;
  }

  constructor(geometry = null) {
    super();

    this._geometry = geometry || new SmoothGraphicsGeometry();
    this._geometry.refCount++;

    this.shader = null;

    this.state = State.for2d();

    this._fillStyle = new FillStyle();

    this._lineStyle = new LineStyle();

    this._matrix = null;

    this._holeMode = false;

    this.currentPath = null;

    this.batches = [];

    this.batchTint = -1;

    this.batchDirty = -1;

    this.vertexData = null;

    this.pluginName = "smooth";

    this._transformID = -1;

    // Set default
    this.tint = 0xffffff;
    this.blendMode = BLEND_MODES.NORMAL;
  }

  clone() {
    this.finishPoly();

    return new SmoothGraphics(this._geometry);
  }

  set blendMode(value) {
    this.state.blendMode = value;
  }

  get blendMode() {
    return this.state.blendMode;
  }

  get tint() {
    return this._tint;
  }

  set tint(value) {
    this._tint = value;
  }

  get fill() {
    return this._fillStyle;
  }

  get line() {
    return this._lineStyle;
  }

  lineStyle(
    options = null,
    color = 0x0,
    alpha = 1,
    alignment = 0.5,
    native = false
  ) {
    // Support non-object params: (width, color, alpha, alignment, native)
    if (typeof options === "number") {
      options = { width: options, color, alpha, alignment, native };
    }

    return this.lineTextureStyle(options);
  }

  lineTextureStyle(options) {
    // Apply defaults
    options = Object.assign(
      {
        width: 0,
        texture: Texture.WHITE,
        color: options && options.texture ? 0xffffff : 0x0,
        alpha: 1,
        matrix: null,
        alignment: 0.5,
        native: false,
        cap: LINE_CAP.BUTT,
        join: LINE_JOIN.MITER,
        miterLimit: 10
      },
      options
    );

    if (this.currentPath) {
      this.startPoly();
    }

    const visible = options.width > 0 && options.alpha > 0;

    if (!visible) {
      this._lineStyle.reset();
    } else {
      if (options.matrix) {
        options.matrix = options.matrix.clone();
        options.matrix.invert();
      }

      Object.assign(this._lineStyle, { visible }, options);
    }

    return this;
  }

  startPoly() {
    if (this.currentPath) {
      const points = this.currentPath.points;
      const len = this.currentPath.points.length;

      if (len > 2) {
        this.drawShape(this.currentPath);
        this.currentPath = new Polygon();
        this.currentPath.closeStroke = false;
        this.currentPath.points.push(points[len - 2], points[len - 1]);
      }
    } else {
      this.currentPath = new Polygon();
      this.currentPath.closeStroke = false;
    }
  }

  finishPoly() {
    if (this.currentPath) {
      if (this.currentPath.points.length > 2) {
        this.drawShape(this.currentPath);
        this.currentPath = null;
      } else {
        this.currentPath.points.length = 0;
      }
    }
  }

  moveTo(x, y) {
    this.startPoly();
    this.currentPath.points[0] = x;
    this.currentPath.points[1] = y;

    return this;
  }

  lineTo(x, y) {
    if (!this.currentPath) {
      this.moveTo(0, 0);
    }

    // remove duplicates..
    const points = this.currentPath.points;
    const fromX = points[points.length - 2];
    const fromY = points[points.length - 1];

    if (fromX !== x || fromY !== y) {
      points.push(x, y);
    }

    return this;
  }

  _initCurve(x = 0, y = 0) {
    if (this.currentPath) {
      if (this.currentPath.points.length === 0) {
        this.currentPath.points = [x, y];
      }
    } else {
      this.moveTo(x, y);
    }
  }

  quadraticCurveTo(cpX, cpY, toX, toY) {
    this._initCurve();

    const points = this.currentPath.points;

    if (points.length === 0) {
      this.moveTo(0, 0);
    }

    QuadraticUtils.curveTo(cpX, cpY, toX, toY, points);

    return this;
  }

  bezierCurveTo(cpX, cpY, cpX2, cpY2, toX, toY) {
    this._initCurve();

    BezierUtils.curveTo(
      cpX,
      cpY,
      cpX2,
      cpY2,
      toX,
      toY,
      this.currentPath.points
    );

    return this;
  }

  arcTo(x1, y1, x2, y2, radius) {
    this._initCurve(x1, y1);

    const points = this.currentPath.points;

    const result = ArcUtils.curveTo(x1, y1, x2, y2, radius, points);

    if (result) {
      const { cx, cy, radius, startAngle, endAngle, anticlockwise } = result;

      this.arc(cx, cy, radius, startAngle, endAngle, anticlockwise);
    }

    return this;
  }

  arc(cx, cy, radius, startAngle, endAngle, anticlockwise = false) {
    if (startAngle === endAngle) {
      return this;
    }

    if (!anticlockwise && endAngle <= startAngle) {
      endAngle += PI_2;
    } else if (anticlockwise && startAngle <= endAngle) {
      startAngle += PI_2;
    }

    const sweep = endAngle - startAngle;

    if (sweep === 0) {
      return this;
    }

    const startX = cx + Math.cos(startAngle) * radius;
    const startY = cy + Math.sin(startAngle) * radius;
    const eps = this._geometry.closePointEps;

    // If the currentPath exists, take its points. Otherwise call `moveTo` to start a path.
    let points = this.currentPath ? this.currentPath.points : null;

    if (points) {
      // TODO: make a better fix.

      // We check how far our start is from the last existing point
      const xDiff = Math.abs(points[points.length - 2] - startX);
      const yDiff = Math.abs(points[points.length - 1] - startY);

      if (xDiff < eps && yDiff < eps);
      else {
        points.push(startX, startY);
      }
    } else {
      this.moveTo(startX, startY);
      points = this.currentPath.points;
    }

    ArcUtils.arc(
      startX,
      startY,
      cx,
      cy,
      radius,
      startAngle,
      endAngle,
      anticlockwise,
      points
    );

    return this;
  }

  beginFill(color = 0, alpha = 1, smooth = false) {
    return this.beginTextureFill({
      texture: Texture.WHITE,
      color,
      alpha,
      smooth
    });
  }

  beginTextureFill(options) {
    // Apply defaults
    options = Object.assign(
      {
        texture: Texture.WHITE,
        color: 0xffffff,
        alpha: 1,
        matrix: null,
        smooth: false
      },
      options
    );

    if (this.currentPath) {
      this.startPoly();
    }

    const visible = options.alpha > 0;

    if (!visible) {
      this._fillStyle.reset();
    } else {
      if (options.matrix) {
        options.matrix = options.matrix.clone();
        options.matrix.invert();
      }

      Object.assign(this._fillStyle, { visible }, options);
    }

    return this;
  }

  endFill() {
    this.finishPoly();

    this._fillStyle.reset();

    return this;
  }

  drawRect(x, y, width, height) {
    return this.drawShape(new Rectangle(x, y, width, height));
  }

  drawRoundedRect(x, y, width, height, radius) {
    return this.drawShape(new RoundedRectangle(x, y, width, height, radius));
  }

  drawCircle(x, y, radius) {
    return this.drawShape(new Circle(x, y, radius));
  }

  drawEllipse(x, y, width, height) {
    return this.drawShape(new Ellipse(x, y, width, height));
  }

  drawPolygon(...path) {
    let points;
    let closeStroke = true; // !!this._fillStyle;

    const poly = path[0];

    // check if data has points..
    if (poly.points) {
      closeStroke = poly.closeStroke;
      points = poly.points;
    } else if (Array.isArray(path[0])) {
      points = path[0];
    } else {
      points = path;
    }

    const shape = new Polygon(points);

    shape.closeStroke = closeStroke;

    this.drawShape(shape);

    return this;
  }

  drawShape(shape) {
    if (!this._holeMode) {
      this._geometry.drawShape(
        shape,
        this._fillStyle.clone(),
        this._lineStyle.clone(),
        this._matrix
      );
    } else {
      this._geometry.drawHole(shape, this._matrix);
    }

    return this;
  }

  clear() {
    this._geometry.clear();
    this._lineStyle.reset();
    this._fillStyle.reset();

    this._boundsID++;
    this._matrix = null;
    this._holeMode = false;
    this.currentPath = null;

    return this;
  }

  isFastRect() {
    const data = this._geometry.graphicsData;

    return (
      data.length === 1 &&
      data[0].shape.type === SHAPES.RECT &&
      !(data[0].lineStyle.visible && data[0].lineStyle.width)
    );
  }

  _renderCanvas(renderer) {
    Graphics.prototype._renderCanvas.call(this, renderer);
  }

  _render(renderer) {
    this.finishPoly();

    const geometry = this._geometry;
    const hasuint32 = renderer.context.supports.uint32Indices;
    // batch part..
    // batch it!

    geometry.checkInstancing(renderer.geometry.hasInstance, hasuint32);

    geometry.updateBatches();

    if (geometry.batchable) {
      if (this.batchDirty !== geometry.batchDirty) {
        this._populateBatches();
      }

      this._renderBatched(renderer);
    } else {
      // no batching...
      renderer.batch.flush();

      this._renderDirect(renderer);
    }
  }

  _populateBatches() {
    const geometry = this._geometry;
    const blendMode = this.blendMode;
    const len = geometry.batches.length;

    this.batchTint = -1;
    this._transformID = -1;
    this.batchDirty = geometry.batchDirty;
    this.batches.length = len;

    this.vertexData = new Float32Array(geometry.points);

    for (let i = 0; i < len; i++) {
      const gI = geometry.batches[i];
      const color = gI.style.color;
      const vertexData = new Float32Array(
        this.vertexData.buffer,
        gI.attribStart * 4 * 2,
        gI.attribSize * 2
      );

      // const uvs = new Float32Array(geometry.uvsFloat32.buffer,
      //     gI.attribStart * 4 * 2,
      //     gI.attribSize * 2);

      // const indices = new Uint16Array(geometry.indicesUint16.buffer,
      //     gI.start * 2,
      //     gI.size);

      const batch = {
        vertexData,
        blendMode,
        // indices,
        // uvs,
        _batchRGB: hex2rgb(color),
        _tintRGB: color,
        _texture: gI.style.texture,
        alpha: gI.style.alpha,
        worldAlpha: 1
      };

      this.batches[i] = batch;
    }
  }

  _renderBatched(renderer) {
    if (!this.batches.length) {
      return;
    }

    renderer.batch.setObjectRenderer(renderer.plugins[this.pluginName]);

    this.calculateVertices();
    this.calculateTints();

    for (let i = 0, l = this.batches.length; i < l; i++) {
      const batch = this.batches[i];

      batch.worldAlpha = this.worldAlpha * batch.alpha;

      renderer.plugins[this.pluginName].render(batch);
    }
  }

  _renderDirect(renderer) {
    const shader = this._resolveDirectShader(renderer);

    const geometry = this._geometry;
    const tint = this.tint;
    const worldAlpha = this.worldAlpha;
    const uniforms = shader.uniforms;
    const drawCalls = geometry.drawCalls;

    // lets set the transfomr
    uniforms.translationMatrix = this.transform.worldTransform;

    // and then lets set the tint..
    uniforms.tint[0] = (((tint >> 16) & 0xff) / 255) * worldAlpha;
    uniforms.tint[1] = (((tint >> 8) & 0xff) / 255) * worldAlpha;
    uniforms.tint[2] = ((tint & 0xff) / 255) * worldAlpha;
    uniforms.tint[3] = worldAlpha;

    uniforms.resolution = renderer.renderTexture.current
      ? renderer.renderTexture.current.resolution
      : renderer.resolution;

    const projTrans = renderer.projection.transform;

    if (projTrans) {
      // only uniform scale is supported!
      const scale = Math.sqrt(
        projTrans.a * projTrans.a + projTrans.b * projTrans.b
      );
      uniforms.resolution *= scale;
    }

    uniforms.expand =
      (renderer.options.antialias ? 2 : 1) / uniforms.resolution;

    // the first draw call, we can set the uniforms of the shader directly here.

    // this means that we can tack advantage of the sync function of pixi!
    // bind and sync uniforms..
    // there is a way to optimise this..
    renderer.shader.bind(shader);
    renderer.geometry.bind(geometry, shader);

    // set state..
    renderer.state.set(this.state);

    // then render the rest of them...
    for (let i = 0, l = drawCalls.length; i < l; i++) {
      this._renderDrawCallDirect(renderer, geometry.drawCalls[i]);
    }
  }

  _renderDrawCallDirect(renderer, drawCall) {
    const { texArray, type, size, start } = drawCall;
    const groupTextureCount = texArray.count;

    for (let j = 0; j < groupTextureCount; j++) {
      renderer.texture.bind(texArray.elements[j], j);
    }

    renderer.geometry.draw(type, size, start);
  }

  _resolveDirectShader(renderer) {
    let shader = this.shader;

    const pluginName = this.pluginName;

    if (!shader) {
      // if there is no shader here, we can use the default shader.
      // and that only gets created if we actually need it..
      // but may be more than one plugins for graphics
      if (!DEFAULT_SHADERS[pluginName]) {
        // const MAX_TEXTURES = renderer.plugins.batch.MAX_TEXTURES;
        // const sampleValues = new Int32Array(MAX_TEXTURES);
        //
        // for (let i = 0; i < MAX_TEXTURES; i++)
        // {
        //     sampleValues[i] = i;
        // }

        const uniforms = {
          tint: new Float32Array([1, 1, 1, 1]),
          translationMatrix: new Matrix(),
          resolution: 1,
          expand: 1
          //default: UniformGroup.from({ uSamplers: sampleValues }, true),
        };

        const program = renderer.plugins[pluginName]._shader.program;

        DEFAULT_SHADERS[pluginName] = new Shader(program, uniforms);
      }

      shader = DEFAULT_SHADERS[pluginName];
    }

    return shader;
  }

  _calculateBounds() {
    this.finishPoly();

    const geometry = this._geometry;

    // skipping when graphics is empty, like a container
    if (!geometry.graphicsData.length) {
      return;
    }

    const { minX, minY, maxX, maxY } = geometry.bounds;

    this._bounds.addFrame(this.transform, minX, minY, maxX, maxY);
  }

  containsPoint(point) {
    this.worldTransform.applyInverse(point, SmoothGraphics._TEMP_POINT);

    return this._geometry.containsPoint(SmoothGraphics._TEMP_POINT);
  }

  calculateTints() {
    if (this.batchTint !== this.tint) {
      this.batchTint = this.tint;

      const tintRGB = hex2rgb(this.tint, temp);

      for (let i = 0; i < this.batches.length; i++) {
        const batch = this.batches[i];

        const batchTint = batch._batchRGB;

        const r = tintRGB[0] * batchTint[0] * 255;
        const g = tintRGB[1] * batchTint[1] * 255;
        const b = tintRGB[2] * batchTint[2] * 255;

        // TODO Ivan, can this be done in one go?
        const color = (r << 16) + (g << 8) + (b | 0);

        batch._tintRGB =
          (color >> 16) + (color & 0xff00) + ((color & 0xff) << 16);
      }
    }
  }

  calculateVertices() {
    const wtID = this.transform._worldID;

    if (this._transformID === wtID) {
      return;
    }

    this._transformID = wtID;

    const wt = this.transform.worldTransform;
    const a = wt.a;
    const b = wt.b;
    const c = wt.c;
    const d = wt.d;
    const tx = wt.tx;
    const ty = wt.ty;

    const data = this._geometry.points; // batch.vertexDataOriginal;
    const vertexData = this.vertexData;

    let count = 0;

    for (let i = 0; i < data.length; i += 2) {
      const x = data[i];
      const y = data[i + 1];

      vertexData[count++] = a * x + c * y + tx;
      vertexData[count++] = d * y + b * x + ty;
    }
  }

  closePath() {
    const currentPath = this.currentPath;

    if (currentPath) {
      // we don't need to add extra point in the end because buildLine will take care of that
      currentPath.closeStroke = true;
    }

    return this;
  }

  setMatrix(matrix) {
    this._matrix = matrix;

    return this;
  }

  beginHole() {
    this.finishPoly();
    this._holeMode = true;

    return this;
  }

  endHole() {
    this.finishPoly();
    this._holeMode = false;

    return this;
  }

  destroy(options) {
    this._geometry.refCount--;
    if (this._geometry.refCount === 0) {
      this._geometry.dispose();
    }

    this._matrix = null;
    this.currentPath = null;
    this._lineStyle.destroy();
    this._lineStyle = null;
    this._fillStyle.destroy();
    this._fillStyle = null;
    this._geometry = null;
    this.shader = null;
    this.vertexData = null;
    this.batches.length = 0;
    this.batches = null;

    super.destroy(options);
  }

  drawStar(x, y, points, radius, innerRadius, rotation = 0) {
    return this.drawPolygon(
      new Star(x, y, points, radius, innerRadius, rotation)
    );
  }
}
SmoothGraphics.__initStatic();

class Star extends Polygon {
  constructor(x, y, points, radius, innerRadius, rotation = 0) {
    innerRadius = innerRadius || radius / 2;

    const startAngle = (-1 * Math.PI) / 2 + rotation;
    const len = points * 2;
    const delta = PI_2 / len;
    const polygon = [];

    for (let i = 0; i < len; i++) {
      const r = i % 2 ? innerRadius : radius;
      const angle = i * delta + startAngle;

      polygon.push(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }

    super(polygon);
  }
}

const vert = `
const float FILL = 1.0;
const float BEVEL = 4.0;
const float MITER = 8.0;
const float ROUND = 12.0;
const float JOINT_CAP_BUTT = 16.0;
const float JOINT_CAP_SQUARE = 18.0;
const float JOINT_CAP_ROUND = 20.0;

const float FILL_EXPAND = 24.0;

const float CAP_BUTT = 1.0;
const float CAP_SQUARE = 2.0;
const float CAP_ROUND = 3.0;
const float CAP_BUTT2 = 4.0;

const float MITER_LIMIT = 10.0;

precision highp float;
attribute vec2 aPrev;
attribute vec2 aPoint1;
attribute vec2 aPoint2;
attribute vec2 aNext;
attribute vec2 aLineStyle;
attribute float aVertexJoint;
attribute vec4 aColor;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec4 vSignedCoord;
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;

uniform float resolution;
uniform float expand;

vec2 doBisect(vec2 norm, float len, vec2 norm2, float len2,
    float dy, float inner) {
    vec2 bisect = (norm + norm2) / 2.0;
    bisect /= dot(norm, bisect);
    vec2 shift = dy * bisect;
    if (inner > 0.5) {
        if (len < len2) {
            if (abs(dy * (bisect.x * norm.y - bisect.y * norm.x)) > len) {
                return dy * norm;
            }
        } else {
            if (abs(dy * (bisect.x * norm2.y - bisect.y * norm2.x)) > len2) {
                return dy * norm;
            }
        }
    }
    return dy * bisect;
}

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    float len = length(xBasis);
    vec2 norm = vec2(xBasis.y, -xBasis.x) / len;

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;
    float dx = 0.0, dy = 1.0;

    float capType = floor(type / 32.0);
    type -= capType * 32.0;

    float lineWidth = aLineStyle.x * 0.5;
    vec2 pos;

    if (capType == CAP_ROUND) {
        vertexNum += 4.0;
        type = JOINT_CAP_ROUND;
        capType = 0.0;
    }

    if (type == FILL) {
        pos = pointA;
        vDistance = vec4(0.0, -0.5, -0.5, 1.0);
        vType = 0.0;
    } else if (type >= FILL_EXPAND && type < FILL_EXPAND + 7.5) {
        // expand vertices
        float flags = type - FILL_EXPAND;
        float flag3 = floor(flags / 4.0);
        float flag2 = floor((flags - flag3 * 4.0) / 2.0);
        float flag1 = flags - flag3 * 4.0 - flag2 * 2.0;

        vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;

        if (vertexNum < 0.5) {
            pos = prev;
        } else if (vertexNum < 1.5) {
            pos = pointA;
        } else {
            pos = pointB;
        }
        float len2 = length(aNext);
        vec2 bisect = (translationMatrix * vec3(aNext, 0.0)).xy;
        if (len2 > 0.01) {
            bisect = normalize(bisect) * len2;
        }

        vec2 n1 = normalize(vec2(pointA.y - prev.y, -(pointA.x - prev.x)));
        vec2 n2 = normalize(vec2(pointB.y - pointA.y, -(pointB.x - pointA.x)));
        vec2 n3 = normalize(vec2(prev.y - pointB.y, -(prev.x - pointB.x)));

        if (n1.x * n2.y - n1.y * n2.x < 0.0) {
            n1 = -n1;
            n2 = -n2;
            n3 = -n3;
        }

        vDistance.w = 1.0;
        pos += bisect * expand;

        vDistance = vec4(16.0, 16.0, 16.0, -1.0);
        if (flag1 > 0.5) {
            vDistance.x = -dot(pos - prev, n1);
        }
        if (flag2 > 0.5) {
            vDistance.y = -dot(pos - pointA, n2);
        }
        if (flag3 > 0.5) {
            vDistance.z = -dot(pos - pointB, n3);
        }
        vDistance.xyz *= resolution;
        vType = 1.0;
    } else if (type >= BEVEL) {
        float dy = lineWidth + expand;
        float inner = 0.0;
        if (vertexNum >= 1.5) {
            dy = -dy;
            inner = 1.0;
        }

        vec2 base, next, xBasis2, bisect;
        float flag = 0.0;
        float sign2 = 1.0;
        if (vertexNum < 0.5 || vertexNum > 2.5 && vertexNum < 3.5) {
            next = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            flag = type - floor(type / 2.0) * 2.0;
            sign2 = -1.0;
        } else {
            next = (translationMatrix * vec3(aNext, 1.0)).xy;
            base = pointB;
            if (type >= MITER && type < MITER + 3.5) {
                flag = step(MITER + 1.5, type);
                // check miter limit here?
            }
        }
        xBasis2 = next - base;
        float len2 = length(xBasis2);
        vec2 norm2 = vec2(xBasis2.y, -xBasis2.x) / len2;
        float D = norm.x * norm2.y - norm.y * norm2.x;
        if (D < 0.0) {
            inner = 1.0 - inner;
        }
        norm2 *= sign2;
        float collinear = step(0.0, dot(norm, norm2));

        vType = 0.0;
        float dy2 = -0.5;
        float dy3 = -0.5;

        if (abs(D) < 0.01 && collinear < 0.5) {
            if (type >= ROUND && type < ROUND + 1.5) {
                type = JOINT_CAP_ROUND;
            }
            //TODO: BUTT here too
        }

        if (vertexNum < 3.5) {
            if (abs(D) < 0.01) {
                pos = dy * norm;
            } else {
                if (flag < 0.5 && inner < 0.5) {
                    pos = dy * norm;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, inner);
                }
            }
            if (capType >= CAP_BUTT && capType < CAP_ROUND) {
                vec2 back = -vec2(-norm.y, norm.x);
                float extra = step(CAP_SQUARE, capType) * lineWidth;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    pos += back * (expand + extra);
                    dy2 = expand;
                } else {
                    dy2 = dot(pos + base - pointA, back) - extra;
                }
            }
            if (type >= JOINT_CAP_BUTT && type < JOINT_CAP_SQUARE + 0.5) {
                vec2 forward = vec2(-norm.y, norm.x);
                float extra = step(JOINT_CAP_SQUARE, type) * lineWidth;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    dy3 = dot(pos + base - pointB, forward) - extra;
                } else {
                    pos += forward * (expand + extra);
                    dy3 = expand;
                    if (capType >= CAP_BUTT) {
                        dy2 -= expand + extra;
                    }
                }
            }
        } else if (type >= JOINT_CAP_ROUND && type < JOINT_CAP_ROUND + 1.5) {
            if (inner > 0.5) {
                dy = -dy;
                inner = 0.0;
            }
            vec2 d2 = abs(dy) * vec2(-norm.y, norm.x);
            if (vertexNum < 4.5) {
                dy = -dy;
                pos = dy * norm;
            } else if (vertexNum < 5.5) {
                pos = dy * norm;
            } else if (vertexNum < 6.5) {
                pos = dy * norm + d2;
            } else {
                dy = -dy;
                pos = dy * norm + d2;
            }
            dy = -0.5;
            dy2 = pos.x;
            dy3 = pos.y;
            vType = 2.0;
        } else if (abs(D) < 0.01) {
            pos = dy * norm;
        } else {
            if (type >= ROUND && type < ROUND + 1.5) {
                if (inner > 0.5) {
                    dy = -dy;
                    inner = 0.0;
                }
                if (vertexNum < 4.5) {
                    pos = doBisect(norm, len, norm2, len2, -dy, 1.0);
                } else if (vertexNum < 5.5) {
                    pos = dy * norm;
                } else if (vertexNum > 7.5) {
                    pos = dy * norm2;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    float d2 = abs(dy);
                    if (length(pos) > abs(dy) * 1.5) {
                        if (vertexNum < 6.5) {
                            pos.x = dy * norm.x - d2 * norm.y;
                            pos.y = dy * norm.y + d2 * norm.x;
                        } else {
                            pos.x = dy * norm2.x + d2 * norm2.y;
                            pos.y = dy * norm2.y - d2 * norm2.x;
                        }
                    }
                }
                vec2 norm3 = normalize(norm - norm2);
                dy = pos.x * norm3.y - pos.y * norm3.x - 3.0;
                dy2 = pos.x;
                dy3 = pos.y;
                vType = 2.0;
            } else {
                if (type >= MITER && type < MITER + 3.5) {
                    if (inner > 0.5) {
                        dy = -dy;
                        inner = 0.0;
                    }
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    if (length(pos) > abs(dy) * MITER_LIMIT) {
                        type = BEVEL;
                    } else {
                        if (vertexNum < 4.5) {
                            dy = -dy;
                            pos = doBisect(norm, len, norm2, len2, dy, 1.0);
                            dy2 = -abs(dy);
                            dy3 = -abs(dy);
                        } else if (vertexNum < 5.5) {
                            pos = dy * norm;
                        } else if (vertexNum > 6.5) {
                            pos = dy * norm2;
                        }
                    }
                }
                if (type >= BEVEL && type < BEVEL + 1.5) {
                    if (inner < 0.5) {
                        dy = -dy;
                        inner = 1.0;
                    }
                    vec2 norm3 = normalize((norm + norm2) / 2.0);
                    if (vertexNum < 4.5) {
                        pos = doBisect(norm, len, norm2, len2, dy, 1.0);
                        dy2 = -abs(dot(pos + dy * norm, norm3));
                    } else {
                        dy2 = 0.0;
                        dy = -dy;
                        if (vertexNum < 5.5) {
                            pos = dy * norm;
                        } else {
                            pos = dy * norm2;
                        }
                    }
                }
            }
        }

        pos += base;
        vDistance = vec4(dy, dy2, dy3, lineWidth) * resolution;
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const frag = `
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;

//%forloop% %count%

void main(void){
    float alpha = 1.0;
    if (vType < 0.5) {
        float left = max(vDistance.x - 0.5, -vDistance.w);
        float right = min(vDistance.x + 0.5, vDistance.w);
        float near = vDistance.y - 0.5;
        float far = min(vDistance.y + 0.5, 0.0);
        float top = vDistance.z - 0.5;
        float bottom = min(vDistance.z + 0.5, 0.0);
        alpha = max(right - left, 0.0) * max(bottom - top, 0.0) * max(far - near, 0.0);
    } else if (vType < 1.5) {
        alpha *= max(min(vDistance.x + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.y + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.z + 0.5, 1.0), 0.0);
    } else {
        float dist2 = sqrt(dot(vDistance.yz, vDistance.yz));
        float rad = vDistance.w;
        float left = max(dist2 - 0.5, -rad);
        float right = min(dist2 + 0.5, rad);
        // TODO: something has to be done about artifact at vDistance.x far side
        alpha = 1.0 - step(vDistance.x, 0.0) * (1.0 - max(right - left, 0.0));
    }

    gl_FragColor = vColor * alpha;
}
`;

class SmoothShaderGenerator extends BatchShaderGenerator {
  generateShader(maxTextures) {
    if (!this.programCache[maxTextures]) {
      this.programCache[maxTextures] = new Program(
        this.vertexSrc,
        this.fragTemplate
      );
    }

    const uniforms = {
      tint: new Float32Array([1, 1, 1, 1]),
      translationMatrix: new Matrix(),
      resolution: 1,
      expand: 1
    };

    return new Shader(this.programCache[maxTextures], uniforms);
  }
}

class SmoothRendererFactory {
  static create(options) {
    const { vertex, fragment, vertexSize, geometryClass } = Object.assign(
      {
        vertex: vert,
        fragment: frag,
        geometryClass: BatchGeometry,
        vertexSize: 11
      },
      options
    );

    return class BatchPlugin extends AbstractBatchRenderer {
      constructor(renderer) {
        super(renderer);

        this.shaderGenerator = new SmoothShaderGenerator(vertex, fragment);
        this.geometryClass = geometryClass;
        this.vertexSize = vertexSize;
      }
    };
  }
}

const SmoothRenderer = SmoothRendererFactory.create();

Renderer.registerPlugin("smooth", SmoothRenderer);

export {
  Bars,
  BarsGeometry,
  BarsShader,
  BuildData,
  CircleBuilder,
  FILL_COMMANDS,
  JOINT_TYPE,
  Plot,
  PlotGeometry,
  PlotGradient,
  PlotGradientGeometry,
  PlotGradientShader,
  PlotShader,
  PolyBuilder,
  RectangleBuilder,
  RoundedRectangleBuilder,
  SegmentPacker,
  SmoothBatchPart,
  SmoothGraphics,
  SmoothGraphicsData,
  SmoothGraphicsGeometry,
  SmoothRenderer,
  SmoothRendererFactory,
  Star
};
//# sourceMappingURL=pixi-candles.es.js.map
